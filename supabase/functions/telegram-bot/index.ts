import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json; charset=utf-8',
};

// Authorized Telegram user IDs (comma-separated in env var)
// Fails closed: if env var is not set, no one is authorized
function getAuthorizedUserIds(): number[] {
  const envIds = Deno.env.get('TELEGRAM_AUTHORIZED_USER_IDS');
  if (!envIds || envIds.trim() === '') {
    console.error('TELEGRAM_AUTHORIZED_USER_IDS not configured - no users authorized');
    return [];
  }
  return envIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
}

// Stricter email validation with length limits
function isValidEmail(email: string): boolean {
  // Max 254 characters per RFC 5321
  if (email.length > 254) return false;
  
  // Stricter regex: alphanumeric, dots, underscores, hyphens in local part
  // No consecutive dots, must have valid domain
  const emailRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9._-]*[a-zA-Z0-9])?@[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: { id: number; first_name: string };
    chat: { id: number };
    text?: string;
  };
  callback_query?: {
    id: string;
    from: { id: number };
    message: { chat: { id: number }; message_id: number };
    data: string;
  };
}

interface UserState {
  action: string;
  data: Record<string, string>;
}

// Database-backed state management
async function getUserState(supabase: any, userId: number): Promise<UserState | null> {
  const { data } = await supabase
    .from('telegram_bot_states')
    .select('action, data')
    .eq('user_id', userId)
    .maybeSingle();
  
  return data ? { action: data.action, data: data.data || {} } : null;
}

async function setUserState(supabase: any, userId: number, state: UserState): Promise<void> {
  await supabase
    .from('telegram_bot_states')
    .upsert({
      user_id: userId,
      action: state.action,
      data: state.data,
      updated_at: new Date().toISOString()
    });
}

async function clearUserState(supabase: any, userId: number): Promise<void> {
  await supabase
    .from('telegram_bot_states')
    .delete()
    .eq('user_id', userId);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!TELEGRAM_BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const update: TelegramUpdate = await req.json();
    console.log('Received update:', JSON.stringify(update));

    const chatId = update.message?.chat.id || update.callback_query?.message?.chat.id;
    const userId = update.message?.from.id || update.callback_query?.from.id;
    const text = update.message?.text;
    const callbackData = update.callback_query?.data;
    const callbackId = update.callback_query?.id;

    if (!chatId || !userId) {
      return new Response('OK', { headers: corsHeaders });
    }

    // Authorization check
    const authorizedIds = getAuthorizedUserIds();
    if (!authorizedIds.includes(userId)) {
      await sendMessage(TELEGRAM_BOT_TOKEN, chatId, '⛔ Você não tem permissão para usar este bot.');
      return new Response('OK', { headers: corsHeaders });
    }

    // Answer callback query to remove loading state
    if (callbackId) {
      await answerCallback(TELEGRAM_BOT_TOKEN, callbackId);
    }

    // Handle callback buttons
    if (callbackData) {
      await handleCallback(TELEGRAM_BOT_TOKEN, supabase, chatId, userId, callbackData);
      return new Response('OK', { headers: corsHeaders });
    }

    // Handle text messages
    if (text) {
      await handleMessage(TELEGRAM_BOT_TOKEN, supabase, chatId, userId, text);
    }

    return new Response('OK', { headers: corsHeaders });

  } catch (error) {
    console.error('Error:', error);
    return new Response('OK', { headers: corsHeaders });
  }
});

