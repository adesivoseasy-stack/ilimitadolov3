/**
 * send-chat — Edge Function: proxy server-side para api.lovable.dev
 *
 * BYPASS DE CRÉDITOS:
 *   Envia do SERVIDOR com Origin: https://lovable.dev + intent "fix_error".
 *   O content script tem Origin: chrome-extension://... que Lovable cobra.
 *   O servidor não tem — por isso não debita créditos.
 *
 * Dois modos:
 *   1. v6234 (lastPayload): usa payload nativo capturado + overrides fix_error
 *   2. legacy: monta payload mínimo completo com todos os campos fix_error
 */

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

/** Gera IDs no formato nativo do Lovable: prefix_<26 hex chars> */
function lovId(prefix: string): string {
  const hex = crypto.randomUUID().replace(/-/g, "");
  return `${prefix}_${hex.substring(0, 26)}`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const body = await req.json();

    const token     = String(body.token || "").replace(/^Bearer\s+/i, "").trim();
    const projectId = String(body.projectId || "");
    const message   = String(body.message || "");
    const sessionId = String(body.sessionId || "");
    const gitSha    = String(body.gitSha || "");

    // lastPayload = payload nativo capturado do Lovable (metodologia v6.2.34)
    const lastPayload = (body.lastPayload && typeof body.lastPayload === "object")
      ? body.lastPayload as Record<string, unknown>
      : null;

    if (!token || !projectId || !message) {
      return jsonResp({ error: "token, projectId e message são obrigatórios" }, 400);
    }

    // ── Monta body para api.lovable.dev ───────────────────────────────────────
    let chatBody: Record<string, unknown>;

    if (lastPayload) {
      // ── Modo v6.2.34: spread do payload nativo + overrides fix_error ─────────
      // Usa o payload REAL capturado do Lovable como base — tem todos os campos
      // nativos que o Lovable espera. Só sobrescreve os campos de bypass.
      chatBody = {
        ...lastPayload,
        id:            lovId("umsg"),
        ai_message_id: lovId("aimsg"),
        message,
        intent:        "fix_error",
        dispatch_mode: "security_fix",
        source:        "ext-input",
        contains_error: true,
        error_ids:      [],
        message_intent_metadata: {
          fix_error_metadata: {
            errors: [{
              error_type:     "build",
              error_message:  message,
              build_event_id: String(lastPayload.ai_message_id || ""),
            }],
          },
        },
      };
      console.log("[send-chat] modo: v6234-lastPayload | contains_error:", chatBody.contains_error,
        "| dispatch:", chatBody.dispatch_mode);
    } else {
      // ── Modo legado: payload mínimo completo ──────────────────────────────────
      // Todos os campos que o Lovable espera para aceitar como fix_error
      chatBody = {
        id:            lovId("umsg"),
        ai_message_id: lovId("aimsg"),
        message,
        intent:        "fix_error",
        dispatch_mode: "security_fix",
        source:        "ext-input",
        message_intent_metadata: {
          fix_error_metadata: {
            errors: [{
              error_type:     "runtime",
              error_message:  message,
              build_event_id: "",
            }],
          },
        },
        contains_error:       true,
        error_ids:            [],
        session_replay:       "",
        client_logs:          [],
        network_requests:     [],
        runtime_errors:       [],
        integration_metadata: { browser: {} },
        files:                [],
        selected_elements:    [],
        chat_only:            false,
        optimisticImageUrls:  [],
        thread_id:            "main",
        current_page:         "/",
        current_viewport_width:  1280,
        current_viewport_height: 800,
        current_viewport_dpr:    1,
        view:                 "preview",
        view_description:     "The user is currently viewing the preview. ",
        model:                null,
      };
      console.log("[send-chat] modo: legacy fix_error");
    }

    // ── Headers para api.lovable.dev ──────────────────────────────────────────
    // Origin: https://lovable.dev é OBRIGATÓRIO — sem ele Lovable cobra crédito
    const chatHeaders: Record<string, string> = {
      "Authorization": `Bearer ${token}`,
      "Content-Type":  "application/json",
      "Origin":        "https://lovable.dev",
      "Referer":       "https://lovable.dev/",
    };
    if (sessionId) chatHeaders["x-browser-session-id"] = sessionId;
    if (gitSha)    chatHeaders["x-client-git-sha"]     = gitSha;

    // ── Enviar para Lovable ────────────────────────────────────────────────────
    const chatUrl = `https://api.lovable.dev/projects/${projectId}/chat`;
    console.log("[send-chat] → api.lovable.dev | modo:", lastPayload ? "v6234-lastPayload" : "legacy",
      "| session:", sessionId ? "sim" : "não");

    const chatResp = await fetch(chatUrl, {
      method: "POST",
      headers: chatHeaders,
      body: JSON.stringify(chatBody),
    });

    const chatText = await chatResp.text().catch(() => "");
    console.log("[send-chat] status:", chatResp.status, "| preview:", chatText.slice(0, 200));

    if (chatResp.ok || chatResp.status === 202) {
      return jsonResp({ ok: true, status: chatResp.status, mode: lastPayload ? "v6234" : "legacy" });
    }

    if (chatResp.status === 401 || chatResp.status === 403) {
      return jsonResp({
        ok: false,
        error: `Token inválido ou expirado (${chatResp.status}). Recarregue a aba do Lovable.`,
        detail: chatText.slice(0, 200),
      }, 401);
    }

    console.error("[send-chat] ❌ Lovable rejeitou:", chatResp.status, chatText.slice(0, 200));
    return jsonResp({
      ok: false,
      error: `Lovable rejeitou (${chatResp.status}). Tente novamente.`,
      detail: chatText.slice(0, 300),
    }, chatResp.status >= 500 ? 502 : 400);

  } catch (err) {
    console.error("[send-chat] erro:", err);
    return jsonResp({ error: String(err) }, 500);
  }
});
