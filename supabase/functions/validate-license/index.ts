import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  console.log("[validate-license] ⚠️ Endpoint desabilitado — modo manutenção");

  return new Response(
    JSON.stringify({ error: "maintenance", message: "Use validate-license-v2" }),
    { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