async function handleMessage(token: string, supabase: any, chatId: number, userId: number, text: string) {
  const state = await getUserState(supabase, userId);

  // Check if user is in a multi-step operation
  if (state) {
    if (text === '/cancelar') {
      await clearUserState(supabase, userId);
      await sendMainMenu(token, chatId);
      return;
    }

    if (state.action === 'awaiting_email') {
      // Validate email format with stricter validation
      if (!isValidEmail(text)) {
        await sendMessage(token, chatId, '❌ Email inválido. Digite um email válido (máx. 254 caracteres):', {
          inline_keyboard: [[{ text: '❌ Cancelar', callback_data: 'cancel' }]]
        });
        return;
      }
      
      const newState = { action: 'awaiting_days', data: { ...state.data, email: text } };
      await setUserState(supabase, userId, newState);
      await sendMessage(token, chatId, '📅 Quantos dias de licença?\n\nEscolha abaixo ou digite um número:', {
        inline_keyboard: [
          [{ text: '🧪 Teste (10min)', callback_data: 'days_test' }],
          [{ text: '7 dias', callback_data: 'days_7' }, { text: '30 dias', callback_data: 'days_30' }],
          [{ text: '90 dias', callback_data: 'days_90' }, { text: '365 dias', callback_data: 'days_365' }],
          [{ text: '❌ Cancelar', callback_data: 'cancel' }]
        ]
      });
      return;
    }

    if (state.action === 'awaiting_days') {
      const days = parseInt(text);
      if (isNaN(days) || days <= 0) {
        await sendMessage(token, chatId, '❌ Digite um número válido de dias.');
        return;
      }
      await createLicense(token, supabase, chatId, state.data.email, days);
      await clearUserState(supabase, userId);
      return;
    }

    if (state.action === 'awaiting_license_key') {
      const licenseKey = text.toUpperCase();
      
      // Fetch license info
      const { data: license } = await supabase
        .from('licenses')
        .select('*')
        .eq('license_key', licenseKey)
        .maybeSingle();

      if (!license) {
        await clearUserState(supabase, userId);
        await sendMessage(token, chatId, '❌ Licença não encontrada.', {
          inline_keyboard: [[{ text: '🔙 Voltar ao Menu', callback_data: 'menu' }]]
        });
        return;
      }

      await clearUserState(supabase, userId);
      
      const expiresAt = new Date(license.expires_at);
      const daysRemaining = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      await sendMessage(token, chatId, 
        `📋 *Licença encontrada*\n\n` +
        `📧 Email: \`${license.email}\`\n` +
        `🔑 Chave: \`${license.license_key}\`\n` +
        `📊 Status: ${getStatusEmoji(license.status)} ${license.status}\n` +
        `📅 Expira: ${expiresAt.toLocaleDateString('pt-BR')} ${expiresAt.toLocaleTimeString('pt-BR')}\n` +
        `⏳ Dias restantes: ${daysRemaining > 0 ? daysRemaining : 0}\n\n` +
        `O que deseja fazer?`,
        {
          inline_keyboard: [
            [{ text: '➕ Adicionar dias', callback_data: `add_days_${license.id}` }],
            [{ text: '🔄 Resetar dispositivo', callback_data: `reset_device_${license.id}` }],
            [{ text: license.status === 'revoked' ? '✅ Reativar' : '🚫 Revogar', callback_data: `toggle_status_${license.id}` }],
            [{ text: '🔙 Voltar ao Menu', callback_data: 'menu' }]
          ]
        },
        'Markdown'
      );
      return;
    }

    if (state.action === 'awaiting_add_days') {
      const days = parseInt(text);
      if (isNaN(days) || days <= 0) {
        await sendMessage(token, chatId, '❌ Digite um número válido de dias.');
        return;
      }
      await addDaysToLicense(token, supabase, chatId, state.data.license_id, days);
      await clearUserState(supabase, userId);
      return;
    }
  }

  // Commands
  if (text === '/start' || text === '/menu') {
    await sendMainMenu(token, chatId);
    return;
  }

  // Default - show menu
  await sendMainMenu(token, chatId);
}

