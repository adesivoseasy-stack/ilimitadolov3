import { corsHeaders, callAIStreamingWithFallback, callAIWithFallback, formatConversationHistory, validateSession, incrementMessageCount, checkLicenseRateLimit } from "../_shared/helpers.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Validate license session
    const session = await validateSession(req);
    if (!session.valid) {
      return Response.json({ ok: false, error: session.error }, { status: 403, headers: corsHeaders });
    }

    const { systemPrompt, userMessage, providerChain, attachments = [], conversationHistory = [], stream: wantStream = false, license_key } = await req.json();

    // Rate limit: 1 message per 15 seconds per license_key (OBRIGATÓRIO)
    if (!license_key) {
      return Response.json({ ok: false, error: "license_key é obrigatório no body da requisição." }, { status: 400, headers: corsHeaders });
    }

    const rl = await checkLicenseRateLimit(license_key);
    if (!rl.allowed && rl.waitSeconds && rl.waitSeconds > 0) {
      return Response.json({ ok: false, error: `Rate limit: aguarde ${rl.waitSeconds} segundo(s).`, wait_seconds: rl.waitSeconds }, { status: 429, headers: corsHeaders });
    }

    const historyBlock = formatConversationHistory(conversationHistory);
    let fullMessage = `${historyBlock}${userMessage || ""}`;

    for (const a of attachments) {
      if (a?.kind === "text" && a.text) fullMessage += `\n\nANEXO (${a.name}):\n${a.text}`;
    }

    const sysPrompt = systemPrompt || "Você é o Bubbly, um assistente de código especialista. Considere o histórico de conversa para manter contexto.";

    // Streaming mode
    if (wantStream) {
      const { stream, usedProvider, usedModel } = await callAIStreamingWithFallback(
        providerChain, sysPrompt, fullMessage
      );

      // Prepend metadata event, then pipe the AI stream
      const encoder = new TextEncoder();
      const metaEvent = encoder.encode(`event: meta\ndata: ${JSON.stringify({ usedProvider, usedModel })}\n\n`);

      const wrappedStream = new ReadableStream({
        async start(controller) {
          // Send metadata first
          controller.enqueue(metaEvent);

          // Pipe AI stream
          const reader = stream.getReader();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              controller.enqueue(value);
            }
          } catch (e) {
            console.error("[chat-stream] Error reading AI stream:", e);
          }
          controller.close();
        },
      });

      return new Response(wrappedStream, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    // Non-streaming mode (fallback)
    const { answer, usedProvider, usedModel } = await callAIWithFallback(
      providerChain, sysPrompt, fullMessage, 'chat'
    );
    // Increment message count
    if (session.licenseId) await incrementMessageCount(session.licenseId);

    return Response.json({ ok: true, answer, usedProvider, usedModel }, { headers: corsHeaders });
  } catch (e: any) {
    return Response.json({ ok: false, error: e.message }, { status: 400, headers: corsHeaders });
  }
});
