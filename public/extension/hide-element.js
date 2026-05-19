// hide-element.js
console.log("🔥 Ilimitado Lov: Sniper iniciado...");

// CSS injection to hide fix elements
const style = document.createElement('style');
style.textContent = `
  [class*="security-banner"], 
  [class*="fix-banner"],
  [data-testid*="fix"],
  [class*="SecurityBanner"] {
    display: none !important;
    visibility: hidden !important;
    height: 0 !important;
    overflow: hidden !important;
  }
`;
document.head.appendChild(style);

const TEXTOS_ALVO = ["Fix all security issues", "Show more"];

function destruirElemento() {
    try {
        // Estratégia 1: XPath para cada texto alvo
        for (const texto of TEXTOS_ALVO) {
            const xpath = `//*[contains(text(), '${texto}')]`;
            const snapshot = document.evaluate(
                xpath, document, null, 
                XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null
            );

            for (let i = 0; i < snapshot.snapshotLength; i++) {
                let element = snapshot.snapshotItem(i);
                if (!element) continue;
                
                // Sobe até o container da mensagem inteira (balão do chat)
                let alvo = element.closest('[class*="overflow-wrap"]') ||
                           element.closest('[class*="special-message"]') ||
                           element.closest('[class*="message"]') ||
                           element.closest('[class*="chat-bubble"]') ||
                           element.closest('[class*="rounded"]');
                
                // Se não achou container, sobe 5 níveis
                if (!alvo || alvo === document.body) {
                    alvo = element;
                    for (let j = 0; j < 5; j++) {
                        if (alvo.parentElement && alvo.parentElement !== document.body) {
                            alvo = alvo.parentElement;
                        }
                    }
                }

                if (alvo && alvo.style.display !== 'none') {
                    console.log("🎯 ALVO DETECTADO E REMOVIDO:", alvo);
                    alvo.style.display = 'none';
                    alvo.style.visibility = 'hidden';
                    alvo.innerHTML = '';
                    alvo.remove();
                }
            }
        }

        // Estratégia 2: TreeWalker para pegar nós de texto
        const walker = document.createTreeWalker(
            document.body, NodeFilter.SHOW_TEXT, null
        );
        let node;
        while (node = walker.nextNode()) {
            if (node.textContent.includes('Fix all security issues')) {
                let alvo = node.parentElement;
                for (let j = 0; j < 6; j++) {
                    if (alvo.parentElement && alvo.parentElement !== document.body) {
                        alvo = alvo.parentElement;
                    }
                }
                if (alvo && alvo.style.display !== 'none') {
                    console.log("🎯 TreeWalker REMOVEU:", alvo);
                    alvo.style.display = 'none';
                    alvo.remove();
                }
            }
        }
    } catch (e) {
        // Silêncio é ouro
    }
}

// 1. Executa imediatamente
destruirElemento();

// 2. Executa repetidamente (ideal para Single Page Apps como o Lovable)
setInterval(destruirElemento, 200);

// 3. Monitora mudanças na página
const observer = new MutationObserver(() => destruirElemento());
observer.observe(document.body, { childList: true, subtree: true });

// ========== MONKEY-PATCH FETCH TO CAPTURE API TOKEN + INTERCEPT ==========
// Flag: when true, the next chat request will be captured and aborted (fake 202)
window.__ilimitado_intercept = false;

