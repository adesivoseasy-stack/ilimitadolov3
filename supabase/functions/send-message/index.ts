import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkLicenseRateLimit } from '../_shared/helpers.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Content-Type': 'application/json; charset=utf-8',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get session token from header
    const sessionToken = req.headers.get('x-session-token');

    if (!sessionToken) {
      console.log('[send-message] Missing session token');
      return new Response(JSON.stringify({
        status: 'session_invalid',
        message: 'Missing session token',
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*, licenses(*)')
      .eq('session_token', sessionToken)
      .maybeSingle();

    if (sessionError || !session) {
      console.log('[send-message] Invalid session token');
      return new Response(JSON.stringify({
        status: 'session_invalid',
        message: 'Invalid session token',
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if session expired
    const now = new Date();
    const sessionExpires = new Date(session.expires_at);
    
    if (now > sessionExpires) {
      console.log('[send-message] Session expired');
      await supabase.from('sessions').delete().eq('id', session.id);
      return new Response(JSON.stringify({
        status: 'session_expired',
        message: 'Session has expired, please re-authenticate',
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if license is still valid
    const license = session.licenses;
    if (license.status === 'revoked' || license.status === 'expired') {
      console.log('[send-message] License no longer valid');
      await supabase.from('sessions').delete().eq('id', session.id);
      return new Response(JSON.stringify({
        status: 'session_invalid',
        message: 'License is no longer valid',
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update session last activity
    await supabase.from('sessions').update({ last_activity: new Date().toISOString() }).eq('id', session.id);

    // Check per-license message limit (e.g. test licenses)
    if (license.max_messages !== null && license.max_messages !== undefined) {
      // Optionally refresh limit from system_config
      let effectiveLimit = license.max_messages;
      const { data: limitConfig } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'test_message_limit')
        .maybeSingle();
      if (limitConfig?.value) {
        effectiveLimit = parseInt(limitConfig.value, 10) || license.max_messages;
      }
      if (license.messages_used >= effectiveLimit) {
        console.log(`[send-message] License ${license.id} reached message limit ${license.messages_used}/${effectiveLimit}`);
        await supabase.from('sessions').delete().eq('id', session.id);
        return new Response(JSON.stringify({
          status: 'limit_reached',
          message: `Limite de ${effectiveLimit} mensagens atingido para esta licença`,
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Increment messages_used
      await supabase
        .from('licenses')
        .update({ messages_used: (license.messages_used || 0) + 1 })
        .eq('id', license.id);

      console.log(`[send-message] License message ${(license.messages_used || 0) + 1}/${effectiveLimit}`);
    }

    // For wildcard licenses, just track usage (no limit)
    if (license.is_wildcard) {
      const clientIP = session.hwid.replace('wildcard_', '');
      
      const { data: wildcardUsage } = await supabase
        .from('wildcard_usage')
        .select('*')
        .eq('license_id', license.id)
        .eq('ip_address', clientIP)
        .maybeSingle();

      if (wildcardUsage) {
        await supabase
          .from('wildcard_usage')
          .update({ 
            message_count: wildcardUsage.message_count + 1,
            last_used_at: new Date().toISOString()
          })
          .eq('id', wildcardUsage.id);

        console.log(`[send-message] Wildcard message ${wildcardUsage.message_count + 1} for IP ${clientIP} (no limit)`);
      }
    }

    // Fetch webhook URL from database
    const { data: webhookConfig, error: configError } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'n8n_webhook_url')
      .maybeSingle();

    if (configError || !webhookConfig?.value) {
      console.error('[send-message] Webhook URL not found in system_config:', configError);
      return new Response(JSON.stringify({
        status: 'error',
        message: 'Webhook URL not configured',
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const WEBHOOK_URL = webhookConfig.value;
    console.log(`[send-message] Using webhook URL from database`);

    // Parse JSON body
    console.log('[send-message] Processing JSON request');
    
    const body = await req.json();

    // Rate limit: 1 message per 15 seconds per license_key (OBRIGATÓRIO)
    const bodyLicenseKey = body.license_key;
    if (!bodyLicenseKey) {
      console.log('[send-message] Missing license_key in body');
      return new Response(JSON.stringify({
        status: 'error',
        message: 'license_key é obrigatório no body da requisição.',
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rl = await checkLicenseRateLimit(bodyLicenseKey);
    if (!rl.allowed && rl.waitSeconds && rl.waitSeconds > 0) {
      console.log(`[send-message] Rate limited: ${rl.waitSeconds}s remaining for key ${bodyLicenseKey.substring(0, 8)}***`);
      return new Response(JSON.stringify({
        status: 'rate_limited',
        message: `Aguarde ${rl.waitSeconds} segundo(s) antes de enviar outra mensagem.`,
        wait_seconds: rl.waitSeconds,
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Accept flexible field names
    const projectId = body.project_id || body.projectId;
    const lovableToken = body.lovable_token || body.token;
    const textMessage = body.message;
    const clientSessionId = body.sessionId;
    // File attachment fields - support both single file and multiple files array
    const filesArray: Array<{data: string; name: string; type: string}> = [];
    
    // New format: files array [{data, name, type}]
    if (Array.isArray(body.files) && body.files.length > 0) {
      for (const f of body.files.slice(0, 10)) {
        filesArray.push({
          data: f.data || '',
          name: f.name || 'file',
          type: f.type || 'application/octet-stream',
        });
      }
    }
    // Legacy format: single file fields
    else if (body.file) {
      filesArray.push({
        data: body.file,
        name: body.fileName || 'file',
        type: body.mimeType || 'application/octet-stream',
      });
    }
    
    if (!textMessage && filesArray.length === 0) {
      return new Response(JSON.stringify({
        status: 'error',
        message: 'Missing message or file in request body',
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Upload all files to Storage and collect public URLs
    const fileUrls: Array<{url: string; name: string; type: string}> = [];
    for (const file of filesArray) {
      console.log(`[send-message] Uploading file: ${file.name}, type: ${file.type}, base64 length: ${file.data.length}`);
      try {
        const binaryStr = atob(file.data);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }

        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `${session.license_id}/${timestamp}_${random}_${safeName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('message-attachments')
          .upload(storagePath, bytes, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) {
          console.error('[send-message] Storage upload failed:', uploadError);
        } else {
          const { data: urlData } = supabase.storage
            .from('message-attachments')
            .getPublicUrl(uploadData.path);
          fileUrls.push({ url: urlData.publicUrl, name: file.name, type: file.type });
          console.log(`[send-message] File uploaded: ${urlData.publicUrl}`);
        }
      } catch (uploadErr) {
        console.error('[send-message] File upload error:', (uploadErr as Error).message);
      }
    }

    if (!projectId) {
      return new Response(JSON.stringify({
        status: 'error',
        message: 'Missing project_id',
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 🛡️ Anti-revenda via webhook (n8n): detecta uso da mesma chave em
    // múltiplos projetos Lovable em janela curta (>2 projetos em 60s = revenda)
    try {
      const { data: trackResult } = await supabase.rpc('register_license_project', {
        _license_id: license.id,
        _project_id: projectId,
        _max_unique_projects: 2,
        _window_seconds: 60,
      });

      if (trackResult && (trackResult as { revoked?: boolean; reason?: string }).revoked) {
        const reason = (trackResult as { reason?: string }).reason;
        if (reason === 'project_abuse' || reason === 'already_revoked') {
          console.log(`[send-message] License auto-revoked: ${reason}`, trackResult);
          await supabase.from('sessions').delete().eq('id', session.id);
          return new Response(JSON.stringify({
            status: 'session_invalid',
            message: 'Licença revogada por uso suspeito (compartilhamento entre múltiplos projetos detectado).',
          }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    } catch (trackErr) {
      // Não bloquear envio se o tracking falhar; apenas registrar
      console.error('[send-message] project tracking failed:', (trackErr as Error).message);
    }

    console.log(`[send-message] Forwarding to webhook for project: ${projectId.substring(0, 8)}***`);

    // Forward to webhook and return raw response
    try {
      const webhookPayload: Record<string, unknown> = {
        message: textMessage || '',
        projectId: projectId,
        token: lovableToken,
        license_key: license.license_key,
        device_id: session.hwid,
        licenseKey: license.license_key,
        deviceId: session.hwid,
      };
      
      // Include sessionId if provided
      if (clientSessionId) {
        webhookPayload.sessionId = clientSessionId;
      }

      // Include file URLs (much smaller than base64)
      if (fileUrls.length === 1) {
        // Single file: backward compatible format
        webhookPayload.fileUrl = fileUrls[0].url;
        webhookPayload.fileName = fileUrls[0].name;
        webhookPayload.mimeType = fileUrls[0].type;
      } else if (fileUrls.length > 1) {
        // Multiple files: send as array
        webhookPayload.files = fileUrls;
        // Also append all URLs to message for Quantum compatibility
        webhookPayload.fileUrl = fileUrls[0].url;
        webhookPayload.fileName = fileUrls[0].name;
        webhookPayload.mimeType = fileUrls[0].type;
      }

      const webhookResponse = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload),
      });

      console.log(`[send-message] Webhook response status: ${webhookResponse.status}`);

      const responseContentType = webhookResponse.headers.get('content-type') || 'text/plain';
      const responseBody = await webhookResponse.arrayBuffer();
      
      console.log(`[send-message] Webhook response type: ${responseContentType}, size: ${responseBody.byteLength} bytes`);

      return new Response(responseBody, {
        status: webhookResponse.status,
        headers: { 
          ...corsHeaders, 
          'Content-Type': responseContentType,
          'X-Webhook-Status': webhookResponse.ok ? 'success' : 'error',
        },
      });

    } catch (webhookError) {
      console.error('[send-message] Webhook call failed:', webhookError);
      return new Response(JSON.stringify({
        status: 'error',
        message: 'Failed to reach webhook',
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('[send-message] Unexpected error:', error);
    return new Response(JSON.stringify({
      status: 'error',
      message: 'Internal server error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
