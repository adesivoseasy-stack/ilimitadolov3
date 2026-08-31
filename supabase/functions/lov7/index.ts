import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResp(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

const _B32 = "0123456789abcdefghjkmnpqrstvwxyz";

function lovId(prefix: string): string {
  const chars = '0123456789abcdefghjkmnpqrstvwxyz'
  let id = prefix + '01'
  for (let i = 0; i < 24; i++) {
    id += chars[Math.floor(Math.random() * chars.length)]
  }
  return id
}

const _licCache = new Map<string, number>();
const LIC_TTL_MS = 60 * 1000;

const _xorDec = (e: number[], k: number) => e.map((c) => String.fromCharCode(c ^ k)).join("");

const _LICENSE_INJECT_URL_OLD = "https://ccqesqhkqbnnwmowrghj.supabase.co/functions/v1/inject-config";
const _LICENSE_ANON_KEY_ENC_OLD: [number[], number] = [[128,156,175,141,135,162,134,140,170,140,175,172,176,159,172,212,171,140,172,150,172,139,183,208,134,166,172,211,172,142,149,189,179,166,175,220,203,128,156,175,149,134,214,168,140,170,140,175,159,129,189,167,141,188,136,163,159,191,182,172,150,172,139,175,137,191,140,172,211,172,136,171,143,134,178,179,159,134,178,141,151,134,178,175,144,135,139,129,145,135,214,129,156,191,215,141,148,172,140,146,140,134,136,220,150,191,182,172,211,172,136,163,144,135,215,209,140,169,166,175,149,188,189,180,140,170,143,160,214,170,161,176,209,171,159,188,213,171,161,172,150,172,136,179,209,134,166,172,211,168,143,160,146,168,177,180,212,168,143,180,213,168,139,213,203,169,213,141,209,186,220,156,176,129,156,148,164,169,160,160,159,172,136,141,130,160,178,132,164,180,213,182,148,177,146,150,211,189,210,129,159,188,146,149,211,189,212,130], 229];

const _LICENSE_INJECT_URL_LOVA4 = "https://ccqesqhkqbnnwmowrghj.supabase.co/functions/v1/inject-config";
const _LICENSE_ANON_KEY_ENC_LOVA4: [number[], number] = [[128,156,175,141,135,162,134,140,170,140,175,172,176,159,172,212,171,140,172,150,172,139,183,208,134,166,172,211,172,142,149,189,179,166,175,220,203,128,156,175,149,134,214,168,140,170,140,175,159,129,189,167,141,188,136,163,159,191,182,172,150,172,139,175,137,191,140,172,211,172,136,171,143,134,178,179,159,134,178,141,151,134,178,175,144,135,139,129,145,135,214,129,156,191,215,141,148,172,140,146,140,134,136,220,150,191,182,172,211,172,136,163,144,135,215,209,140,169,166,175,149,188,189,180,140,170,143,160,214,170,161,176,209,171,159,188,213,171,161,172,150,172,136,179,209,134,166,172,211,168,143,160,146,168,177,180,212,168,143,180,213,168,139,213,203,169,213,141,209,186,220,156,176,129,156,148,164,169,160,160,159,172,136,141,130,160,178,132,164,180,213,182,148,177,146,150,211,189,210,129,159,188,146,149,211,189,212,130], 229];

function getLicenseInjectUrl(source: string): string {
  if (source === "lova4") return (Deno.env.get("LICENSE_INJECT_URL_LOVA4") || _LICENSE_INJECT_URL_LOVA4).trim();
  return (Deno.env.get("LICENSE_INJECT_URL") || _LICENSE_INJECT_URL_OLD).trim();
}

function getLicenseAnonKey(source: string): string {
  if (source === "lova4") {
    const ev = (Deno.env.get("LICENSE_INJECT_ANON_KEY_LOVA4") || "").trim();
    if (ev) return ev;
    return _xorDec(_LICENSE_ANON_KEY_ENC_LOVA4[0], _LICENSE_ANON_KEY_ENC_LOVA4[1]);
  }
  const fromEnv = (Deno.env.get("LICENSE_INJECT_ANON_KEY") || "").trim();
  if (fromEnv) return fromEnv;
  return _xorDec(_LICENSE_ANON_KEY_ENC_OLD[0], _LICENSE_ANON_KEY_ENC_OLD[1]);
}

async function validarLicenca(
  licenseKey: string, email: string, hwid: string, source: string,
): Promise<{ ok: boolean; error?: string; reason?: string }> {
  if (!licenseKey) return { ok: false, reason: "invalid", error: "" };

  const cacheKey = (source || "old") + "|" + licenseKey;
  const cachedAt = _licCache.get(cacheKey);
  if (cachedAt && (Date.now() - cachedAt) < LIC_TTL_MS) return { ok: true };

  const injectUrl = getLicenseInjectUrl(source);
  const ANON_KEY  = getLicenseAnonKey(source);
  if (!injectUrl || !ANON_KEY) {
    console.warn("[lov7] URL/key missing");
    return { ok: true };
  }

  const reqBody: Record<string, unknown> = { key: licenseKey };
  if (email) reqBody.email = email;

  let resp: Response;
  try {
    resp = await fetch(injectUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
      body: JSON.stringify(reqBody),
    });
  } catch (e) {
    console.warn("[lov7] fetch fail (fail-open):", String(e));
    return { ok: true };
  }

  let data: Record<string, unknown> = {};
  try { data = await resp.json(); } catch (_) {}

  if (resp.ok && data && data.config) {
    _licCache.set(cacheKey, Date.now());
    return { ok: true };
  }
  if (resp.status === 429 || resp.status >= 500) {
    console.warn("[lov7] validador transitório (fail-open):", resp.status);
    return { ok: true };
  }

  const reason = String((data && (data.reason as string)) || "").toLowerCase();
  const msg = String((data && (data.error as string)) || "Licença inválida ou expirada.");
  const isDeviceMismatch =
    reason === "device_mismatch" || reason === "post_reset_guard" ||
    /outro dispositivo|dispositivo|hwid|resetar|resetada recentemente/i.test(msg);
  if (isDeviceMismatch) return { ok: false, reason: "device_mismatch", error: msg };
  return { ok: false, reason: "invalid", error: msg };
}