const originalFetchRef = window.fetch;
const _originalFetch = window.fetch.bind(window);
window.fetch = function(...args) {
  const [url, options] = args;
  const urlStr = typeof url === 'string' ? url : (url?.url || '');
  
  // Intercept requests to api.lovable.dev/projects/*/chat
  if (urlStr.includes('api.lovable.dev') && urlStr.includes('/chat') && options?.headers) {
    try {
      let authValue = null;
      let gitSha = null;
      
      if (options.headers instanceof Headers) {
        authValue = options.headers.get('authorization') || options.headers.get('Authorization');
        gitSha = options.headers.get('x-client-git-sha') || options.headers.get('X-Client-Git-Sha');
      } else if (typeof options.headers === 'object') {
        for (const [key, val] of Object.entries(options.headers)) {
          if (key.toLowerCase() === 'authorization') authValue = val;
          if (key.toLowerCase() === 'x-client-git-sha') gitSha = val;
        }
      }
      
      if (authValue) {
        const data = { lovable_api_token: authValue, lovable_api_token_ts: Date.now() };
        if (gitSha) data.lovable_git_sha = gitSha;
        chrome.storage?.local?.set(data).catch(() => {});
        console.log('[hide-element] 🔑 Captured API token via fetch intercept');
        
        // If intercept mode is active, abort the real request and return fake 202
        if (window.__ilimitado_intercept) {
          window.__ilimitado_intercept = false;
          console.log('[hide-element] 🛑 Intercepted & aborted chat request (token captured)');
          
          // Notify background/sidepanel that token was captured
          chrome.runtime.sendMessage({ 
            action: 'tokenCaptured', 
            token: authValue, 
            gitSha: gitSha 
          }).catch(() => {});
          
          // Return fake 202 empty response (mimics real Lovable API success)
          return Promise.resolve(new Response('', { 
            status: 202, 
            statusText: 'Accepted',
            headers: { 'content-type': 'application/json' }
          }));
        }
      }
    } catch (e) { /* silent */ }
  }
  
  // Also capture token from non-chat endpoints (like deployments)
  if (urlStr.includes('api.lovable.dev') && !urlStr.includes('/chat') && options?.headers) {
    try {
      let authValue = null;
      if (options.headers instanceof Headers) {
        authValue = options.headers.get('authorization') || options.headers.get('Authorization');
      } else if (typeof options.headers === 'object') {
        for (const [key, val] of Object.entries(options.headers)) {
          if (key.toLowerCase() === 'authorization') authValue = val;
        }
      }
      if (authValue) {
        chrome.storage?.local?.set({ lovable_api_token: authValue, lovable_api_token_ts: Date.now() }).catch(() => {});
      }
    } catch (e) { /* silent */ }
  }
  
  return _originalFetch(...args);
};

// ========== INJECT MESSAGE INTO CHAT & TRIGGER SUBMISSION ==========
function injectMessageAndSubmit(dummyMessage) {
  try {
    // Find the chat textarea/input
    const textarea = document.querySelector('textarea[placeholder]') || 
                     document.querySelector('[contenteditable="true"]') ||
                     document.querySelector('textarea');
    
    if (!textarea) {
      console.error('[hide-element] ❌ Chat textarea not found');
      return false;
    }

    // Set intercept flag BEFORE submitting
    window.__ilimitado_intercept = true;

    // Set value and dispatch input events
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value'
    )?.set;
    
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(textarea, dummyMessage);
    } else {
      textarea.value = dummyMessage;
    }
    
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));

    // Small delay then trigger submit via Enter key
    setTimeout(() => {
      textarea.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter', code: 'Enter', keyCode: 13, which: 13,
        bubbles: true, cancelable: true
      }));
      
      console.log('[hide-element] ✅ Injected dummy message and triggered submit');
      
      // Safety: reset flag after 3s if not consumed
      setTimeout(() => { window.__ilimitado_intercept = false; }, 3000);
    }, 100);

    return true;
  } catch (e) {
    console.error('[hide-element] ❌ Error injecting message:', e);
    window.__ilimitado_intercept = false;
    return false;
  }
}

// ========== PAGE-CONTEXT REVERT BRIDGE ==========
let revertRequestSeq = 0;
const revertCallbacks = new Map();