async function handleCallback(token: string, supabase: any, chatId: number, userId: number, data: string) {
  // Only clear state for menu/cancel, not for all callbacks
  if (data === 'menu' || data === 'cancel') {
    await clearUserState(supabase, userId);
    await sendMainMenu(token, chatId);
    return;
  }

  if (data === 'new_license') {
    await setUserState(supabase, userId, { action: 'awaiting_email', data: {} });
    await sendMessage(token, chatId, '📧 Digite o email do cliente:', {
      inline_keyboard: [[{ text: '❌ Cancelar', callback_data: 'cancel' }]]
    });
    return;
  }

  if (data === 'manage_license') {
    await setUserState(supabase, userId, { action: 'awaiting_license_key', data: {} });
    await sendMessage(token, chatId, '🔑 Digite a chave da licença (XXXXX-XXXXX-XXXXX-XXXXX):', {
      inline_keyboard: [[{ text: '❌ Cancelar', callback_data: 'cancel' }]]
    });
    return;
  }

  if (data === 'list_licenses') {
    await listLicenses(token, supabase, chatId);
    return;
  }

  if (data === 'download_extension') {
    await sendExtensionDownload(token, chatId);
    return;
  }

  if (data === 'send_zip_file') {
    await sendZipFile(token, chatId);
    return;
  }

  // Handle test license (10 minutes)
  if (data === 'days_test') {
    const state = await getUserState(supabase, userId);
    if (state && state.data.email) {
      await createTestLicense(token, supabase, chatId, state.data.email);
      await clearUserState(supabase, userId);
    }
    return;
  }

  if (data.startsWith('days_')) {
    const days = parseInt(data.replace('days_', ''));
    const state = await getUserState(supabase, userId);
    if (state && state.data.email) {
      await createLicense(token, supabase, chatId, state.data.email, days);
      await clearUserState(supabase, userId);
    }
    return;
  }

  if (data.startsWith('add_days_')) {
    const licenseId = data.replace('add_days_', '');
    await setUserState(supabase, userId, { action: 'awaiting_add_days', data: { license_id: licenseId } });
    await sendMessage(token, chatId, '📅 Quantos dias deseja adicionar?', {
      inline_keyboard: [
        [{ text: '+7 dias', callback_data: `quick_add_7_${licenseId}` }, { text: '+30 dias', callback_data: `quick_add_30_${licenseId}` }],
        [{ text: '+90 dias', callback_data: `quick_add_90_${licenseId}` }, { text: '+365 dias', callback_data: `quick_add_365_${licenseId}` }],
        [{ text: '❌ Cancelar', callback_data: 'menu' }]
      ]
    });
    return;
  }

  if (data.startsWith('quick_add_')) {
    const parts = data.replace('quick_add_', '').split('_');
    const days = parseInt(parts[0]);
    const licenseId = parts[1];
    await addDaysToLicense(token, supabase, chatId, licenseId, days);
    await clearUserState(supabase, userId);
    return;
  }

  if (data.startsWith('reset_device_')) {
    const licenseId = data.replace('reset_device_', '');
    await resetDevice(token, supabase, chatId, licenseId);
    return;
  }

  if (data.startsWith('toggle_status_')) {
    const licenseId = data.replace('toggle_status_', '');
    await toggleLicenseStatus(token, supabase, chatId, licenseId);
    return;
  }
}

async function sendMainMenu(token: string, chatId: number) {
  await sendMessage(token, chatId, 
    '🎛 *Painel Ilimitado Lov*\n\nEscolha uma opção:',
    {
      inline_keyboard: [
        [{ text: '➕ Nova Licença', callback_data: 'new_license' }],
        [{ text: '🔧 Gerenciar Licença', callback_data: 'manage_license' }],
        [{ text: '📋 Listar Licenças', callback_data: 'list_licenses' }],
        [{ text: '📦 Baixar Extensão', callback_data: 'download_extension' }]
      ]
    },
    'Markdown'
  );
}

async function sendExtensionDownload(token: string, chatId: number) {
  await sendMessage(token, chatId,
    `📦 *Download da Extensão*\n\n` +
    `Escolha como deseja receber a extensão Ilimitado Lov:`,
    {
      inline_keyboard: [
        [{ text: '📤 Enviar ZIP aqui', callback_data: 'send_zip_file' }],
        [{ text: '🔗 Abrir página de download', url: 'https://id-preview--8d04ca0c-bb81-46c0-8829-75dabd540520.lovable.app/extension' }],
        [{ text: '🔙 Voltar ao Menu', callback_data: 'menu' }]
      ]
    },
    'Markdown'
  );
}

async function sendZipFile(token: string, chatId: number) {
  // Send "uploading" status
  await sendMessage(token, chatId, '⏳ Gerando e enviando ZIP... Aguarde um momento.');
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const response = await fetch(`${supabaseUrl}/functions/v1/send-extension-zip`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'x-api-key': serviceRoleKey
      },
      body: JSON.stringify({ chatId })
    });
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to send ZIP');
    }
    
  } catch (error) {
    console.error('Error sending ZIP:', error);
    await sendMessage(token, chatId, 
      '❌ Erro ao enviar o arquivo. Use o link para baixar:',
      {
        inline_keyboard: [
          [{ text: '🔗 Abrir página de download', url: 'https://id-preview--8d04ca0c-bb81-46c0-8829-75dabd540520.lovable.app/extension' }],
          [{ text: '🔙 Voltar ao Menu', callback_data: 'menu' }]
        ]
      }
    );
  }
}

