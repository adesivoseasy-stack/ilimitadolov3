import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json; charset=utf-8",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin or manager role using service client
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: adminRole } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .in("role", ["admin", "manager", "apollo"])
      .limit(1);

    if (!adminRole || adminRole.length === 0) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { resellerId, action } = await req.json();

    if (!resellerId || !["approve", "reject"].includes(action)) {
      return new Response(JSON.stringify({ error: "Dados inválidos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get reseller profile
    const { data: profile, error: profileError } = await serviceClient
      .from("reseller_profiles")
      .select("*")
      .eq("id", resellerId)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Revendedor não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "approve") {
      // Update profile status
      await serviceClient
        .from("reseller_profiles")
        .update({
          status: "approved",
          approved_by: caller.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", resellerId);

      // Add reseller role
      await serviceClient.from("user_roles").upsert(
        {
          user_id: profile.user_id,
          role: "reseller",
        },
        { onConflict: "user_id,role" }
      );

      return new Response(
        JSON.stringify({ success: true, message: "Revendedor aprovado" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Reject
      await serviceClient
        .from("reseller_profiles")
        .update({ status: "rejected" })
        .eq("id", resellerId);

      return new Response(
        JSON.stringify({ success: true, message: "Revendedor rejeitado" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
