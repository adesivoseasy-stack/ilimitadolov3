import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LVB_API_BASE = "https://api.lvbcredits.com/api/v1/revenda";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;

    // Check role
    const { data: roles } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const userRoles = (roles || []).map((r: any) => r.role);
    if (!userRoles.some((r: string) => ["reseller", "apollo", "admin", "manager", "credits_customer"].includes(r))) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LVB_CREDITS_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, ...params } = body;

    // Actions that create or modify orders can only be called from the webhook (service_role)
    const PROTECTED_ACTIONS = new Set(["create-order", "set-delivery"]);
    if (PROTECTED_ACTIONS.has(action)) {
      // Check if caller is using service_role key (webhook/internal calls only)
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      const token = authHeader.replace("Bearer ", "");
      if (token !== serviceRoleKey) {
        // Also check if user is admin — admins can use these actions
        const isAdmin = userRoles.includes("admin");
        if (!isAdmin) {
          console.warn(`[lvb-credits] Blocked ${action} from non-admin user ${userId}`);
          
          // Log blocked attempt to audit table
          const adminClient = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
          );
          await adminClient.from("security_audit_logs").insert({
            user_id: userId,
            action: `lvb-credits:${action}`,
            details: { 
              params, 
              roles: userRoles,
              user_email: userData.user.email || 'unknown'
            },
            blocked: true,
          });
          
          return new Response(JSON.stringify({ error: "Forbidden: this action requires payment confirmation" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    let apiUrl: string;
    let method = "GET";
    let apiBody: string | undefined;

    switch (action) {
      case "get-balance": {
        // Only admin can check balance
        if (!userRoles.includes("admin")) {
          return new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        apiUrl = `${LVB_API_BASE}/saldo`;
        break;
      }
      case "create-order": {
        apiUrl = `${LVB_API_BASE}/pedidos`;
        method = "POST";
        apiBody = JSON.stringify({ creditos: params.creditos });
        break;
      }
      case "set-delivery": {
        apiUrl = `${LVB_API_BASE}/pedidos/${params.pedidoId}/tipo-entrega`;
        method = "PUT";
        apiBody = JSON.stringify({ tipo_entrega: "workspace_proprio" });
        break;
      }
      case "confirm-invite": {
        apiUrl = `${LVB_API_BASE}/pedidos/${params.pedidoId}/confirmar-convite`;
        method = "POST";
        break;
      }
      case "get-action": {
        apiUrl = `${LVB_API_BASE}/pedidos/${params.pedidoId}/acoes/${params.acaoId}`;
        break;
      }
      case "get-order": {
        apiUrl = `${LVB_API_BASE}/pedidos/${params.pedidoId}`;
        break;
      }
      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const fetchOptions: RequestInit = {
      method,
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
    };
    if (apiBody) fetchOptions.body = apiBody;

    const apiRes = await fetch(apiUrl, fetchOptions);
    const rawText = await apiRes.text();
    let apiData: any;
    try {
      apiData = rawText ? JSON.parse(rawText) : {};
    } catch {
      apiData = { raw: rawText };
    }

    // Log upstream responses for confirm-invite / get-action / get-order to diagnose API contract changes
    if (["confirm-invite", "get-action", "get-order"].includes(action)) {
      console.log(`[lvb-credits] action=${action} status=${apiRes.status} body=`, rawText?.slice(0, 800));
    }

    if (!apiRes.ok) {
      console.warn(`[lvb-credits] action=${action} upstream ${apiRes.status}:`, rawText?.slice(0, 500));
      return new Response(
        JSON.stringify({
          success: false,
          message:
            apiData?.message ||
            apiData?.error ||
            apiData?.detail ||
            `Erro ${apiRes.status} da API LVB`,
          upstream_status: apiRes.status,
          data: apiData,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(apiData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
