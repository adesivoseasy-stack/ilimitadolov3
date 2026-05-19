// ============================================================
// NEXO Extension v5.0 - Simplified Thin Client Architecture
// All security logic is handled server-side
// ============================================================

const API_BASE = 'https://rmetppilvfrxosvxzhgj.supabase.co/functions/v1';

// ============ API Functions ============
// Collect stable device fingerprint data
function getDeviceInfo() {
  return {
    screen: `${screen.width}x${screen.height}`,
    color_depth: screen.colorDepth,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    platform: navigator.platform,
    cores: navigator.hardwareConcurrency || 0,
  };
}

async function validateLicense(licenseKey) {
  try {
    console.log('[NEXO] Validating license:', licenseKey?.substring(0, 8) + '***');
    const response = await fetch(`${API_BASE}/validate-license-v2`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtZXRwcGlsdmZyeG9zdnh6aGdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNjE2MzgsImV4cCI6MjA4NTYzNzYzOH0.9ClXH2tomnJAGf0BSTAsJ7v4DTfnKQ8DDcrFj8mbqxY',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtZXRwcGlsdmZyeG9zdnh6aGdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNjE2MzgsImV4cCI6MjA4NTYzNzYzOH0.9ClXH2tomnJAGf0BSTAsJ7v4DTfnKQ8DDcrFj8mbqxY'
      },
      body: JSON.stringify({ license_key: licenseKey, device_info: getDeviceInfo() })
    });
    const result = await response.json();
    console.log('[NEXO] Validation result:', result);
    return result;
  } catch (error) {
    console.error('[NEXO] License validation error:', error);
    return { status: 'error', message: 'Erro de conexão' };
  }
}

async function sendMessage(sessionToken, message, projectId, lovableToken) {
  try {
    const storage = await chrome.storage.local.get(['licenseKey']);
    console.log('[NEXO] Sending message with session:', sessionToken?.substring(0, 8) + '***');
    const response = await fetch(`${API_BASE}/process-message`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-session-token': sessionToken,
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtZXRwcGlsdmZyeG9zdnh6aGdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNjE2MzgsImV4cCI6MjA4NTYzNzYzOH0.9ClXH2tomnJAGf0BSTAsJ7v4DTfnKQ8DDcrFj8mbqxY',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtZXRwcGlsdmZyeG9zdnh6aGdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNjE2MzgsImV4cCI6MjA4NTYzNzYzOH0.9ClXH2tomnJAGf0BSTAsJ7v4DTfnKQ8DDcrFj8mbqxY'
      },
      body: JSON.stringify({
        message: message,
        project_id: projectId,
        lovable_token: lovableToken,
        license_key: storage.licenseKey || ''
      })
    });
    
    // Handle 429 rate limit
    if (response.status === 429) {
      const result = await response.json();
      return { status: 'rate_limited', message: `⏳ Aguarde ${result.wait_seconds || 15} segundo(s).`, wait_seconds: result.wait_seconds };
    }
    
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      const result = await response.json();
      console.log('[NEXO] Message result:', result);
      return result;
    } else {
      const text = await response.text();
      return { reply: text };
    }
  } catch (error) {
    console.error('[NEXO] Message send error:', error);
    return { status: 'error', message: 'Erro ao enviar mensagem' };
  }
}

// ============ Helper Functions ============
async function getProjectFromActiveTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) return null;

    const url = new URL(tab.url);
    if (url.hostname.includes('lovable.dev') && url.pathname.includes('/projects/')) {
      const parts = url.pathname.split('/');
      const idx = parts.indexOf('projects');
      if (idx !== -1 && parts[idx + 1]) {
        return parts[idx + 1];
      }
    }
  } catch (e) {
    console.error('[NEXO] URL parse error:', e);
  }
  return null;
}

async function getLovableToken() {
  try {
    // Priority: lovable-session-id.insecure cookie
    const cookieNames = ['lovable-session-id.insecure', 'lovable-session-id', 'sb-access-token'];
    
    for (const name of cookieNames) {
      const cookie = await chrome.cookies.get({ url: 'https://lovable.dev', name });
      if (cookie?.value) {
        console.log(`[NEXO] Token found in cookie: ${name}`);
        return cookie.value;
      }
    }

    // Fallback: heuristic search for JWT
    const allCookies = await chrome.cookies.getAll({ domain: 'lovable.dev' });
    const tokenCookie = allCookies.find(c => 
      c.value.startsWith('ey') && (c.name.includes('token') || c.name.includes('session'))
    );
    if (tokenCookie) {
      console.log(`[NEXO] Token found by heuristic: ${tokenCookie.name}`);
      return tokenCookie.value;
    }

    return null;
  } catch (e) {
    console.error('[NEXO] Cookie error:', e);
    return null;
  }
}

// ============ UI Functions ============
function showScreen(screenId) {
  console.log('[NEXO] Showing screen:', screenId);
  document.querySelectorAll('.screen').forEach(s => {
    s.style.display = 'none';
    s.classList.add('hidden');
  });
  const target = document.getElementById(screenId);
  if (target) {
    target.style.display = 'flex';
    target.classList.remove('hidden');
  }
}

