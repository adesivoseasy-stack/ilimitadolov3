/**
 * send-chat — Edge Function: proxy server-side para api.lovable.dev
 *
 * BYPASS DE CRÉDITOS:
 *   Envia do SERVIDOR com Origin: https://lovable.dev + intent "fix_error".
 *   Lovable não cobra créditos quando recebe fix_error do servidor.
 *
 * Recebe: { token, projectId, message, sessionId, gitSha }
 * Envia para: api.lovable.dev/projects/{projectId}/chat
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

    if (!token || !projectId || !message) {
      return jsonResp({ error: "token, projectId e message são obrigatórios" }, 400);
    }

    // ── Monta body com fix_error completo ─────────────────────────────────────
    const chatBody = {
      id:            lovId("umsg"),
      ai_message_id: lovId("aimsg"),
      message,
      intent:        "fix_error",
      dispatch_mode: "security_fix",
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

    // ── Headers — Origin: https://lovable.dev é obrigatório para bypass ───────
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
    const chatResp = await fetch(chatUrl, {
      method: "POST",
      headers: chatHeaders,
      body: JSON.stringify(chatBody),
    });

    const chatText = await chatResp.text().catch(() => "");
    console.log("[send-chat] status:", chatResp.status, "| preview:", chatText.slice(0, 200));

    if (chatResp.ok || chatResp.status === 202) {
      return jsonResp({ ok: true, status: chatResp.status });
    }

    if (chatResp.status === 401 || chatResp.status === 403) {
      return jsonResp({
        ok: false,
        error: `Token inválido ou expirado (${chatResp.status}). Recarregue a aba do Lovable.`,
        detail: chatText.slice(0, 200),
      }, 401);
    }

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