function ensurePageRevertBridge() {
  if (window.__ilimitadoPageRevertBridgeInstalled) return;
  window.__ilimitadoPageRevertBridgeInstalled = true;

  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.source !== 'ilimitado-page-revert-response' || !data.requestId) return;

    const callback = revertCallbacks.get(data.requestId);
    if (!callback) return;

    revertCallbacks.delete(data.requestId);
    callback(data.payload || { success: false, error: 'Sem resposta do bridge' });
  });

  const script = document.createElement('script');
  script.textContent = `
    (() => {
      if (window.__ilimitadoPageRevertExecutorInstalled) return;
      window.__ilimitadoPageRevertExecutorInstalled = true;

      window.addEventListener('message', async (event) => {
        if (event.source !== window) return;
        const data = event.data;
        if (!data || data.source !== 'ilimitado-content-revert-request') return;

        const { requestId, projectId, messageId, restoreDatabase, gitSha } = data;
        try {
          const headers = { 'Content-Type': 'application/json' };
          if (gitSha) headers['x-client-git-sha'] = gitSha;

          const resp = await fetch('https://api.lovable.dev/projects/' + projectId + '/revert-to-edit', {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify({
              message_id: messageId,
              restore_database: !!restoreDatabase,
            }),
          });

          const text = await resp.text();
          let parsed = null;
          try { parsed = text ? JSON.parse(text) : null; } catch (_) {}

          window.postMessage({
            source: 'ilimitado-page-revert-response',
            requestId,
            payload: resp.ok
              ? { success: true, data: parsed || { raw: text } }
              : { success: false, error: 'HTTP ' + resp.status + ': ' + text.substring(0, 200) }
          }, '*');
        } catch (error) {
          window.postMessage({
            source: 'ilimitado-page-revert-response',
            requestId,
            payload: { success: false, error: (error && error.message) || 'Erro desconhecido' }
          }, '*');
        }
      });
    })();
  `;

  (document.documentElement || document.head || document.body).appendChild(script);
  script.remove();
}

function revertViaPageContext({ projectId, messageId, restoreDatabase, gitSha }) {
  ensurePageRevertBridge();

  return new Promise((resolve) => {
    const requestId = `revert_${Date.now()}_${++revertRequestSeq}`;
    const timeoutId = setTimeout(() => {
      revertCallbacks.delete(requestId);
      resolve({ success: false, error: 'Timeout ao executar revert na página' });
    }, 15000);

    revertCallbacks.set(requestId, (payload) => {
      clearTimeout(timeoutId);
      resolve(payload);
    });

    window.postMessage({
      source: 'ilimitado-content-revert-request',
      requestId,
      projectId,
      messageId,
      restoreDatabase,
      gitSha,
    }, '*');
  });
}

// ========== MESSAGE LISTENERS ==========
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Token capture via inject
    if (request.action === 'injectAndCapture') {
      console.log('[hide-element] 📨 Received injectAndCapture command');
      const success = injectMessageAndSubmit(request.message || '.');
      sendResponse({ success });
      return true;
    }

    // Revert to edit (runs in lovable.dev context with cookies)
    if (request.action === 'revertViaContent') {
      console.log('[hide-element] ⏪ Reverting via page context with session cookies');
      const { projectId, messageId, restoreDatabase } = request;
      
      const doRevert = async () => {
        try {
          const result = await revertViaPageContext({
            projectId,
            messageId,
            restoreDatabase: restoreDatabase || false,
            gitSha: request.gitSha || null,
          });
          console.log('[hide-element] ⏪ Revert result from page context:', result);
          sendResponse(result);
        } catch (err) {
          console.error('[hide-element] ⏪ Revert error:', err);
          sendResponse({ success: false, error: err.message });
        }
      };
      
      doRevert();
      return true;
    }

    // Publish project
    if (request.action === 'publishProject') {
        console.log('🚀 Publicando projeto via API:', request.projectId);
        
        const publishProject = async () => {
            try {
                const headers = { 'Content-Type': 'application/json' };
                if (request.authToken) {
                    headers['Authorization'] = `Bearer ${request.authToken}`;
                }
                
                const resp = await _originalFetch(
                    `https://api.lovable.dev/projects/${request.projectId}/deployments?async=true`,
                    {
                        method: 'POST',
                        headers: headers,
                        credentials: 'include',
                        body: '{}'
                    }
                );
                
                if (resp.ok) {
                    const data = await resp.json();
                    console.log('✅ Deploy iniciado:', data);
                    sendResponse({ success: true, deploymentId: data.deployment_id, url: data.url });
                } else {
                    const errText = await resp.text();
                    console.error('❌ Erro API:', resp.status, errText);
                    sendResponse({ success: false, error: `API erro: ${resp.status} - ${errText}` });
                }
            } catch (err) {
                console.error('❌ Erro ao publicar:', err);
                sendResponse({ success: false, error: err.message });
            }
        };
        
        publishProject();
        return true;
    }
});