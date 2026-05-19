import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Content-Type': 'application/json; charset=utf-8',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password, name } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email e senha são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    // Verify caller is admin or manager
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: callerRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .in('role', ['admin', 'manager', 'apollo'])
      .limit(1);

    if (!callerRole || callerRole.length === 0) {
      return new Response(JSON.stringify({ error: 'Acesso negado' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Try to create user; if email already exists, look up the existing user
    let userId: string;

    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError) {
      // If user already exists, find them and reuse
      if (createError.message?.includes('already been registered') || createError.message?.includes('already exists')) {
        const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (listError) throw listError;
        const existingUser = listData.users.find((u: any) => u.email === email);
        if (!existingUser) {
          return new Response(
            JSON.stringify({ error: 'Usuário existe mas não foi possível encontrá-lo' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if already a reseller
        const { data: existingRole } = await supabaseAdmin
          .from('user_roles')
          .select('id')
          .eq('user_id', existingUser.id)
          .eq('role', 'reseller')
          .maybeSingle();

        if (existingRole) {
          // Check if profile exists too
          const { data: existingProfile } = await supabaseAdmin
            .from('reseller_profiles')
            .select('id')
            .eq('user_id', existingUser.id)
            .maybeSingle();

          if (existingProfile) {
            // User already fully set up as reseller — just update password and return success
            await supabaseAdmin.auth.admin.updateUserById(existingUser.id, { password });
            return new Response(
              JSON.stringify({ success: true, user_id: existingUser.id }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }

        userId = existingUser.id;

        // Update password for existing user
        await supabaseAdmin.auth.admin.updateUserById(userId, { password });
      } else {
        throw createError;
      }
    } else {
      userId = userData.user.id;
    }

    // Add reseller role (upsert-safe)
    const { data: roleExists } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('role', 'reseller')
      .maybeSingle();

    if (!roleExists) {
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({ user_id: userId, role: 'reseller' });
      if (roleError) throw roleError;
    }

    // Create reseller profile if not exists
    const { data: profileExists } = await supabaseAdmin
      .from('reseller_profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!profileExists) {
      const { error: profileError } = await supabaseAdmin
        .from('reseller_profiles')
        .insert({
          user_id: userId,
          name: name || email.split('@')[0],
          status: 'approved',
          approved_at: new Date().toISOString(),
          created_by: caller.id,
        });
      if (profileError) throw profileError;
    }

    return new Response(
      JSON.stringify({ success: true, user_id: userId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