// Create test license valid for 10 minutes
async function createTestLicense(token: string, supabase: any, chatId: number, email: string) {
  const { data: keyResult } = await supabase.rpc('generate_license_key');
  const licenseKey = keyResult as string;
  
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes from now

  const { data: license, error } = await supabase
    .from('licenses')
    .insert({
      email,
      license_key: licenseKey,
      expires_at: expiresAt.toISOString(),
      status: 'active',
      notes: 'Licença de teste - 10 minutos'
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating test license:', error.code);
    await sendMessage(token, chatId, '❌ Erro ao criar licença. Tente novamente.', {
      inline_keyboard: [[{ text: '🔙 Voltar ao Menu', callback_data: 'menu' }]]
    });
    return;
  }

  await supabase.from('license_logs').insert({
    license_id: license.id,
    action: 'test_license_created',
    details: { email, expires_in_minutes: 10 }
  });

  await sendMessage(token, chatId,
    `🧪 *Licença de TESTE criada!*\n\n` +
    `📧 Email: \`${email}\`\n` +
    `🔑 Chave: \`${licenseKey}\`\n` +
    `⏱ Válida por: *10 minutos*\n` +
    `⏰ Expira às: ${expiresAt.toLocaleTimeString('pt-BR')}\n\n` +
    `⚠️ _Esta licença é apenas para teste!_`,
    {
      inline_keyboard: [
        [{ text: '➕ Criar outra', callback_data: 'new_license' }],
        [{ text: '🔙 Voltar ao Menu', callback_data: 'menu' }]
      ]
    },
    'Markdown'
  );
}

async function createLicense(token: string, supabase: any, chatId: number, email: string, days: number) {
  const { data: keyResult } = await supabase.rpc('generate_license_key');
  const licenseKey = keyResult as string;
  
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);

  const { data: license, error } = await supabase
    .from('licenses')
    .insert({
      email,
      license_key: licenseKey,
      expires_at: expiresAt.toISOString(),
      status: 'active'
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating license:', error.code);
    await sendMessage(token, chatId, '❌ Erro ao criar licença. Tente novamente.', {
      inline_keyboard: [[{ text: '🔙 Voltar ao Menu', callback_data: 'menu' }]]
    });
    return;
  }

  await supabase.from('license_logs').insert({
    license_id: license.id,
    action: 'license_created',
    details: { email, days }
  });

  await sendMessage(token, chatId,
    `✅ *Licença criada com sucesso!*\n\n` +
    `📧 Email: \`${email}\`\n` +
    `🔑 Chave: \`${licenseKey}\`\n` +
    `📅 Válida por: ${days} dias\n` +
    `⏰ Expira em: ${expiresAt.toLocaleDateString('pt-BR')}`,
    {
      inline_keyboard: [
        [{ text: '➕ Criar outra', callback_data: 'new_license' }],
        [{ text: '🔙 Voltar ao Menu', callback_data: 'menu' }]
      ]
    },
    'Markdown'
  );
}

async function addDaysToLicense(token: string, supabase: any, chatId: number, licenseId: string, days: number) {
  const { data: license } = await supabase
    .from('licenses')
    .select('*')
    .eq('id', licenseId)
    .single();

  if (!license) {
    await sendMessage(token, chatId, '❌ Licença não encontrada.');
    return;
  }

  const currentExpires = new Date(license.expires_at);
  const now = new Date();
  const baseDate = currentExpires > now ? currentExpires : now;
  
  const newExpires = new Date(baseDate);
  newExpires.setDate(newExpires.getDate() + days);

  await supabase
    .from('licenses')
    .update({ 
      expires_at: newExpires.toISOString(),
      status: 'active' // Reactivate if expired
    })
    .eq('id', licenseId);

  await supabase.from('license_logs').insert({
    license_id: licenseId,
    action: 'days_added',
    details: { days_added: days, new_expires_at: newExpires.toISOString() }
  });

  await sendMessage(token, chatId,
    `✅ *${days} dias adicionados!*\n\n` +
    `📧 ${license.email}\n` +
    `📅 Nova expiração: ${newExpires.toLocaleDateString('pt-BR')}`,
    {
      inline_keyboard: [[{ text: '🔙 Voltar ao Menu', callback_data: 'menu' }]]
    },
    'Markdown'
  );
}

async function resetDevice(token: string, supabase: any, chatId: number, licenseId: string) {
  const { error: licenseError } = await supabase
    .from('licenses')
    .update({ hwid: null, hwid_set_at: null })
    .eq('id', licenseId)
    .select('id')
    .single();

  // Delete device
  const { error: deviceError } = await supabase
    .from('devices')
    .delete()
    .eq('license_id', licenseId)
    .select('id');

  // Also delete sessions for this license
  const { error: sessionError } = await supabase
    .from('sessions')
    .delete()
    .eq('license_id', licenseId)
    .select('id');

   if (licenseError || deviceError) {
    console.error('Error resetting device:', licenseError?.code || deviceError?.code);
    await sendMessage(token, chatId, '❌ Erro ao resetar dispositivo. Tente novamente.');
    return;
  }

  await supabase.from('license_logs').insert({
    license_id: licenseId,
    action: 'device_reset',
    details: { reset_by: 'telegram_bot' }
  });

  await sendMessage(token, chatId,
    `✅ *Dispositivo resetado!*\n\nO cliente pode ativar em um novo dispositivo.`,
    {
      inline_keyboard: [[{ text: '🔙 Voltar ao Menu', callback_data: 'menu' }]]
    },
    'Markdown'
  );
}

async function toggleLicenseStatus(token: string, supabase: any, chatId: number, licenseId: string) {
  const { data: license } = await supabase
    .from('licenses')
    .select('*')
    .eq('id', licenseId)
    .single();

  if (!license) {
    await sendMessage(token, chatId, '❌ Licença não encontrada.');
    return;
  }

  const newStatus = license.status === 'revoked' ? 'active' : 'revoked';
  
  await supabase
    .from('licenses')
    .update({ 
      status: newStatus,
      revoked_at: newStatus === 'revoked' ? new Date().toISOString() : null
    })
    .eq('id', licenseId);

  await supabase.from('license_logs').insert({
    license_id: licenseId,
    action: newStatus === 'revoked' ? 'license_revoked' : 'license_reactivated',
    details: { changed_by: 'telegram_bot' }
  });

  const emoji = newStatus === 'revoked' ? '🚫' : '✅';
  const statusText = newStatus === 'revoked' ? 'revogada' : 'reativada';

  await sendMessage(token, chatId,
    `${emoji} *Licença ${statusText}!*\n\n📧 ${license.email}`,
    {
      inline_keyboard: [[{ text: '🔙 Voltar ao Menu', callback_data: 'menu' }]]
    },
    'Markdown'
  );
}

async function listLicenses(token: string, supabase: any, chatId: number) {
  const { data: licenses } = await supabase
    .from('licenses')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (!licenses || licenses.length === 0) {
    await sendMessage(token, chatId, '📋 Nenhuma licença encontrada.', {
      inline_keyboard: [[{ text: '🔙 Voltar ao Menu', callback_data: 'menu' }]]
    });
    return;
  }

  let message = '📋 *Últimas 10 licenças:*\n\n';
  
  for (const lic of licenses) {
    const emoji = getStatusEmoji(lic.status);
    const expires = new Date(lic.expires_at).toLocaleDateString('pt-BR');
    message += `${emoji} \`${lic.license_key}\`\n`;
    message += `   📧 ${lic.email}\n`;
    message += `   📅 ${expires}\n\n`;
  }

  await sendMessage(token, chatId, message, {
    inline_keyboard: [[{ text: '🔙 Voltar ao Menu', callback_data: 'menu' }]]
  }, 'Markdown');
}

function getStatusEmoji(status: string): string {
  switch (status) {
    case 'active': return '✅';
    case 'expired': return '⏰';
    case 'revoked': return '🚫';
    default: return '❓';
  }
}

async function sendMessage(token: string, chatId: number, text: string, reply_markup?: any, parse_mode?: string) {
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      reply_markup,
      parse_mode
    })
  });
  
  if (!response.ok) {
    console.error('Telegram API error:', await response.text());
  }
}

async function answerCallback(token: string, callbackId: string) {
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackId })
  });
}
