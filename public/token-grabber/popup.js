function setStatus(msg, type) {
  const el = document.getElementById('status');
  el.textContent = msg;
  el.className = 'status ' + type;
}

function safeJsonParse(value) {
  if (typeof value !== 'string') return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function decodeCookieValue(value) {
  if (typeof value !== 'string') return value;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizeCandidate(candidate, source) {
  if (!candidate) return null;

  const accessToken = candidate.access_token || candidate.accessToken || candidate.token || candidate.jwt || null;
  const refreshToken = candidate.refresh_token || candidate.refreshToken || null;
  const expiresAt = candidate.expires_at || candidate.expirationTime || candidate.expiresAt || null;
  const user = candidate.user?.email || candidate.email || candidate.displayName || candidate.user || 'unknown';

  if (!accessToken && !refreshToken) return null;

  return {
    key: candidate.key || source,
    type: candidate.type || source,
    source,
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: expiresAt,
    user,
  };
}

function extractCandidates(value, source, key, found = []) {
  if (!value) return found;

  const push = (candidate) => {
    const normalized = normalizeCandidate({ ...candidate, key }, source);
    if (normalized) found.push(normalized);
  };

  if (typeof value === 'string') {
    const parsed = safeJsonParse(value);
    if (parsed) extractCandidates(parsed, source, key, found);
    return found;
  }

  if (Array.isArray(value)) {
    for (const item of value) extractCandidates(item, source, key, found);
    return found;
  }

  if (typeof value !== 'object') return found;

  if (value.stsTokenManager?.accessToken || value.stsTokenManager?.refreshToken) {
    push({
      type: 'firebase',
      access_token: value.stsTokenManager.accessToken || null,
      refresh_token: value.stsTokenManager.refreshToken || null,
      expires_at: value.stsTokenManager.expirationTime || null,
      user: value.email || value.displayName || value.user?.email || 'unknown',
    });
  }

  if (value.access_token || value.refresh_token) {
    push({
      type: 'session',
      access_token: value.access_token || null,
      refresh_token: value.refresh_token || null,
      expires_at: value.expires_at ? value.expires_at * 1000 : value.expires_at,
      user: value.user?.email || value.email || value.user_metadata?.email || 'unknown',
    });
  }

  if (value.accessToken || value.refreshToken) {
    push({
      type: 'generic',
      access_token: value.accessToken || null,
      refresh_token: value.refreshToken || null,
      expires_at: value.expirationTime || value.expiresAt || null,
      user: value.email || value.user?.email || 'unknown',
    });
  }

  return found;
}

async function getCookieCandidates() {
  const cookies = await chrome.cookies.getAll({});
  const relevantCookies = cookies.filter((cookie) => {
    const domain = cookie.domain || '';
    return domain.includes('lovable.dev') || domain.includes('lovableproject.com') || domain.includes('supabase.co');
  });

  const found = [];

  for (const cookie of relevantCookies) {
    const rawValue = decodeCookieValue(cookie.value);

    if (cookie.name === 'sb-api-auth-token' || cookie.name.includes('auth-token') || cookie.name.includes('supabase')) {
      const parsed = safeJsonParse(rawValue);
      if (parsed) extractCandidates(parsed, 'cookie', `${cookie.domain}:${cookie.name}`, found);
    }
  }

  return { cookies: relevantCookies, found };
}

async function getCapturedApiToken() {
  const stored = await chrome.storage.local.get(['lovable_api_token', 'lovable_api_token_ts']);
  if (!stored.lovable_api_token) return null;

  return {
    key: 'background:webRequest',
    type: 'api-header',
    source: 'background',
    access_token: stored.lovable_api_token,
    refresh_token: null,
    expires_at: null,
    user: 'capturado via request header',
    captured_at: stored.lovable_api_token_ts || null,
  };
}

function dedupeTokens(tokens) {
  const seen = new Set();
  return tokens.filter((token) => {
    const id = [token.access_token, token.refresh_token, token.key].join('|');
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function rankToken(token) {
  let score = 0;
  if (token.refresh_token) score += 100;
  if (token.access_token) score += 50;
  if (token.type === 'firebase') score += 25;
  if (token.source === 'cookie') score += 20;
  if (token.source === 'indexeddb') score += 15;
  if (token.source === 'background') score += 5;
  return score;
}

async function captureTokens() {
  const btn = document.getElementById('captureBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Capturando...';
  setStatus('Buscando tokens em cookies, storage e IndexedDB...', 'info');
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      setStatus('❌ Nenhuma aba ativa encontrada.', 'error');
      btn.disabled = false;
      btn.textContent = '⚡ Capturar Tokens';
      return;
    }

    setStatus('Injetando script na aba: ' + (tab.url || 'unknown'), 'info');

    const [cookieData, interceptedToken] = await Promise.all([
      getCookieCandidates(),
      getCapturedApiToken(),
    ]);

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: async () => {
        const found = [];
        const debug = [];

        const safeJsonParse = (value) => {
          if (typeof value !== 'string') return null;
          try {
            return JSON.parse(value);
          } catch {
            return null;
          }
        };

        const pushToken = (candidate) => {
          if (!candidate || (!candidate.access_token && !candidate.refresh_token)) return;
          found.push(candidate);
        };

        const walkValue = (value, meta, depth = 0) => {
          if (depth > 5 || value == null) return;

          if (typeof value === 'string') {
            const parsed = safeJsonParse(value);
            if (parsed) walkValue(parsed, meta, depth + 1);
            return;
          }

          if (Array.isArray(value)) {
            value.forEach((item) => walkValue(item, meta, depth + 1));
            return;
          }

          if (typeof value !== 'object') return;

          if (value.stsTokenManager?.accessToken || value.stsTokenManager?.refreshToken) {
            pushToken({
              key: meta.key,
              type: 'firebase',
              source: meta.source,
              access_token: value.stsTokenManager.accessToken || null,
              refresh_token: value.stsTokenManager.refreshToken || null,
              expires_at: value.stsTokenManager.expirationTime || null,
              user: value.email || value.displayName || value.user?.email || 'unknown',
            });
          }

          if (value.access_token || value.refresh_token) {
            pushToken({
              key: meta.key,
              type: 'session',
              source: meta.source,
              access_token: value.access_token || null,
              refresh_token: value.refresh_token || null,
              expires_at: value.expires_at ? value.expires_at * 1000 : value.expires_at,
              user: value.user?.email || value.email || value.user_metadata?.email || 'unknown',
            });
          }

          if (value.accessToken || value.refreshToken) {
            pushToken({
              key: meta.key,
              type: 'generic',
              source: meta.source,
              access_token: value.accessToken || null,
              refresh_token: value.refreshToken || null,
              expires_at: value.expirationTime || value.expiresAt || null,
              user: value.email || value.user?.email || 'unknown',
            });
          }

          for (const [childKey, childValue] of Object.entries(value)) {
            if (typeof childValue === 'object' || typeof childValue === 'string') {
              walkValue(childValue, { ...meta, key: `${meta.key}.${childKey}` }, depth + 1);
            }
          }
        };

        const scanStorage = (storage, source) => {
          try {
            for (let i = 0; i < storage.length; i++) {
              const key = storage.key(i);
              if (!key) continue;
              const raw = storage.getItem(key);
              walkValue(raw, { source, key });
            }
            debug.push(`${source}: ${storage.length} keys`);
          } catch (error) {
            debug.push(`${source}: erro ${error.message}`);
          }
        };

        const readAllFromStore = (db, storeName) => new Promise((resolve) => {
          try {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => resolve([]);
          } catch {
            resolve([]);
          }
        });

        const scanIndexedDb = async () => {
          if (!indexedDB.databases) {
            debug.push('indexeddb: API databases() indisponível');
            return;
          }

          try {
            const dbs = await indexedDB.databases();
            debug.push(`indexeddb: ${dbs.length} dbs`);

            for (const dbInfo of dbs) {
              if (!dbInfo.name) continue;

              await new Promise((resolve) => {
                const openRequest = indexedDB.open(dbInfo.name);

                openRequest.onsuccess = async () => {
                  const db = openRequest.result;
                  const stores = Array.from(db.objectStoreNames || []);
                  debug.push(`db ${dbInfo.name}: ${stores.length} stores`);

                  for (const storeName of stores) {
                    const rows = await readAllFromStore(db, storeName);
                    rows.forEach((row, index) => {
                      walkValue(row, { source: 'indexeddb', key: `${dbInfo.name}.${storeName}[${index}]` });
                    });
                  }

                  db.close();
                  resolve();
                };

                openRequest.onerror = () => resolve();
                openRequest.onblocked = () => resolve();
              });
            }
          } catch (error) {
            debug.push(`indexeddb: erro ${error.message}`);
          }
        };

        try {
          scanStorage(localStorage, 'localStorage');
          scanStorage(sessionStorage, 'sessionStorage');
          await scanIndexedDb();
        } catch (e) {
          found.push({ error: e.message });
        }
        
        return {
          tokens: found,
          url: location.href,
          keyCount: localStorage.length,
          sessionKeyCount: sessionStorage.length,
          debug,
        };
      }
    });

    // Collect results from all frames
    let allTokens = [...cookieData.found];
    let debugInfo = [];
    
    if (interceptedToken) {
      allTokens.push(interceptedToken);
      debugInfo.push('Header capturado em background: sim');
    } else {
      debugInfo.push('Header capturado em background: nao');
    }

    debugInfo.push(`Cookies relevantes: ${cookieData.cookies.length}`);
    
    for (const result of (results || [])) {
      if (result?.result) {
        debugInfo.push(`Frame: ${result.result.url} (local=${result.result.keyCount}, session=${result.result.sessionKeyCount})`);
        if (Array.isArray(result.result.debug)) {
          debugInfo.push(...result.result.debug.map((line) => `  - ${line}`));
        }
        if (result.result.tokens?.length > 0) {
          allTokens.push(...result.result.tokens);
        }
      }
    }

    document.getElementById('debugInfo').textContent = debugInfo.join('\n') || 'Nenhum frame encontrado';

    allTokens = dedupeTokens(allTokens).sort((a, b) => rankToken(b) - rankToken(a));

    if (allTokens.length === 0) {
      setStatus('❌ Nenhum token encontrado. Faça login no lovable.dev, recarregue a página e abra o capturador novamente. Se quiser pegar manualmente, procure o cookie sb-api-auth-token ou faça uma ação que gere requisição para api.lovable.dev.', 'error');
      btn.disabled = false;
      btn.textContent = '⚡ Capturar Tokens';
      return;
    }

    // Prefer Firebase tokens
    const best = allTokens.find(t => t.type === 'firebase') || allTokens[0];
    
    if (best.error) {
      setStatus('❌ Erro no script: ' + best.error, 'error');
      btn.disabled = false;
      btn.textContent = '⚡ Capturar Tokens';
      return;
    }
    
    document.getElementById('jwtToken').value = best.access_token || '(não encontrado)';
    document.getElementById('refreshToken').value = best.refresh_token || '(não encontrado)';
    document.getElementById('results').style.display = 'block';
    
    const expiresInfo = best.expires_at ? ` | Expira: ${new Date(best.expires_at).toLocaleString()}` : '';
    const refreshInfo = best.refresh_token ? 'com refresh token' : 'sem refresh token';
    setStatus(`✅ Tokens capturados! (${best.type}/${best.source}) ${refreshInfo}\nConta: ${best.user}${expiresInfo}\nChave: ${best.key}`, 'success');
    
  } catch (err) {
    setStatus('❌ Erro: ' + err.message + '\n\nDica: Certifique-se de estar em uma página do lovable.dev', 'error');
  }
  
  btn.disabled = false;
  btn.textContent = '⚡ Capturar Tokens';
}

function copyField(id, btn) {
  const val = document.getElementById(id).value;
  navigator.clipboard.writeText(val).then(() => {
    btn.textContent = '✅ Copiado!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = 'Copiar';
      btn.classList.remove('copied');
    }, 2000);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('captureBtn').addEventListener('click', captureTokens);
});