// ─── Visual Edit helpers (mesma lógica do send-lovable-prompt) ───

function textOfSelectedElement(element: any): string {
  if (!element || typeof element !== 'object') return ''
  if (typeof element.textContent === 'string' && element.textContent.trim()) return element.textContent
  if (Array.isArray(element.textNodes)) {
    const text = element.textNodes
      .map((node: any) => typeof node?.content === 'string' ? node.content : '')
      .join('').trim()
    if (text) return text
  }
  if (typeof element.innerText === 'string' && element.innerText.trim()) return element.innerText
  return ''
}

function normalizeVisualEditReplacements(input: any, message: string, selectedElements: any[]): any[] {
  const selectedText = textOfSelectedElement(selectedElements[0])
  const anchor = (selectedText || message || '').trim() || ' '
  if (Array.isArray(input)) {
    const normalized = input.map((item: any, index: number) => {
      if (!item || typeof item !== 'object') return null
      const oldText = String(item.old_text ?? item.oldText ?? item.from ?? '').trim() || anchor
      return { old_text: oldText, new_text: oldText, selected_element_index: Number.isFinite(Number(item.selected_element_index ?? item.selectedElementIndex)) ? Number(item.selected_element_index ?? item.selectedElementIndex) : index }
    }).filter(Boolean)
    if (normalized.length > 0) return normalized
  }
  return [{ old_text: anchor, new_text: anchor, selected_element_index: 0 }]
}

function normalizeSelectedElements(input: any, message: string): any[] {
  if (Array.isArray(input) && input.length > 0) return input
  const fallbackText = message.trim()
  return [{
    filePath: '/src/routes/index.tsx', lineNumber: 1, col: 1,
    instanceId: 'extension', elementType: 'body', componentName: 'body', className: '',
    attrs: { src: '', placeholder: '', href: '', type: '', backgroundImage: '' },
    children: [],
    textContent: fallbackText,
    textNodes: [{ type: 'text', content: fallbackText, editable: true, index: 0 }],
  }]
}

