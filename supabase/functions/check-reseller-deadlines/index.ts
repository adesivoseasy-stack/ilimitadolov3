import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find resellers past their deadline
    const { data: expiredResellers, error: fetchError } = await supabase
      .from("reseller_profiles")
      .select("id, user_id, name, deadline_at")
      .eq("status", "approved")
      .not("deadline_at", "is", null)
      .lt("deadline_at", new Date().toISOString());

    if (fetchError) throw fetchError;

    if (!expiredResellers || expiredResellers.length === 0) {
      return new Response(
        JSON.stringify({ message: "No expired resellers found", blocked: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For each expired reseller, check if they have active non-test keys
    const blocked: string[] = [];

    for (const reseller of expiredResellers) {
      const { data: activeKeys } = await supabase
        .from("licenses")
        .select("id")
        .eq("created_by", reseller.user_id)
        .eq("status", "active")
        .is("max_messages", null)
        .limit(1);

      if (activeKeys && activeKeys.length > 0) {
        // Has active keys, clear the deadline
        await supabase
          .from("reseller_profiles")
          .update({ deadline_at: null })
          .eq("id", reseller.id);
        continue;
      }

      // Block the reseller
      const { error: blockError } = await supabase
        .from("reseller_profiles")
        .update({ status: "blocked", deadline_at: null })
        .eq("id", reseller.id);

      if (!blockError) {
        blocked.push(reseller.name);
      }
    }

    return new Response(
      JSON.stringify({
        message: `Checked ${expiredResellers.length} expired resellers, blocked ${blocked.length}`,
        blocked,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
