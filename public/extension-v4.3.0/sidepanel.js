// ============================================================
// ILIMITADO LOV Extension - v4.1.0 THIN CLIENT SHELL
// ============================================================

const EXTENSION_VERSION = '4.1.0';
console.log(`🚀 Ilimitado Lov Extension v${EXTENSION_VERSION} (Thin Client) iniciando...`);

const SUPABASE_URL = 'https://wvelcefgihlxcnrmslul.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2ZWxjZWZnaWhseGNucm1zbHVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNDUzMDcsImV4cCI6MjA5NDcyMTMwN30.NuzN6PlTAdCI_36DWG_4C2UAGLEe5hmVppxoake7-6s';
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
    const response = await fetch(`${SUPABASE_URL}/functions/v1/validate-license-v2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY },
      body: JSON.stringify({ license_key: key })
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
    const stored = await chrome.storage.local.get(['lovable_api_token', 'lovable_api_token_ts', 'lovable_git_sha']);
    if (stored.lovable_api_token) {
      const age = Date.now() - (stored.lovable_api_token_ts || 0);
      if (age < 3600000) {
        const rawToken = stored.lovable_api_token.replace(/^Bearer\s+/i, '');
        return {
          token: rawToken,
          sessionId: null,
          gitSha: stored.lovable_git_sha || null,
          source: 'captured'
        };
      }
    }

    let token = null, sessionId = null;

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id && tab.url && /lovable\.dev|lovableproject\.com/.test(tab.url)) {
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id, allFrames: true },
          func: () => {
            const collected = [];

            const safeParse = (value) => {
              if (typeof value !== 'string') return null;
              try { return JSON.parse(value); } catch { return null; }
            };

            const walk = (value, key, source, found = []) => {
              if (!value) return found;

              if (typeof value === 'string') {
                const parsed = safeParse(value);
                if (parsed) walk(parsed, key, source, found);
                return found;
              }

              if (Array.isArray(value)) {
                for (const item of value) walk(item, key, source, found);
                return found;
              }

              if (typeof value !== 'object') return found;

              const accessToken = value.access_token || value.accessToken || value.token || value.jwt || value.stsTokenManager?.accessToken || null;
              const refreshToken = value.refresh_token || value.refreshToken || value.stsTokenManager?.refreshToken || null;
              const userId = value.user?.id || value.user_id || value.sub || null;

              if (accessToken || refreshToken) {
                found.push({ key, source, accessToken, refreshToken, userId });
              }

              for (const [childKey, childValue] of Object.entries(value)) {
                if (typeof childValue === 'object' || typeof childValue === 'string') {
                  walk(childValue, `${key}.${childKey}`, source, found);
                }
              }

              return found;
            };

            const scanStorage = (storage, source) => {
              for (let i = 0; i < storage.length; i++) {
                const key = storage.key(i);
                if (!key) continue;
                const lowerKey = key.toLowerCase();
                if (
                  lowerKey.includes('auth-token') ||
                  lowerKey.includes('access_token') ||
                  lowerKey.includes('supabase') ||
                  lowerKey.includes('session') ||
                  lowerKey.startsWith('sb-')
                ) {
                  const raw = storage.getItem(key);
                  walk(raw, key, source, collected);
                }
              }
            };

            try { scanStorage(localStorage, 'localStorage'); } catch {}
            try { scanStorage(sessionStorage, 'sessionStorage'); } catch {}

            return collected;
          }
        });

        const candidates = results
          .flatMap((entry) => Array.isArray(entry.result) ? entry.result : [])
          .filter((candidate) => candidate?.accessToken || candidate?.refreshToken);

        const bestCandidate = candidates.sort((a, b) => {
          const score = (item) => {
            let points = 0;
            if (item?.refreshToken) points += 100;
            if (item?.accessToken) points += 50;
            if (String(item?.key || '').startsWith('sb-')) points += 25;
            if (String(item?.source || '') === 'localStorage') points += 10;
            return points;
          };
          return score(b) - score(a);
        })[0];

        if (bestCandidate?.accessToken) {
          token = bestCandidate.accessToken;
          sessionId = bestCandidate.userId || null;
          console.log('[Auth] Token capturado do storage da página:', bestCandidate.key);
        }
      } catch (storageError) {
        console.warn('[Auth] Falha ao capturar token do storage, usando cookies como fallback:', storageError);
      }
    }

    const cookies = await chrome.cookies.getAll({ domain: 'lovable.dev' });
    for (const cookie of cookies) {
      if ((cookie.name === 'lovable-session-id.id' || cookie.name === 'lovable-session-id' || cookie.name === 'lovable-session-id.insecure') && !token) {
        token = cookie.value;
        try {
          const parts = cookie.value.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            sessionId = sessionId || payload.user_id || payload.sub || payload.session_id;
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

    if (token && !sessionId) {
      try {
        const jwt = token.startsWith('Bearer ') ? token.slice(7) : token;
        const parts = jwt.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          sessionId = payload.session_id || payload.user_id || payload.sub || null;
        }
      } catch {}
    }

    return { token, sessionId, gitSha: stored?.lovable_git_sha || null, source: 'fallback' };
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

        // ---- Send message (proxy to Edge Function) ----
        case 'lovable.sendMessage': {
          const auth = await getAuthData();
          const pId = payload?.projectId || await getProjectFromActiveTab();

          if (!auth.token) {
            error = 'Token não encontrado. Faça login no Lovable.dev';
            break;
          }
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

          const msgPayload = {
            message: payload?.message,
            project_id: pId,
            lovable_token: auth.token,
            license_key: licenseKey
          };

          if (auth.gitSha) {
            msgPayload.git_sha = auth.gitSha;
          }

          // Include files if provided (base64 array from remote-ui)
          if (payload?.files && payload.files.length > 0) {
            msgPayload.files = payload.files;
          }

          const sendRequest = async () => fetch(`${SUPABASE_URL}/functions/v1/process-message`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              'apikey': SUPABASE_ANON_KEY,
              'x-session-token': licenseSessionToken
            },
            body: JSON.stringify(msgPayload)
          });

          let response = await sendRequest();

          if (!response.ok) {
            let parsed = null;
            const rawErrorText = await response.text();
            try { parsed = JSON.parse(rawErrorText); } catch {}

            const errorMessage = parsed?.message || `HTTP ${response.status}`;

            if (response.status === 401 && /invalid token/i.test(errorMessage)) {
              await chrome.storage.local.remove(['lovable_api_token', 'lovable_api_token_ts', 'lovable_git_sha']);
              const refreshedAuth = await getAuthData();
              if (refreshedAuth?.token && refreshedAuth.token !== auth.token) {
                msgPayload.lovable_token = refreshedAuth.token;
                if (refreshedAuth.gitSha) msgPayload.git_sha = refreshedAuth.gitSha;
                response = await sendRequest();
              } else {
                throw new Error('Token do Lovable inválido. Recarregue a aba do projeto e tente novamente.');
              }
            } else if (response.status === 429 && parsed?.wait_seconds) {
              throw new Error(`⏳ Aguarde ${parsed.wait_seconds} segundo(s) antes de enviar outra mensagem.`);
            } else if (response.status === 401) {
              throw new Error(errorMessage || 'Sessão inválida. Reative a licença.');
            } else {
              throw new Error(errorMessage);
            }
          }

          if (!response.ok) {
            const retryText = await response.text();
            let retryJson = null;
            try { retryJson = JSON.parse(retryText); } catch {}
            if (response.status === 429 && retryJson?.wait_seconds) {
              throw new Error(`⏳ Aguarde ${retryJson.wait_seconds} segundo(s) antes de enviar outra mensagem.`);
            }
            throw new Error(retryJson?.message || `HTTP ${response.status}`);
          }

          const responseText = await response.text();
          if (!responseText || responseText.trim() === '') {
            // API returns 202 with empty body — treat as success
            result = { message: '✅ Mensagem enviada! O Lovable está processando...' };
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
  const fab = document.getElementById('watermarkFab');
  if (fab) fab.classList.add('visible');

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
    const fab = document.getElementById('watermarkFab');
    if (fab) fab.classList.remove('visible');
    showToast(error.message || 'Erro ao carregar interface', 'error');
  }
}

// ========== DIRECT SEND (used by watermark FAB, bypasses iframe) ==========
async function sendDirectLovableMessage(messageText) {
  const auth = await getAuthData();
  if (!auth?.token) throw new Error('Token do Lovable não encontrado. Abra o projeto no Lovable.dev.');

  const pId = await getProjectFromActiveTab();
  if (!pId) throw new Error('Abra um projeto no Lovable.dev primeiro.');

  const check = await revalidateLicense();
  if (!check.valid) throw new Error(check.message || 'Licença inválida');

  const msgPayload = {
    message: messageText,
    project_id: pId,
    lovable_token: auth.token,
    license_key: licenseKey,
  };
  if (auth.gitSha) msgPayload.git_sha = auth.gitSha;

  const response = await fetch(`${SUPABASE_URL}/functions/v1/process-message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY,
      'x-session-token': licenseSessionToken,
    },
    body: JSON.stringify(msgPayload),
  });

  if (!response.ok) {
    let parsed = null;
    try { parsed = JSON.parse(await response.text()); } catch {}
    if (response.status === 429 && parsed?.wait_seconds) {
      throw new Error(`Aguarde ${parsed.wait_seconds}s antes de enviar novamente`);
    }
    throw new Error(parsed?.message || `HTTP ${response.status}`);
  }
  return true;
}

