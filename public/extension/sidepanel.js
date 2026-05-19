// ============================================================
// ILIMITADO LOV Extension - v4.1.0 THIN CLIENT SHELL
// ============================================================

const EXTENSION_VERSION = '4.1.0';
console.log(`🚀 Ilimitado Lov Extension v${EXTENSION_VERSION} (Thin Client) iniciando...`);

const SUPABASE_URL = 'https://rmetppilvfrxosvxzhgj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtZXRwcGlsdmZyeG9zdnh6aGdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNjE2MzgsImV4cCI6MjA4NTYzNzYzOH0.9ClXH2tomnJAGf0BSTAsJ7v4DTfnKQ8DDcrFj8mbqxY';
const REMOTE_ORIGIN = SUPABASE_URL;
const WHATSAPP_FALLBACK_URL = 'https://w.app/lovableilimitado';

// Session state
let licenseSessionToken = null;
let licenseKey = null;
let licenseInfo = null;
let cachedHwid = null;
let whatsappUrl = null;

// ========== UTILITY FUNCTIONS ==========

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = 'toast ' + type;
  toast.offsetHeight;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

async function generateHWID() {
  if (cachedHwid) return cachedHwid;
  const stored = await chrome.storage.local.get(['hwid']);
  if (stored.hwid) { cachedHwid = stored.hwid; return stored.hwid; }
  const components = [
    navigator.userAgent, navigator.language, navigator.platform,
    screen.width + 'x' + screen.height, screen.colorDepth,
    new Date().getTimezoneOffset(), navigator.hardwareConcurrency || 'unknown'
  ];
  const data = components.join('|');
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  cachedHwid = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  await chrome.storage.local.set({ hwid: cachedHwid });
  return cachedHwid;
}

async function validateLicense(key) {
  try {
    console.log('🔐 Validando licença:', key.substring(0, 8) + '***');
    const deviceInfo = {
      screen: `${screen.width}x${screen.height}`,
      color_depth: screen.colorDepth,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      platform: navigator.platform,
      cores: navigator.hardwareConcurrency || 0,
    };
    const response = await fetch(`${SUPABASE_URL}/functions/v1/validate-license`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY },
      body: JSON.stringify({ license_key: key, device_info: deviceInfo })
    });
    return await response.json();
  } catch (error) {
    console.error('❌ Erro ao validar licença:', error);
    return { status: 'error', message: error.message };
  }
}

async function revalidateLicense() {
  if (!licenseKey) {
    const storage = await chrome.storage.local.get(['licenseKey']);
    licenseKey = storage.licenseKey;
  }
  if (!licenseKey) return { valid: false, message: 'Nenhuma licença ativada' };
  const result = await validateLicense(licenseKey);
  if (result.status === 'valid') {
    licenseSessionToken = result.session_token;
    await chrome.storage.local.set({ licenseSessionToken: result.session_token });
    licenseInfo = { days_remaining: result.days_remaining, hours_remaining: result.hours_remaining, license_id: result.license_id };
    return { valid: true, session_token: result.session_token };
  }
  return { valid: false, message: result.message };
}

