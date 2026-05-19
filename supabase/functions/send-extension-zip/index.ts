import JSZip from 'https://esm.sh/jszip@3.10.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json; charset=utf-8',
};

const BASE_URL = 'https://id-preview--8d04ca0c-bb81-46c0-8829-75dabd540520.lovable.app';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Require service role key as internal secret
  const apiKey = req.headers.get('x-api-key');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!apiKey || !serviceRoleKey || apiKey !== serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const { chatId } = await req.json();
    
    if (!chatId) {
      return new Response(JSON.stringify({ error: 'chatId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!TELEGRAM_BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN not configured');
    }

    console.log('Generating ZIP for chat:', chatId);

    // Generate ZIP
    const zip = new JSZip();
    
    const textFiles = [
      { name: 'manifest.json', path: '/extension/manifest.json' },
      { name: 'background.js', path: '/extension/background.js' },
      { name: 'sidepanel.html', path: '/extension/sidepanel.html' },
      { name: 'sidepanel.js', path: '/extension/sidepanel.js' },
      { name: 'popup.html', path: '/extension/popup.html' },
      { name: 'popup.js', path: '/extension/popup.js' },
      { name: 'README.md', path: '/extension/README.md' },
    ];

    // Fetch text files
    for (const file of textFiles) {
      try {
        const response = await fetch(`${BASE_URL}${file.path}`);
        if (response.ok) {
          const content = await response.text();
          zip.file(file.name, content);
          console.log(`Added: ${file.name}`);
        }
      } catch (e) {
        console.log(`${file.name} not found, skipping`);
      }
    }

    // Fetch logo
    try {
      const logoResponse = await fetch(`${BASE_URL}/extension/logo.png`);
      if (logoResponse.ok) {
        const logoBuffer = await logoResponse.arrayBuffer();
        zip.file('logo.png', logoBuffer);
        console.log('Added: logo.png');
      }
    } catch (e) {
      console.log('Logo not found, skipping');
    }

    // Fetch icons
    const iconsFolder = zip.folder('icons');
    const iconSizes = ['16', '32', '48', '128'];
    for (const size of iconSizes) {
      try {
        const iconResponse = await fetch(`${BASE_URL}/extension/icons/icon${size}.png`);
        if (iconResponse.ok) {
          const iconBuffer = await iconResponse.arrayBuffer();
          iconsFolder?.file(`icon${size}.png`, iconBuffer);
          console.log(`Added: icon${size}.png`);
        }
      } catch (e) {
        console.log(`Icon ${size} not found, skipping`);
      }
    }

    // Generate ZIP blob
    const zipContent = await zip.generateAsync({ type: 'arraybuffer' });
    console.log('ZIP generated, size:', zipContent.byteLength);

    // Send to Telegram using sendDocument
    const formData = new FormData();
    formData.append('chat_id', chatId.toString());
    formData.append('document', new Blob([zipContent], { type: 'application/zip' }), 'ilimitado-extension-v2.1.zip');
    formData.append('caption', '📦 *Extensão Ilimitado Lov v2.1*\n\n📋 *Instruções:*\n1. Extraia o ZIP\n2. Abra `chrome://extensions`\n3. Ative "Modo desenvolvedor"\n4. Clique em "Carregar sem compactação"\n5. Selecione a pasta extraída');
    formData.append('parse_mode', 'Markdown');

    const telegramResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, {
      method: 'POST',
      body: formData
    });

    const result = await telegramResponse.json();
    console.log('Telegram response:', JSON.stringify(result));

    if (!result.ok) {
      throw new Error(result.description || 'Failed to send document');
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
