import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const sessionToken = url.searchParams.get("sessionToken");
    const extVersion = url.searchParams.get("extVersion") || "unknown";

    if (!sessionToken) {
      return new Response("<h1>Unauthorized</h1>", {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "text/html" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: session } = await supabase
      .from("sessions")
      .select("id, license_id, expires_at")
      .eq("session_token", sessionToken)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (!session) {
      return new Response(
        "<html><body style='background:#0a0a0a;color:#ef4444;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;'><h2>Sessão inválida ou expirada. Reative sua licença.</h2></body></html>",
        { status: 403, headers: { ...corsHeaders, "Content-Type": "text/html" } }
      );
    }

    const brand = url.searchParams.get("brand");
    const configKey = brand === "apollo" ? "apollo_extension_front_html" : "extension_front_html";

    const { data: config } = await supabase
      .from("system_config")
      .select("value")
      .eq("key", configKey)
      .maybeSingle();

    if (!config?.value) {
      return new Response(
        "<html><body style='background:#0a0a0a;color:#f59e0b;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;'><h2>Interface não configurada. Contate o administrador.</h2></body></html>",
        { status: 404, headers: { ...corsHeaders, "Content-Type": "text/html" } }
      );
    }

    await supabase
      .from("sessions")
      .update({ last_activity: new Date().toISOString() })
      .eq("id", session.id);

    return new Response(config.value, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("serve-extension-ui error:", error);
    return new Response(
      "<html><body style='background:#0a0a0a;color:#ef4444;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;'><h2>Erro interno do servidor</h2></body></html>",
      { status: 500, headers: { ...corsHeaders, "Content-Type": "text/html" } }
    );
  }
});