function updateStatus(elementId, message, isError = false) {
  console.log('[NEXO] Status update:', elementId, message, isError ? '(ERROR)' : '');
  const el = document.getElementById(elementId);
  if (el) {
    el.textContent = message;
    el.className = isError ? 'status error' : 'status';
  }
}

function addMessage(container, from, text) {
  const div = document.createElement('div');
  div.className = `bubble ${from}`;
  div.textContent = text;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function formatTimeRemaining(hours) {
  if (hours >= 24) {
    return `${Math.ceil(hours / 24)} dias restantes`;
  }
  return `${hours} horas restantes`;
}

// ============ Main Application ============
document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const licenseScreen = document.getElementById('licenseScreen');
  const mainScreen = document.getElementById('mainScreen');
  const licenseInput = document.getElementById('licenseKey');
  const activateBtn = document.getElementById('activateBtn');
  const licenseStatus = document.getElementById('licenseStatus');
  const timeRemaining = document.getElementById('timeRemaining');
  const messageInput = document.getElementById('message');
  const sendBtn = document.getElementById('sendBtn');
  const historyEl = document.getElementById('history');
  const statusEl = document.getElementById('status');
  const logoutBtn = document.getElementById('logoutBtn');

  // State
  let sessionToken = null;
  let projectId = null;
  let lovableToken = null;

  // ============ License Validation ============
  async function checkStoredLicense() {
    const storage = await chrome.storage.local.get(['licenseKey', 'sessionToken', 'sessionExpires']);
    
    if (!storage.licenseKey) {
      return { valid: false, reason: 'no_license' };
    }

    // Check if session is still valid
    if (storage.sessionToken && storage.sessionExpires) {
      const now = Date.now();
      if (now < storage.sessionExpires) {
        sessionToken = storage.sessionToken;
        return { valid: true, cached: true };
      }
    }

    // Revalidate with server
    const result = await validateLicense(storage.licenseKey);
    
    if (result.status === 'valid') {
      sessionToken = result.session_token;
      const expiresIn = 24 * 60 * 60 * 1000; // 24 hours
      await chrome.storage.local.set({
        sessionToken: result.session_token,
        sessionExpires: Date.now() + expiresIn,
        hoursRemaining: result.hours_remaining || result.days_remaining * 24
      });
      return { 
        valid: true, 
        hoursRemaining: result.hours_remaining || result.days_remaining * 24 
      };
    }

    return { valid: false, reason: result.status, message: result.message };
  }

  // ============ Initialize ============
  const licenseCheck = await checkStoredLicense();

  if (licenseCheck.valid) {
    showScreen('mainScreen');
    
    const storage = await chrome.storage.local.get(['hoursRemaining']);
    if (storage.hoursRemaining) {
      timeRemaining.textContent = formatTimeRemaining(storage.hoursRemaining);
    }

    // Get project and token
    projectId = await getProjectFromActiveTab();
    lovableToken = await getLovableToken();

    if (projectId) {
      updateStatus('status', `Projeto: ${projectId.slice(0, 8)}...`);
    } else {
      updateStatus('status', 'Abra um projeto no Lovable.dev');
    }

    if (!lovableToken) {
      updateStatus('status', 'Faça login no Lovable.dev', true);
    }
  } else {
    showScreen('licenseScreen');
    
    const errorMessages = {
      'expired': 'Sua licença expirou. Renove para continuar.',
      'device_mismatch': 'Licença em uso em outro dispositivo.',
      'revoked': 'Licença revogada. Contate o suporte.'
    };
    
    if (errorMessages[licenseCheck.reason]) {
      updateStatus('licenseStatus', errorMessages[licenseCheck.reason], true);
    }
  }

  // ============ Event Handlers ============
  
  // Activate License
  if (activateBtn) {
    console.log('[NEXO] Activate button found, adding listener');
    activateBtn.addEventListener('click', async () => {
      console.log('[NEXO] Activate button clicked');
      const key = licenseInput.value.trim().toUpperCase();
      
      if (!key) {
        updateStatus('licenseStatus', 'Digite uma chave de licença', true);
        return;
      }

      console.log('[NEXO] Starting validation for key:', key.substring(0, 8) + '***');
      activateBtn.disabled = true;
      activateBtn.textContent = 'Validando...';
      updateStatus('licenseStatus', 'Conectando ao servidor...');

      try {
        const result = await validateLicense(key);
        console.log('[NEXO] Validation complete:', result);

        if (result.status === 'valid') {
          sessionToken = result.session_token;
          const hoursRemaining = result.hours_remaining || (result.days_remaining ? result.days_remaining * 24 : 720);
          
          await chrome.storage.local.set({
            licenseKey: key,
            sessionToken: result.session_token,
            sessionExpires: Date.now() + 24 * 60 * 60 * 1000,
            hoursRemaining: hoursRemaining
          });

          updateStatus('licenseStatus', '✓ Licença ativada com sucesso!');
          activateBtn.textContent = 'Ativado!';
          
          setTimeout(async () => {
            showScreen('mainScreen');
            timeRemaining.textContent = formatTimeRemaining(hoursRemaining);
            
            projectId = await getProjectFromActiveTab();
            lovableToken = await getLovableToken();
            
            if (projectId) {
              updateStatus('status', `Projeto: ${projectId.slice(0, 8)}...`);
            }
          }, 1000);
        } else {
          activateBtn.disabled = false;
          activateBtn.textContent = 'Ativar Licença';
          
          const messages = {
            'not_found': 'Chave de licença não encontrada',
            'expired': 'Esta licença está expirada',
            'revoked': 'Esta licença foi revogada',
            'device_mismatch': 'Licença já ativada em outro dispositivo',
            'error': result.message || 'Erro ao validar licença'
          };
          
          updateStatus('licenseStatus', messages[result.status] || result.message || 'Erro desconhecido', true);
        }
      } catch (error) {
        console.error('[NEXO] Activation error:', error);
        activateBtn.disabled = false;
        activateBtn.textContent = 'Ativar Licença';
        updateStatus('licenseStatus', 'Erro de conexão. Tente novamente.', true);
      }
    });
  } else {
    console.error('[NEXO] Activate button NOT found!');
  }

  // Enter key on license input
  licenseInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') activateBtn.click();
  });

  // Send Message
  sendBtn.addEventListener('click', async () => {
    const text = messageInput.value.trim();
    if (!text) return;

    // Refresh project/token if needed
    if (!projectId) {
      projectId = await getProjectFromActiveTab();
      if (!projectId) {
        updateStatus('status', 'Abra uma aba do Lovable!', true);
        return;
      }
    }

    if (!lovableToken) {
      lovableToken = await getLovableToken();
      if (!lovableToken) {
        updateStatus('status', 'Faça login no Lovable!', true);
        return;
      }
    }

    if (!sessionToken) {
      updateStatus('status', 'Sessão expirada, reative a licença', true);
      return;
    }

    // Show validation screen before sending
    document.getElementById('validationScreen').style.display = 'flex';
    document.getElementById('validationStatus').textContent = 'Validando sua licença antes do envio...';
    document.getElementById('validationStatus').className = 'validation-status';

    // Re-validate license before sending
    const storage = await chrome.storage.local.get(['licenseKey']);
    if (!storage.licenseKey) {
      document.getElementById('validationScreen').style.display = 'none';
      updateStatus('status', 'Licença não encontrada', true);
      return;
    }

    const validationResult = await validateLicense(storage.licenseKey);
    
    if (validationResult.status !== 'valid') {
      document.getElementById('validationStatus').textContent = validationResult.message || 'Licença inválida';
      document.getElementById('validationStatus').className = 'validation-status error';
      setTimeout(() => {
        document.getElementById('validationScreen').style.display = 'none';
        updateStatus('status', 'Licença inválida', true);
        showScreen('licenseScreen');
      }, 2000);
      return;
    }

    document.getElementById('validationStatus').textContent = 'Licença validada! Enviando mensagem...';
    document.getElementById('validationStatus').className = 'validation-status success';

    setTimeout(async () => {
      document.getElementById('validationScreen').style.display = 'none';

      // Add user message to history
      addMessage(historyEl, 'user', text);
      messageInput.value = '';
      sendBtn.disabled = true;
      updateStatus('status', 'Enviando...');

      const result = await sendMessage(sessionToken, text, projectId, lovableToken);

      if (result.status === 'rate_limited') {
        updateStatus('status', `⏳ Aguarde ${result.wait_seconds || 15}s`, true);
        addMessage(historyEl, 'bot', result.message || `Aguarde ${result.wait_seconds || 15} segundos.`);
      } else if (result.status === 'session_expired' || result.status === 'session_invalid') {
        updateStatus('status', 'Sessão expirada', true);
        await chrome.storage.local.remove(['sessionToken', 'sessionExpires']);
        sessionToken = null;
        setTimeout(() => showScreen('licenseScreen'), 2000);
      } else if (result.status === 'device_mismatch') {
        updateStatus('status', 'Dispositivo não autorizado', true);
        addMessage(historyEl, 'bot', 'Erro: Esta sessão foi iniciada em outro dispositivo.');
      } else if (result.status === 'error') {
        updateStatus('status', 'Erro no envio', true);
        addMessage(historyEl, 'bot', `Erro: ${result.message}`);
      } else if (result.reply || result.message) {
        addMessage(historyEl, 'bot', result.reply || result.message);
        updateStatus('status', 'Enviado!');
      } else {
        updateStatus('status', 'Enviado!');
      }

      sendBtn.disabled = false;
    }, 1500);
  });

  // Enter key on message input
  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendBtn.click();
    }
  });

  // Logout
  logoutBtn.addEventListener('click', async () => {
    await chrome.storage.local.remove([
      'licenseKey', 'sessionToken', 'sessionExpires', 'hoursRemaining'
    ]);
    sessionToken = null;
    showScreen('licenseScreen');
    licenseInput.value = '';
    updateStatus('licenseStatus', '');
  });
});