async function loadSupportInfo() {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/get-support-info`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY }
    });
    if (response.ok) {
      const data = await response.json();
      if (data.whatsapp_url) {
        whatsappUrl = data.whatsapp_url;
        const btn = document.getElementById('whatsappSupport');
        if (btn) btn.classList.remove('loading');
      }
    }
  } catch (error) { console.error('❌ Erro ao carregar suporte:', error); }
}

function openWhatsAppSupport() {
  const url = whatsappUrl || WHATSAPP_FALLBACK_URL;
  try {
    chrome.runtime.sendMessage({ action: 'openUrl', url }, (response) => {
      if (chrome.runtime.lastError) {
        try { chrome.tabs.create({ url }); } catch { window.open(url, '_blank'); }
      }
    });
  } catch { window.open(url || WHATSAPP_FALLBACK_URL, '_blank'); }
}

// ========== CHROME API HELPERS (for bridge) ==========

async function getAuthData() {
  try {
    // Priority 1: Use the REAL API token captured via webRequest/fetch intercept
    const stored = await chrome.storage.local.get(['lovable_api_token', 'lovable_api_token_ts', 'lovable_git_sha']);
    if (stored.lovable_api_token) {
      const age = Date.now() - (stored.lovable_api_token_ts || 0);
      // Token valid for 1 hour
      if (age < 3600000) {
        console.log('[Auth] Using captured API token (age: ' + Math.round(age/1000) + 's)');
        // Extract raw token (remove "Bearer " prefix if present)
        const rawToken = stored.lovable_api_token.replace(/^Bearer\s+/i, '');
        return { 
          token: rawToken, 
          sessionId: null,
          gitSha: stored.lovable_git_sha || null,
          source: 'webRequest'
        };
      }
    }
    
    // Priority 2: Fallback to cookies
    const cookies = await chrome.cookies.getAll({ domain: 'lovable.dev' });
    let token = null, sessionId = null;
    for (const cookie of cookies) {
      if (cookie.name === 'lovable-session-id.id' && !token) {
        token = cookie.value;
        try {
          const parts = cookie.value.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            sessionId = payload.user_id || payload.sub || payload.session_id;
          }
        } catch {}
      }
      if (cookie.name === 'sb-api-auth-token' && !token) {
        try { const p = JSON.parse(decodeURIComponent(cookie.value)); token = p.access_token || p[0]?.access_token || cookie.value; } catch { token = cookie.value; }
      }
      if (!sessionId && cookie.name.includes('session')) {
        try { const p = JSON.parse(decodeURIComponent(cookie.value)); sessionId = p.session_id || p[0]?.session_id; } catch {}
      }
    }
    return { token, sessionId, gitSha: null, source: 'cookies' };
  } catch (e) {
    console.error('Error getting auth data:', e);
    return { token: null, sessionId: null, gitSha: null, source: 'error' };
  }
}

async function getProjectFromActiveTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) return null;
    const match = tab.url.match(/lovable\.dev\/projects\/([a-f0-9-]+)/);
    if (match) return match[1];
    const subdomainMatch = tab.url.match(/([a-f0-9-]+)\.lovableproject\.com/);
    if (subdomainMatch) return subdomainMatch[1];
    return null;
  } catch { return null; }
}

async function getLovableTabForProject(projectId) {
  try {
    const tabs = await chrome.tabs.query({});
    return tabs.find((tab) => {
      if (!tab?.id || !tab.url) return false;
      return tab.url.includes('lovable.dev/projects/' + projectId);
    }) || tabs.find((tab) => {
      if (!tab?.id || !tab.url) return false;
      return tab.url.includes('lovable.dev');
    }) || null;
  } catch (error) {
    console.warn('[Bridge] Não foi possível localizar aba do Lovable:', error);
    return null;
  }
}

// ========== BRIDGE: postMessage proxy for remote iframe ==========

function setupBridge(iframe) {
  const ALLOWED_ORIGIN = REMOTE_ORIGIN;

  window.addEventListener('message', async (event) => {
    // Accept messages from the iframe (remote origin) or same origin (for preview)
    const { requestId, command, payload } = event.data || {};
    if (!requestId || !command) return;

    console.log(`[Bridge] Command: ${command}`, payload);

    let result = null;
    let error = null;

    try {
      switch (command) {
        // ---- Storage ----
        case 'storage.get': {
          const keys = payload?.keys || [];
          result = await chrome.storage.local.get(keys);
          break;
        }
        case 'storage.set': {
          await chrome.storage.local.set(payload?.data || {});
          result = { ok: true };
          break;
        }

        // ---- Cookies ----
        case 'cookies.getAll': {
          const domain = payload?.domain || 'lovable.dev';
          result = await chrome.cookies.getAll({ domain });
          break;
        }

        // ---- Tabs ----
        case 'tabs.query': {
          result = await chrome.tabs.query(payload?.queryInfo || { active: true, currentWindow: true });
          break;
        }

        // ---- Auth ----
        case 'auth.getToken': {
          result = await getAuthData();
          break;
        }

        // ---- Project ----
        case 'project.getActive': {
          const projectId = await getProjectFromActiveTab();
          result = { projectId };
          break;
        }

        // ---- License ----
        case 'license.getInfo': {
          result = { licenseInfo, licenseSessionToken, licenseKey };
          break;
        }
        case 'license.revalidate': {
          result = await revalidateLicense();
          break;
        }
        case 'license.logout': {
          await chrome.storage.local.remove(['licenseKey', 'licenseSessionToken']);
          licenseKey = null;
          licenseSessionToken = null;
          licenseInfo = null;
          showLicenseScreen();
          result = { ok: true };
          break;
        }

        // ---- Send message (via Edge Function proxy) ----
        case 'lovable.sendMessage': {
          const pId = payload?.projectId || await getProjectFromActiveTab();

          if (!pId) {
            error = 'Abra um projeto no Lovable.dev primeiro';
            break;
          }

          // Revalidate license before sending
          const check = await revalidateLicense();
          if (!check.valid) {
            error = check.message || 'Licença inválida';
            break;
          }

          // Capture user's real token from webRequest interception
          let lovableToken = null;
          try {
            const stored = await chrome.storage.local.get(['lovable_api_token']);
            lovableToken = stored.lovable_api_token || null;
          } catch (e) { /* silent */ }

          const sendPayload = {
            token: lovableToken || '',
            projectId: pId,
            message: payload?.message || '',
            license_key: licenseKey || '',
          };

          // If files are attached, send all (up to 10) as base64 array
          const files = payload?.files;
          if (files && files.length > 0) {
            sendPayload.files = files.slice(0, 10).map(f => ({
              data: f.data.split(',')[1] || f.data,
              name: f.name || 'file',
              type: f.type || 'application/octet-stream',
            }));
            console.log(`[Bridge] 📎 ${sendPayload.files.length} file(s) attached`);
          }

          console.log(`[Bridge] 📤 Sending via Edge Function proxy`);
          console.log(`[Bridge] 📤 URL: ${SUPABASE_URL}/functions/v1/send-message`);
          console.log(`[Bridge] 📤 Session token present: ${!!licenseSessionToken}`);
          console.log(`[Bridge] 📤 Lovable token present: ${!!lovableToken}`);
          console.log(`[Bridge] 📤 Project ID: ${pId}`);
          console.log(`[Bridge] 📤 Message length: ${(payload?.message || '').length}`);

          let response;
          try {
            response = await fetch(`${SUPABASE_URL}/functions/v1/send-message`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'apikey': SUPABASE_ANON_KEY,
                'x-session-token': licenseSessionToken || ''
              },
              body: JSON.stringify(sendPayload)
            });
          } catch (fetchErr) {
            console.error(`[Bridge] ❌ FETCH EXCEPTION:`, fetchErr.message, fetchErr.stack);
            error = `Failed to fetch: ${fetchErr.message}`;
            break;
          }

          if (!response.ok) {
            const errBody = await response.text();
            try {
              const parsed = JSON.parse(errBody);
              if (response.status === 429 && parsed.wait_seconds) {
                error = `⏳ Aguarde ${parsed.wait_seconds} segundo(s) antes de enviar outra mensagem.`;
              } else {
                error = parsed.message || `Erro HTTP ${response.status}`;
              }
            } catch {
              error = `Erro HTTP ${response.status}`;
            }
            break;
          }

          const responseText = await response.text();
          if (!responseText || responseText.trim() === '') {
            result = { message: '✅ Mensagem enviada! O n8n está processando...' };
          } else {
            const responseContentType = response.headers.get('content-type') || '';
            if (responseContentType.includes('application/json')) {
              try {
                result = JSON.parse(responseText);
              } catch (e) {
                result = { reply: responseText };
              }
            } else {
              result = { reply: responseText };
            }
          }
          break;
        }

        // ---- Publish ----
        case 'lovable.publish': {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (!tab?.url?.includes('lovable.dev')) {
            error = 'Você precisa estar no Lovable.dev!';
            break;
          }
          const pId2 = await getProjectFromActiveTab();
          if (!pId2) { error = 'Abra um projeto no Lovable.dev primeiro'; break; }
          const auth2 = await getAuthData();

          result = await new Promise((resolve) => {
            chrome.tabs.sendMessage(tab.id, {
              action: 'publishProject', projectId: pId2, authToken: auth2.token
            }, (response) => {
              if (chrome.runtime.lastError) {
                resolve({ success: false, error: 'Erro ao publicar. Recarregue a página.' });
              } else {
                resolve(response || { success: true });
              }
            });
          });
          break;
        }

        // ---- Templates ----
        case 'templates.getAll': {
          const tplResponse = await fetch(`${SUPABASE_URL}/functions/v1/get-templates`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              'apikey': SUPABASE_ANON_KEY,
              'x-session-token': licenseSessionToken
            }
          });
          if (!tplResponse.ok) throw new Error(`HTTP ${tplResponse.status}`);
          result = await tplResponse.json();
          break;
        }

        // ---- Download Project (client-side via background) ----
        case 'lovable.downloadProject': {
          const auth = await getAuthData();
          const pId3 = payload?.projectId || await getProjectFromActiveTab();

          if (!auth.token) {
            error = 'Token não encontrado. Faça login no Lovable.dev';
            break;
          }
          if (!pId3) {
            error = 'Abra um projeto no Lovable.dev primeiro';
            break;
          }

          // Revalidate license
          const check3 = await revalidateLicense();
          if (!check3.valid) {
            error = check3.message || 'Licença inválida';
            break;
          }

          // Notify iframe about progress
          const sendProgress = (msg) => {
            iframe.contentWindow?.postMessage({
              requestId: 'progress_' + Date.now(),
              command: 'download.progress',
              payload: { message: msg }
            }, '*');
          };

          sendProgress('📡 Buscando arquivos do projeto...');

          // Step 1: Get source-code via background (CORS-free)
          const sourceResult = await new Promise((resolve) => {
            chrome.runtime.sendMessage(
              { action: 'downloadSourceCode', projectId: pId3, token: auth.token },
              (response) => resolve(response)
            );
          });

          if (!sourceResult?.success || !sourceResult.files) {
            error = sourceResult?.error || 'Falha ao obter código-fonte';
            break;
          }

          const files = sourceResult.files;
          console.log(`[Download] Got ${files.length} files from source-code`);
          sendProgress(`📦 Empacotando ${files.length} arquivos...`);

          // Step 2: Build ZIP client-side
          const zip = new JSZip();
          const IMAGE_EXT = /\.(png|jpg|jpeg|gif|svg|ico|webp|bmp|zip|woff|woff2|ttf|eot|mp3|mp4|pdf)$/i;
          const binaryFiles = [];

          for (const file of files) {
            const filePath = file.path || file.name || file.filename;
            if (!filePath) continue;

            const content = file.contents ?? file.content ?? file.code ?? file.text ?? file.body;

            if (content != null && typeof content === 'string' && content.length > 0) {
              if (file.binary) {
                zip.file(filePath, content, { base64: true });
              } else {
                zip.file(filePath, content);
              }
            } else if (file.sizeExceeded) {
              // Skip oversized files
              console.warn('[Download] Skipping oversized file:', filePath);
            } else if (IMAGE_EXT.test(filePath) || content == null) {
              binaryFiles.push(filePath);
            }
          }

          // Step 3: Fetch missing files via background (batches of 10)
          if (binaryFiles.length > 0) {
            sendProgress(`⬇️ Baixando ${binaryFiles.length} assets...`);
            const BATCH = 10;
            for (let i = 0; i < binaryFiles.length; i += BATCH) {
              const batch = binaryFiles.slice(i, i + BATCH);
              const results = await Promise.all(
                batch.map(fp => new Promise((resolve) => {
                  chrome.runtime.sendMessage(
                    { action: 'fetchRawFile', projectId: pId3, filePath: fp, token: auth.token },
                    (resp) => resolve({ path: fp, ...resp })
                  );
                }))
              );
              for (const r of results) {
                if (r.success && r.data) {
                  if (r.type === 'binary') {
                    zip.file(r.path, r.data, { base64: true });
                  } else {
                    zip.file(r.path, r.data);
                  }
                }
              }
            }
          }

          sendProgress('🗜️ Comprimindo...');
          const zipBlob = await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
          });

          // Step 4: Trigger download
          const timestamp = new Date().toISOString().split('T')[0];
          const url = URL.createObjectURL(zipBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `lovable-${pId3.slice(0, 8)}-${timestamp}.zip`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 5000);

          result = { success: true, message: '✅ Download concluído!' };
          break;
        }

        // ---- Open URL ----
        case 'runtime.openUrl': {
          const targetUrl = payload?.url;
          if (targetUrl) {
            try { chrome.runtime.sendMessage({ action: 'openUrl', url: targetUrl }); } catch { chrome.tabs.create({ url: targetUrl }); }
          }
          result = { ok: true };
          break;
        }

        default:
          error = `Unknown command: ${command}`;
      }
    } catch (e) {
      console.error(`[Bridge] Error on ${command}:`, e);
      error = e.message;
    }

    // Reply back to iframe
    iframe.contentWindow?.postMessage({ requestId, ok: !error, payload: result, error }, '*');
  });

  // Listen for captured chat messages from content script (via background relay)
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'chatCapturedRelay' && message.content) {
      console.log('[Bridge] Relaying captured chat to iframe');
      iframe.contentWindow?.postMessage({
        requestId: 'capture_' + Date.now(),
        command: 'chat.captured',
        payload: { content: message.content, source: message.source, timestamp: message.timestamp }
      }, '*');
    }
  });

  console.log('[Bridge] Setup complete');
}

// ========== UI NAVIGATION ==========

function showLicenseScreen() {
  const ls = document.getElementById('licenseScreen');
  const rr = document.getElementById('remoteUiRoot');
  if (ls) ls.style.display = 'flex';
  if (rr) { rr.style.display = 'none'; rr.innerHTML = ''; }
}

async function fetchRemoteUiHtml() {
  const url = `${SUPABASE_URL}/functions/v1/serve-extension-ui?sessionToken=${encodeURIComponent(licenseSessionToken)}&extVersion=${EXTENSION_VERSION}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`Falha ao carregar interface remota (${response.status})`);
  }

  const html = await response.text();
  if (!html || !html.toLowerCase().includes('<html')) {
    throw new Error('HTML remoto inválido');
  }

  const runtimeUrl = chrome.runtime.getURL('remote-ui.js');
  const sanitizedHtml = html
    .replace(/<script\b[^>]*src=["'][^"']*["'][^>]*>\s*<\/script>/gi, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');

  const runtimeScript = `<script src="${runtimeUrl}"></script>`;
  const normalizedHtml = /<\/body>/i.test(sanitizedHtml)
    ? sanitizedHtml.replace(/<\/body>/i, `${runtimeScript}</body>`)
    : `${sanitizedHtml}${runtimeScript}`;

  return normalizedHtml;
}

