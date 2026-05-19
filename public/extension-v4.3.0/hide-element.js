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

// ========== PUBLISH PROJECT HANDLER ==========
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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