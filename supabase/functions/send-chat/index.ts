/**
 * send-chat — Edge Function: proxy server-side para api.lovable.dev
 *
 * BYPASS DE CRÉDITOS (metodologia v6.2.34):
 *   Envia do SERVIDOR com Origin: https://lovable.dev
 *   + intent "fix_error" + dispatch_mode "security_fix" + error_type "build"
 *   Idêntico ao botão "Fix build error" nativo da Lovable → sem cobrança.
 *
 * Dois modos:
 *   1. v6234 (lastPayload): spread do payload nativo capturado + overrides fix_error
 *   2. legacy: payload completo com todos os campos obrigatórios
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
      // Usa o payload REAL capturado da Lovable como base — tem todos os campos
      // que o servidor espera. Sobrescreve apenas os campos de bypass de crédito.
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
      console.log("[send-chat] modo: v6234-lastPayload | dispatch:", chatBody.dispatch_mode);
    } else {
      // ── Modo legado: payload completo idêntico ao botão Fix build error ───────
      // Todos os campos que o Lovable espera — copiado da metodologia da extensão
      // principal que funciona 100% sem gastar crédito.
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
              error_type:     "build",
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
      console.log("[send-chat] modo: legacy fix_error | error_type: build");
    }

    // ── Headers para api.lovable.dev ──────────────────────────────────────────
    // Origin: https://lovable.dev OBRIGATÓRIO — envia do servidor como se fosse
    // a própria página do Lovable. Content scripts têm Origin errado e cobram.
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
    console.log("[send-chat] → Lovable | modo:", lastPayload ? "v6234" : "legacy",
      "| session:", sessionId ? "sim" : "não",
      "| project:", projectId.slice(0, 8) + "...");

    const chatResp = await fetch(chatUrl, {
      method: "POST",
      headers: chatHeaders,
      body: JSON.stringify(chatBody),
    });

    const chatText = await chatResp.text().catch(() => "");
    console.log("[send-chat] Lovable status:", chatResp.status, "| body:", chatText.slice(0, 200));

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

    console.error("[send-chat] ❌ Lovable rejeitou:", chatResp.status, chatText.slice(0, 300));
    return jsonResp({
      ok: false,
      error: `Lovable rejeitou (${chatResp.status}). Tente novamente.`,
      detail: chatText.slice(0, 300),
    }, chatResp.status >= 500 ? 502 : 400);

  } catch (err) {
    console.error("[send-chat] erro geral:", err);
    return jsonResp({ error: String(err) }, 500);
  }
});