async function showMainApp() {
  const ls = document.getElementById('licenseScreen');
  const root = document.getElementById('remoteUiRoot');
  if (!root) return;

  if (ls) ls.style.display = 'none';
  root.style.display = 'block';

  try {
    if (!licenseSessionToken) {
      throw new Error('Sessão da licença não encontrada');
    }

    const html = await fetchRemoteUiHtml();

    let iframe = document.getElementById('remoteUiFrame');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'remoteUiFrame';
      iframe.allow = 'clipboard-read; clipboard-write';
      root.innerHTML = '';
      root.appendChild(iframe);
      setupBridge(iframe);
    }

    iframe.srcdoc = html;
  } catch (error) {
    console.error('❌ Erro ao carregar UI remota:', error);
    root.style.display = 'none';
    if (ls) ls.style.display = 'flex';
    showToast(error.message || 'Erro ao carregar interface', 'error');
  }
}

// ========== MAIN INITIALIZATION ==========

document.addEventListener('DOMContentLoaded', async () => {
  const activateBtn = document.getElementById('activateBtn');
  const licenseInput = document.getElementById('licenseKey');
  const licenseStatus = document.getElementById('licenseStatus');
  const whatsappSupport = document.getElementById('whatsappSupport');

  loadSupportInfo();
  await generateHWID();

  // WhatsApp handler
  if (whatsappSupport) {
    whatsappSupport.addEventListener('click', (e) => {
      e.preventDefault();
      openWhatsAppSupport();
    });
  }

  // Check stored license
  async function checkStoredLicense() {
    const storage = await chrome.storage.local.get(['licenseKey', 'licenseSessionToken']);
    if (storage.licenseKey) {
      licenseKey = storage.licenseKey;
      licenseSessionToken = storage.licenseSessionToken;
      if (licenseStatus) { licenseStatus.textContent = 'Verificando licença...'; licenseStatus.style.color = '#f59e0b'; }

      const result = await validateLicense(licenseKey);
      if (result.status === 'valid') {
        licenseSessionToken = result.session_token;
        licenseInfo = { days_remaining: result.days_remaining, hours_remaining: result.hours_remaining, license_id: result.license_id };
        await chrome.storage.local.set({ licenseSessionToken: result.session_token });
        showMainApp();
        return true;
      } else {
        await chrome.storage.local.remove(['licenseKey', 'licenseSessionToken']);
        licenseKey = null; licenseSessionToken = null;
        if (licenseStatus) { licenseStatus.textContent = `❌ ${result.message || 'Licença inválida'}`; licenseStatus.style.color = '#ef4444'; }
      }
    }
    showLicenseScreen();
    return false;
  }

  // Activate button
  if (activateBtn) {
    activateBtn.addEventListener('click', async () => {
      const key = licenseInput?.value?.trim().toUpperCase();
      if (!key) {
        if (licenseStatus) { licenseStatus.textContent = 'Digite uma chave de licença'; licenseStatus.style.color = '#ef4444'; }
        return;
      }
      activateBtn.disabled = true;
      if (licenseStatus) { licenseStatus.textContent = '🔐 Validando licença...'; licenseStatus.style.color = '#f59e0b'; }
      try {
        const result = await validateLicense(key);
        if (result.status === 'valid') {
          licenseKey = key;
          licenseSessionToken = result.session_token;
          licenseInfo = { days_remaining: result.days_remaining, hours_remaining: result.hours_remaining, license_id: result.license_id };
          await chrome.storage.local.set({ licenseKey: key, licenseSessionToken: result.session_token });
          if (licenseStatus) { licenseStatus.textContent = '✅ Licença ativada!'; licenseStatus.style.color = '#22c55e'; }
          showToast('Licença ativada com sucesso!', 'success');
          setTimeout(() => showMainApp(), 500);
        } else {
          if (licenseStatus) { licenseStatus.textContent = `❌ ${result.message || 'Licença inválida'}`; licenseStatus.style.color = '#ef4444'; }
          showToast(result.message || 'Licença inválida', 'error');
        }
      } catch (error) {
        if (licenseStatus) { licenseStatus.textContent = '❌ Erro ao validar licença'; licenseStatus.style.color = '#ef4444'; }
      } finally {
        activateBtn.disabled = false;
      }
    });
  }

  checkStoredLicense();
});
