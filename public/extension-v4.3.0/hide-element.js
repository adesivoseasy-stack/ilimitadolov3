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

// ============= QUICK SUGGESTIONS CAPTURE =============
const SUGGESTION_VERBS = /^(Criar|Cria|Crie|Personalizar|Personaliza|Adicionar|Adiciona|Adicione|Configurar|Configura|Configure|Conectar|Conecta|Conecte|Melhorar|Melhora|Otimizar|Otimiza|Construir|Constr[óo]i|Gerar|Gera|Implementar|Implementa|Refatorar|Refatora|Corrigir|Corrige|Ajustar|Ajusta|Mudar|Muda|Trocar|Troca|Remover|Remove|Instalar|Instala|Create|Add|Build|Make|Configure|Connect|Improve|Optimize|Generate|Implement|Refactor|Fix|Adjust|Change|Switch|Remove|Install|Set up|Setup|Personalize|Customize|Design)\b/i;
let __lastSuggestionsSig = '';
function captureQuickSuggestions() {
  try {
    const buttons = document.querySelectorAll('button');
    const found = [];
    const seen = new Set();
    for (const btn of buttons) {
      if (!btn || btn.disabled) continue;
      // Skip buttons inside the chat textarea form (send, attach, etc.)
      if (btn.closest('form')?.querySelector('textarea')) {
        // ok, may include suggestions near textarea; check further
      }
      // Skip icon-only buttons (no text)
      const text = (btn.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text || text.length < 4 || text.length > 60) continue;
      // Must start with an action verb
      if (!SUGGESTION_VERBS.test(text)) continue;
      // Skip obvious chrome: "Enable notifications", buttons with role=tab
      if (btn.getAttribute('role') === 'tab') continue;
      if (/notification|enable|fix all|show more|publish|deploy|github|connect to/i.test(text)) continue;
      // Visibility check
      const r = btn.getBoundingClientRect();
      if (r.width < 30 || r.height < 18) continue;
      const style = getComputedStyle(btn);
      if (style.visibility === 'hidden' || style.display === 'none' || style.opacity === '0') continue;
      if (seen.has(text)) continue;
      seen.add(text);
      found.push({ text });
      if (found.length >= 12) break;
    }
    const sig = found.map(f => f.text).join('|');
    if (sig === __lastSuggestionsSig) return;
    __lastSuggestionsSig = sig;
    chrome.runtime?.sendMessage({ action: 'suggestionsCaptured', items: found }).catch(() => {});
  } catch (_) {}
}
setInterval(captureQuickSuggestions, 1500);

const originalFetch = window.fetch.bind(window);
window.fetch = function(...args) {
    const [url, options] = args;
    const urlStr = typeof url === 'string' ? url : (url?.url || '');

    if (urlStr.includes('api.lovable.dev') && options?.headers) {
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
                chrome.runtime?.sendMessage({ action: 'tokenCaptured', token: authValue, gitSha }).catch(() => {});
                console.log('[hide-element] 🔑 Captured Lovable API token via fetch intercept');
            }
        } catch (e) {
            console.warn('[hide-element] Falha ao capturar token:', e);
        }
    }

    return originalFetch(...args);
};

async function injectMessageAndSubmit(messageText) {
    try {
        const textarea = document.querySelector('textarea[placeholder]') ||
                         document.querySelector('textarea') ||
                         document.querySelector('[contenteditable="true"][role="textbox"]') ||
                         document.querySelector('[contenteditable="true"]');

        if (!textarea) {
            console.error('[hide-element] ❌ Campo do chat não encontrado');
            return { success: false, error: 'Campo do chat não encontrado' };
        }

        textarea.focus();

        if (textarea instanceof HTMLTextAreaElement || textarea instanceof HTMLInputElement) {
            const proto = textarea instanceof HTMLTextAreaElement
                ? window.HTMLTextAreaElement.prototype
                : window.HTMLInputElement.prototype;
            const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
            if (nativeSetter) nativeSetter.call(textarea, messageText);
            else textarea.value = messageText;
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            textarea.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
            textarea.textContent = messageText;
            textarea.dispatchEvent(new InputEvent('input', {
                bubbles: true,
                cancelable: true,
                data: messageText,
                inputType: 'insertText'
            }));
        }

        const sendSelectors = [
            'button[data-testid="chat-send-button"]',
            'button[aria-label*="Send"]',
            'button[aria-label*="Enviar"]',
            'button[type="submit"]'
        ];

        const clickSend = () => {
            const sendButton = sendSelectors
                .map((selector) => document.querySelector(selector))
                .find((button) => button && !button.disabled);

            if (sendButton) {
                sendButton.click();
                console.log('[hide-element] ✅ Mensagem enviada pelo botão do chat');
                return { success: true };
            }

            textarea.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true,
                cancelable: true
            }));
            textarea.dispatchEvent(new KeyboardEvent('keyup', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true,
                cancelable: true
            }));

            console.log('[hide-element] ✅ Mensagem enviada via Enter');
            return { success: true };
        };

        return await new Promise((resolve) => {
            requestAnimationFrame(() => {
                setTimeout(() => resolve(clickSend()), 80);
            });
        });
    } catch (e) {
        console.error('[hide-element] ❌ Erro ao injetar mensagem:', e);
        return { success: false, error: e.message || 'Erro ao enviar mensagem' };
    }
}

// ========== PUBLISH PROJECT HANDLER ==========
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'injectChatMessage') {
        injectMessageAndSubmit(request.message || '')
            .then((result) => sendResponse(result))
            .catch((err) => sendResponse({ success: false, error: err?.message || 'Falha ao enviar no chat' }));
        return true;
    }

    if (request.action === 'publishProject') {
        console.log('🚀 Publicando projeto via API:', request.projectId);
        
        const publishProject = async () => {
            try {
                const headers = { 'Content-Type': 'application/json' };
                if (request.authToken) {
                    headers['Authorization'] = `Bearer ${request.authToken}`;
                }
                
                const resp = await originalFetch.call(window, 
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