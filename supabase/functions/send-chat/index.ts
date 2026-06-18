/**
 * send-chat — Edge Function proxy para api.lovable.dev
 *
 * CÓPIA DIRETA de dynamic-api-v2-leigos.ts (extensão que funciona 100%)
 * adaptada para o Supabase do amigo.
 *
 * BYPASS DE CRÉDITOS (metodologia v6.2.34):
 *   Envia do SERVIDOR com Origin: https://lovable.dev
 *   + intent "fix_error" + contains_error:true
 *   O Lovable trata como correção de erro → não debita créditos.
 *
 * Dois modos:
 *   1. v6234 (lastPayload presente): spread do payload nativo + overrides fix_error
 *   2. legacy (sem lastPayload): payload completo com todos os campos obrigatórios
 *
 * Validação de licença: feita no content.js via gateLicense() — não duplicar aqui.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-license-key",
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

    // ── Campos de entrada (aceita ambos os formatos: novo e legado) ───────────
    const token     = String(body.token_lovable || body.token || "").replace(/^Bearer\s+/i, "").trim();
    const projectId = String(body.projeto_id   || body.projectId || "");
    const message   = String(body.mensagem     || body.message   || "");

    // Headers de sessão anti-bot (capturados pelo inject.js)
 const browserSessionId = String(
      body.browser_session_id || body.lovable_browser_session_id || body.sessionId || ""
    ).trim();
    const clientGitSha = String(
      body.client_git_sha || body.lovable_git_sha || body.gitSha || ""
    ).trim();

    // lastPayload = payload real capturado via webRequest no background.js
    const lastPayload = (body.lastPayload && typeof body.lastPayload === "object")
      ? body.lastPayload as Record<string, unknown>
      : null;

    // Arquivos (se enviados pelo upload-manager)
    const rawFiles = Array.isArray(body.attachments) ? body.attachments as Array<Record<string, unknown>> : [];
    const filesForLovable = rawFiles
      .map((f) => ({
        file_id:   String(f.file_id   || ""),
        file_name: String(f.file_name || f.name || "file"),
        type:      "user_upload",
        mime_type: String(f.mime_type || f.file_type || "application/octet-stream"),
      }))
      .filter((f) => f.file_id.length > 0);

    const optimisticUrls = Array.isArray(body.optimisticImageUrls)
      ? (body.optimisticImageUrls as string[])
      : [];
    const deduped = [...new Set(optimisticUrls)];

    if (!token || !projectId || !message) {
      return jsonResp({ error: "token, projectId e message são obrigatórios" }, 400);
    }

    console.log("[send-chat] token:", token.slice(0, 12) + "...",
      "| project:", projectId.slice(0, 8) + "...",
      "| lastPayload:", !!lastPayload,
      "| session:", browserSessionId ? "sim" : "não",
      "| gitSha:", clientGitSha ? "sim" : "não");

    // ── Monta body para api.lovable.dev ───────────────────────────────────────
    let chatBody: Record<string, unknown>;

    if (lastPayload) {
      // ── Modo v6.2.34: spread do payload nativo capturado + overrides fix_error
      // Usa o payload REAL da Lovable como base — tem todos os campos que o servidor
      // espera. Sobrescreve apenas os campos de bypass de crédito.
      chatBody = {
        ...lastPayload,
        id:            lovId("umsg"),
        ai_message_id: body.ai_message_id || lovId("aimsg"),
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
      if (filesForLovable.length > 0) {
        chatBody.files               = filesForLovable;
        chatBody.optimisticImageUrls = deduped;
      }
      console.log("[send-chat] modo: v6234-lastPayload | dispatch:", chatBody.dispatch_mode,
        "| contains_error:", chatBody.contains_error);
    } else {
      // ── Modo legado: payload completo — IDÊNTICO ao dynamic-api-v2-leigos.ts
      // Cópia exata da função que funciona 100% na extensão principal.
      chatBody = {
        id:            lovId("umsg"),
        ai_message_id: lovId("aimsg"),
        message,
        intent: "fix_error",
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
        files:                filesForLovable,
        selected_elements:    [],
        chat_only:            false,
        optimisticImageUrls:  deduped,
        thread_id:            "main",
        current_page:         "/",
        current_viewport_width:  1280,
        current_viewport_height: 800,
        current_viewport_dpr:    1,
        view:                 "preview",
        view_description:     "The user is currently viewing the preview. ",
        model:                null,
      };
      console.log("[send-chat] modo: legacy fix_error (runtime)");
    }

    // ── Headers para api.lovable.dev ──────────────────────────────────────────
    // Origin: https://lovable.dev OBRIGATÓRIO — envia do SERVIDOR como se fosse
    // a própria página do Lovable. Content scripts têm Origin errado e cobram.
    const chatHeaders: Record<string, string> = {
      "Authorization": `Bearer ${token}`,
      "Content-Type":  "application/json",
      "Origin":        "https://lovable.dev",
      "Referer":       "https://lovable.dev/",
    };
    if (browserSessionId) chatHeaders["x-browser-session-id"] = browserSessionId;
    if (clientGitSha)     chatHeaders["x-client-git-sha"]     = clientGitSha;

    // ── Enviar para Lovable ────────────────────────────────────────────────────
    const chatUrl = `https://api.lovable.dev/projects/${projectId}/chat`;
    const modoLog = lastPayload ? "v6234-lastPayload" : "legacy-runtime";
    console.log("[send-chat] → api.lovable.dev | modo:", modoLog,
      "| project:", projectId.slice(0, 8) + "...",
      "| intent:", chatBody.intent,
      "| session:", browserSessionId ? "sim" : "não");

    const chatResp = await fetch(chatUrl, {
      method: "POST",
      headers: chatHeaders,
      body: JSON.stringify(chatBody),
    });

    const chatText = await chatResp.text().catch(() => "");
    console.log("[send-chat] Lovable status:", chatResp.status,
      "| preview:", chatText.slice(0, 300));

    if (chatResp.ok || chatResp.status === 202) {
      return jsonResp({
        ok:     true,
        status: chatResp.status,
        mode:   modoLog,
        via:    "direct_fix_error",
      });
    }

    if (chatResp.status === 401 || chatResp.status === 403) {
      return jsonResp({
        ok:     false,
        error:  `Token inválido ou expirado (${chatResp.status}). Recarregue a aba do Lovable.`,
        detail: chatText.slice(0, 200),
      }, 401);
    }

    console.error("[send-chat] ❌ Lovable rejeitou:", chatResp.status, chatText.slice(0, 300));
    return jsonResp({
      ok:     false,
      error:  `Lovable rejeitou (${chatResp.status}). Tente novamente.`,
      detail: chatText.slice(0, 300),
    }, chatResp.status >= 500 ? 502 : 400);

  } catch (err) {
    console.error("[send-chat] erro geral:", err);
    return jsonResp({ error: String(err) }, 500);
  }
});