function normalizeTextForIntent(input: string): string {
  return String(input || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

function isQuestionOnlyMessage(message: string, textReplacements: any, selectedElements: any[]): boolean {
  const text = normalizeTextForIntent(message)
  if (!text) return false
  if (Array.isArray(textReplacements) && textReplacements.some((item: any) => {
    if (!item || typeof item !== 'object') return false
    const oldText = String(item.old_text ?? item.oldText ?? '').trim()
    const newText = String(item.new_text ?? item.newText ?? '').trim()
    return !!newText && newText !== oldText
  })) return false
  if (Array.isArray(selectedElements) && selectedElements.some((item: any) => item?.requested_change || item?.new_text || item?.newText)) return false

  const capabilityQuestion = /\b(voce|voces|vc|vcs)\b.{0,24}\b(cria|criam|faz|fazem|desenvolve|desenvolvem|consegue|conseguem|pode|podem)\b/.test(text)
  const helpQuestion = /\b(pode|podem|consegue|conseguem)\s+(me\s+)?ajudar\b/.test(text)
  const questionWords = /^(oi|ola|olá|bom dia|boa tarde|boa noite)?[\s,!.]*(o que|oq|como|qual|quais|quanto|quantos|quando|onde|por que|porque|quem|voce|voces|vc|vcs)\b/.test(text)
  if (capabilityQuestion || helpQuestion || questionWords) return true

  const editIntent = /\b(crie|criar|cria|faça|faca|fazer|faz|altere|alterar|altera|mude|mudar|muda|troque|trocar|troca|edite|editar|edita|corrija|corrigir|corrige|arrume|arrumar|arruma|adicione|adicionar|adiciona|remova|remover|remove|implemente|implementar|implementa|coloque|colocar|coloca|substitua|substituir|substitui|gere|gerar|gera|monte|montar|monta|construa|construir|constroi|desenvolva|desenvolver|desenvolve)\b/.test(text)
  if (editIntent) return false
  return /\?/.test(message)
}

function buildVisualEditBridgeMessage(userMessage: string, questionOnly: boolean): string {
  const body = String(userMessage || '').trim()
  if (!body) return '📨 Enviado por Lovasiri'
  if (questionOnly) {
    return ['📨 Enviado por Lovasiri', '', 'MÉTODO: visual_edit. Use este envio apenas como transporte gratuito.', 'A mensagem do usuário é uma pergunta/conversa. Responda normalmente em português, direto no chat.', 'Não altere arquivos, não mude UI, não aplique text replacements e não diga que o conteúdo foi atualizado.', '', 'Pergunta do usuário:', body].join('\n')
  }
  return ['📨 Enviado por Lovasiri', '', 'MÉTODO: visual_edit. Interprete o pedido abaixo e faça apenas o que o usuário pediu explicitamente.', 'Se o texto abaixo for só pergunta/conversa, responda no chat e não altere arquivos.', '', body].join('\n')
}

// ─── Upload handler ───

async function handleUpload(
  token: string, projectId: string, body: Record<string, unknown>,
): Promise<Response> {
  if (!token || !projectId) return jsonResp({ ok: false, error: "token e projectId obrigatórios para upload" }, 400);
  const originalFileName = String(body.file_name || "file");
  const contentType = String(body.content_type || "application/octet-stream");
  const fileData = String(body.file_data || "");
  if (!fileData) return jsonResp({ ok: false, error: "file_data (base64) obrigatório" }, 400);

  let bytes: Uint8Array;
  try {
    const clean = fileData.replace(/^data:[^;]+;base64,/, '').replace(/\s/g, '');
    const bin = atob(clean);
    bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  } catch {
    return jsonResp({ ok: false, error: "file_data inválido (esperado Base64)" }, 400);
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
    "origin": "https://lovable.dev",
    "referer": "https://lovable.dev/",
  };
  const sid = String(body.browser_session_id || body.lovable_browser_session_id || "").trim();
  const sha = String(body.client_git_sha || body.lovable_git_sha || "").trim();
  if (sid) headers["x-browser-session-id"] = sid;
  if (sha) headers["x-client-git-sha"] = sha;

  const fileId = crypto.randomUUID();

  const upRes = await fetch("https://api.lovable.dev/files/generate-upload-url", {
    method: "POST", headers,
    body: JSON.stringify({ file_name: fileId, content_type: contentType, status: "uploading" }),
  });
  if (!upRes.ok) {
    const t = await upRes.text().catch(() => "");
    return jsonResp({ ok: false, error: `generate-upload-url ${upRes.status}: ${t.slice(0, 150)}` }, upRes.status);
  }
  const upData = await upRes.json();
  const signedUrl = upData.url || upData.signed_url || upData.signedUrl;
  const gcsHeaders = (upData.headers && typeof upData.headers === "object") ? upData.headers as Record<string, unknown> : {};
  if (!signedUrl) return jsonResp({ ok: false, error: "URL assinada não retornada pela Lovable" }, 502);

  const putHeaders: Record<string, string> = { "Content-Type": contentType };
  for (const [k, v] of Object.entries(gcsHeaders)) putHeaders[k] = String(v);
  const putRes = await fetch(signedUrl, { method: "PUT", headers: putHeaders, body: bytes });
  if (!putRes.ok) return jsonResp({ ok: false, error: `GCS PUT ${putRes.status}` }, 502);

  let downloadUrl: string | null = null;
  try {
    const dlRes = await fetch("https://api.lovable.dev/files/generate-download-url", {
      method: "POST", headers,
      body: JSON.stringify({ file_name: fileId }),
    });
    if (dlRes.ok) { const dl = await dlRes.json(); downloadUrl = dl.url || dl.download_url || null; }
  } catch (_) {}

  return jsonResp({ ok: true, file_id: fileId, file_name: originalFileName, mime_type: contentType, download_url: downloadUrl });
}

// ─── Main handler ───

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const body = await req.json();
    const action = String(body.action || "").trim();
    const licenseSource = String(body.license_source || "").trim();
    const token = String(body.token_lovable || body.token || "").replace(/^Bearer\s+/i, "").trim();
    const projectId = String(body.projeto_id || body.projectId || "");
    const message = String(body.mensagem || body.message || "");

    // ─── Upload action ───
    if (action === "upload") {
      const uKey = String(body.license_key || body.licenseKey || body.key || "").trim();
      const uLic = await validarLicenca(uKey, String(body.email || "").trim(), String(body.hwid || "").trim(), licenseSource);
      if (!uLic.ok) {
        if (uLic.reason === "device_mismatch") return jsonResp({ ok: false, error: `device_mismatch: ${uLic.error}`, logout: false }, 403);
        return jsonResp({ ok: false, error: `license_invalid: ${uLic.error}`, logout: true }, 403);
      }
      return await handleUpload(token, projectId, body);
    }

    // ─── Transform action ───
    if (action === "transform") {
      const tKey = String(body.license_key || body.licenseKey || body.key || "").trim();
      const tLic = await validarLicenca(tKey, String(body.email || "").trim(), String(body.hwid || "").trim(), licenseSource);
      if (!tLic.ok) {
        const tIsDm = tLic.reason === "device_mismatch";
        return jsonResp({ action: "block", error: `${tIsDm ? "device_mismatch" : "license_invalid"}: ${tLic.error}`, logout: !tIsDm });
      }
      const rawBody = (body.body && typeof body.body === "object") ? body.body as Record<string, unknown> : {};
      const normalizedSelected = normalizeSelectedElements(null, message);
      const normalizedReplacements = normalizeVisualEditReplacements(null, message, normalizedSelected);
      const modifiedBody: Record<string, unknown> = {
        contains_error: false, current_page: rawBody.current_page || "/",
        intent: "visual_edit", message: rawBody.message || message,
        message_intent_metadata: { visual_edit_metadata: { selected_elements: normalizedSelected, text_replacements: normalizedReplacements } },
        visual_edit_metadata: { selected_elements: normalizedSelected, text_replacements: normalizedReplacements },
        selected_elements: normalizedSelected, text_replacements: normalizedReplacements, mode: "instant",
      };
      if (Array.isArray(rawBody.files) && (rawBody.files as any[]).length > 0) modifiedBody.files = rawBody.files;
      if (Array.isArray(rawBody.optimisticImageUrls) && (rawBody.optimisticImageUrls as any[]).length > 0) modifiedBody.optimisticImageUrls = rawBody.optimisticImageUrls;
      return jsonResp({ action: "transform", body: modifiedBody });
    }

    // ─── Send raw action ───
    if (action === "send_raw") {
      const rKey = String(body.license_key || body.licenseKey || body.key || "").trim();
      const rLic = await validarLicenca(rKey, String(body.email || "").trim(), String(body.hwid || "").trim(), licenseSource);
      if (!rLic.ok) {
        if (rLic.reason === "device_mismatch") return jsonResp({ ok: false, error: `device_mismatch: ${rLic.error}`, logout: false }, 403);
        return jsonResp({ ok: false, error: `license_invalid: ${rLic.error}`, logout: true }, 403);
      }
      const rawBody = (body.chatBody && typeof body.chatBody === "object") ? body.chatBody as Record<string, unknown> : null;
      if (!token || !projectId || !rawBody) return jsonResp({ ok: false, error: "token, projectId e chatBody obrigatórios" }, 400);
      const rHeaders: Record<string, string> = { "Authorization": `Bearer ${token}`, "Content-Type": "application/json", "Origin": "https://lovable.dev", "Referer": "https://lovable.dev/" };
      const rSid = String(body.browser_session_id || body.lovable_browser_session_id || "").trim();
      const rSha = String(body.client_git_sha || body.lovable_git_sha || "").trim();
      if (rSid) rHeaders["x-browser-session-id"] = rSid;
      if (rSha) rHeaders["x-client-git-sha"] = rSha;
      const rResp = await fetch(`https://api.lovable.dev/projects/${projectId}/chat`, { method: "POST", headers: rHeaders, body: JSON.stringify(rawBody) });
      const rText = await rResp.text().catch(() => "");
      if (rResp.ok || rResp.status === 202) return jsonResp({ ok: true, status: rResp.status });
      if (rResp.status === 401 || rResp.status === 403) return jsonResp({ ok: false, error: `Token inválido (${rResp.status}). Recarregue a aba do Lovable.` }, 401);
      return jsonResp({ ok: false, error: `Lovable rejeitou (${rResp.status}): ${rText.slice(0, 150)}` }, rResp.status >= 500 ? 502 : 400);
    }

    // ─── Default: send message via visual_edit ───
    const browserSessionId = String(body.browser_session_id || body.lovable_browser_session_id || "").trim();
    const clientGitSha = String(body.client_git_sha || body.lovable_git_sha || "").trim();
    const lastPayload = (body.lastPayload && typeof body.lastPayload === "object") ? body.lastPayload as Record<string, unknown> : null;

    if (!token || !projectId || !message) return jsonResp({ error: "token, projectId e message são obrigatórios" }, 400);

    const licenseKey = String(body.license_key || body.licenseKey || body.key || "").trim();
    const licenseEmail = String(body.email || "").trim();
    const licenseHwid = String(body.hwid || "").trim();
    const lic = await validarLicenca(licenseKey, licenseEmail, licenseHwid, licenseSource);
    if (!lic.ok) {
      if (lic.reason === "device_mismatch") return jsonResp({ ok: false, error: `device_mismatch: ${lic.error}`, logout: false }, 403);
      return jsonResp({ ok: false, error: `license_invalid: ${lic.error}`, logout: true }, 403);
    }

    console.log("[lov7] project:", projectId.slice(0, 8), "| visual_edit | licença: ok");

    const userMessage = message.trim();
    const normalizedSelected = normalizeSelectedElements(null, userMessage);
    const normalizedReplacements = normalizeVisualEditReplacements(null, userMessage, normalizedSelected);
    const questionOnly = isQuestionOnlyMessage(userMessage, null, []);

    const msgId = lovId('umsg_');
    const aiMsgId = lovId('aimsg_');
    const clientId = 'b6b43cc48e150970836a56a2ccd63c284ade6c59e3fe4fb1648dc8baf9ed7976';

    // ─── Extrai arquivos: do lastPayload (SEND_MESSAGE_PROXY) ou do body direto ───
    const lpFiles      = (lastPayload && Array.isArray(lastPayload.files))                ? (lastPayload.files as unknown[])         : [];
    const lpImageUrls  = (lastPayload && Array.isArray(lastPayload.optimisticImageUrls))  ? (lastPayload.optimisticImageUrls as string[]) : [];
    const directFiles     = Array.isArray(body.files)     ? (body.files as unknown[])     : [];
    const directImageUrls = Array.isArray(body.imageUrls) ? (body.imageUrls as string[])  : [];
    const allFiles     = lpFiles.length     > 0 ? lpFiles     : directFiles;
    // Quando files[] já contém imagens (file_id), NÃO enviar optimisticImageUrls —
    // a Lovable renderiza a mesma imagem 2x (pelo file_id e pelo optimisticImageUrl).
    const allImageUrls = allFiles.length > 0 ? [] : (lpImageUrls.length > 0 ? lpImageUrls : directImageUrls);

    const chatBody: Record<string, unknown> = {
      id: msgId,
      message: buildVisualEditBridgeMessage(userMessage, questionOnly),
      files: allFiles,
      selected_elements: normalizedSelected,
      text_replacements: normalizedReplacements,
      intent: "visual_edit",
      message_intent_metadata: {
        visual_edit_metadata: {
          selected_elements: normalizedSelected,
          text_replacements: normalizedReplacements,
        },
      },
      visual_edit_metadata: {
        selected_elements: normalizedSelected,
        text_replacements: normalizedReplacements,
      },
      chat_only: false,
      optimisticImageUrls: allImageUrls,
      contains_error: false,
      error_ids: [],
      runtime_errors: [],
      client_id: clientId,
      thread_id: 'main',
      ai_message_id: aiMsgId,
      current_page: (lastPayload?.current_page as string) || "/",
      current_viewport_width: 1336,
      current_viewport_height: 861,
      current_viewport_dpr: 1,
      integration_metadata: { browser: { preview_viewport_width: 1336, preview_viewport_height: 861 } },
      view: 'preview',
      view_description: 'The user is currently viewing the preview. ',
      model: null,
      session_replay: '[]',
      client_logs: [],
      network_requests: [],
    };

    const chatHeaders: Record<string, string> = {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Origin": "https://lovable.dev",
      "Referer": "https://lovable.dev/",
    };
    if (browserSessionId) chatHeaders["x-browser-session-id"] = browserSessionId;
    if (clientGitSha) chatHeaders["x-client-git-sha"] = clientGitSha;

    const chatResp = await fetch(`https://api.lovable.dev/projects/${projectId}/chat`, {
      method: "POST", headers: chatHeaders, body: JSON.stringify(chatBody),
    });
    const chatText = await chatResp.text().catch(() => "");
    console.log("[lov7] Lovable status:", chatResp.status, "| body:", chatText.slice(0, 200));

    if (chatResp.ok || chatResp.status === 202) return jsonResp({ ok: true, status: chatResp.status, via: "visual_edit" });
    if (chatResp.status === 401 || chatResp.status === 403) return jsonResp({ ok: false, error: `Token inválido (${chatResp.status}). Recarregue a aba do Lovable.` }, 401);
    return jsonResp({ ok: false, error: `Lovable rejeitou (${chatResp.status}). Detail: ${chatText.slice(0, 200)}` }, chatResp.status >= 500 ? 502 : 400);

  } catch (err) {
    console.error("[lov7] erro:", err);
    return jsonResp({ error: String(err) }, 500);
  }
});
