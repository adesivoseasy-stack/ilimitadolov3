// ILOV Token Bridge - injeta o hook no page world e replica o token capturado
// para chrome.storage.local nas mesmas chaves que o sidepanel ja le.
(() => {
  if (window.__ILOV_TOKEN_BRIDGE__) return;
  window.__ILOV_TOKEN_BRIDGE__ = true;

  const MESSAGE_SOURCE = "ILOV_LOVABLE_TOKEN_HOOK";
  const MESSAGE_TYPE = "ILOV_LOVABLE_TOKEN_FROM_PAGE";

  // 1) Injeta o hook no contexto da pagina (precisa ser <script src>
  //    pra rodar fora do isolated world e poder envelopar window.fetch / XHR).
  try {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("ilov-token-hook.js");
    script.async = false;
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);
  } catch (err) {
    console.warn("[ILOV] falha ao injetar token hook:", err);
  }

  // 2) Escuta mensagens do hook e grava no storage da extensao.
  let lastToken = null;
  let lastTs = 0;

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.source !== MESSAGE_SOURCE || data.type !== MESSAGE_TYPE) return;

    const token = typeof data.token === "string" ? data.token.trim() : "";
    const gitSha = typeof data.clientGitSha === "string" ? data.clientGitSha.trim() : "";

    if (!token) return;

    // throttle: nao escrever o mesmo token toda hora
    const now = Date.now();
    if (token === lastToken && now - lastTs < 5000) return;
    lastToken = token;
    lastTs = now;

    const bearer = token.toLowerCase().startsWith("bearer ") ? token : `Bearer ${token}`;
    const payload = {
      lovable_api_token: bearer,
      lovable_api_token_ts: now,
      lovable_token: token,
    };
    if (gitSha) payload.lovable_git_sha = gitSha;

    try {
      chrome.storage.local.set(payload);
    } catch {}

    try {
      chrome.runtime.sendMessage({
        action: "tokenCaptured",
        token: bearer,
        gitSha: gitSha || undefined,
        source: "ilov-hook",
      }).catch(() => {});
    } catch {}
  }, false);
})();