// ========== MAIN INITIALIZATION ==========

document.addEventListener('DOMContentLoaded', async () => {
  const activateBtn = document.getElementById('activateBtn');
  const licenseInput = document.getElementById('licenseKey');
  const licenseStatus = document.getElementById('licenseStatus');
  const whatsappSupport = document.getElementById('whatsappSupport');

  // Watermark FAB — sends watermark-removal command directly (no iframe round-trip)
  const watermarkFab = document.getElementById('watermarkFab');
  const watermarkFabLabel = document.getElementById('watermarkFabLabel');
  if (watermarkFab) {
    watermarkFab.addEventListener('click', async () => {
      if (watermarkFab.disabled) return;
      const originalLabel = watermarkFabLabel?.textContent;
      watermarkFab.disabled = true;
      if (watermarkFabLabel) watermarkFabLabel.textContent = 'Enviando...';
      try {
        const cmd = "Adicione esse código no final do código do index.css:\n\n#lovable-badge {\n  display: none !important;\n}";
        await sendDirectLovableMessage(cmd);
        if (watermarkFabLabel) watermarkFabLabel.textContent = 'Enviado ✓';
        showToast("Comando enviado! A marca d'água será removida.", 'success');
      } catch (err) {
        if (watermarkFabLabel) watermarkFabLabel.textContent = originalLabel || "Tirar marca d'água";
        showToast(err?.message || 'Erro ao enviar comando', 'error');
      } finally {
        setTimeout(() => {
          watermarkFab.disabled = false;
          if (watermarkFabLabel) watermarkFabLabel.textContent = originalLabel || "Tirar marca d'água";
        }, 2500);
      }
    });
  }

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
