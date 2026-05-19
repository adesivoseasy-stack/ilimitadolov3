import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json; charset=utf-8',
};

// Firebase Web API Key for Lovable (gpt-engineer-390607) — public key
const FIREBASE_API_KEY = 'AIzaSyBQNjlw9Vp4tP4VVeANzyPJnqbG2wLbYPw';
const FIREBASE_REFRESH_URL = `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`;

interface RefreshResult {
  id: string;
  account_label: string;
  success: boolean;
  error?: string;
}

async function refreshFirebaseToken(refreshToken: string): Promise<{
  id_token: string;
  refresh_token: string;
  expires_in: string;
} | null> {
  try {
    const response = await fetch(FIREBASE_REFRESH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[refresh-tokens] Firebase refresh failed: ${response.status} - ${errorBody}`);
      return null;
    }

    const data = await response.json();
    return {
      id_token: data.id_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
    };
  } catch (err) {
    console.error('[refresh-tokens] Network error:', err);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all active tokens that have a refresh_token
    const { data: tokens, error: fetchError } = await supabase
      .from('token_pool')
      .select('*')
      .eq('is_active', true)
      .not('refresh_token', 'is', null);

    if (fetchError) {
      console.error('[refresh-tokens] Failed to fetch tokens:', fetchError);
      return new Response(JSON.stringify({ error: 'Failed to fetch tokens' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!tokens || tokens.length === 0) {
      console.log('[refresh-tokens] No tokens with refresh_token found');
      return new Response(JSON.stringify({ message: 'No tokens to refresh', refreshed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: RefreshResult[] = [];
    const now = new Date();
    const refreshThreshold = new Date(now.getTime() + 10 * 60 * 1000);

    for (const token of tokens) {
      const expiresAt = token.expires_at ? new Date(token.expires_at) : null;

      // Skip tokens that are still valid for more than 10 minutes
      if (expiresAt && expiresAt > refreshThreshold) {
        console.log(`[refresh-tokens] ${token.account_label} still valid until ${expiresAt.toISOString()}, skipping`);
        results.push({ id: token.id, account_label: token.account_label, success: true });
        continue;
      }

      console.log(`[refresh-tokens] Refreshing ${token.account_label} (expires: ${expiresAt?.toISOString() || 'unknown'})`);

      const refreshed = await refreshFirebaseToken(token.refresh_token);

      if (refreshed) {
        const newExpiresAt = new Date(now.getTime() + parseInt(refreshed.expires_in) * 1000);

        const { error: updateError } = await supabase
          .from('token_pool')
          .update({
            token: refreshed.id_token,
            refresh_token: refreshed.refresh_token,
            expires_at: newExpiresAt.toISOString(),
            captured_at: now.toISOString(),
          })
          .eq('id', token.id);

        if (updateError) {
          console.error(`[refresh-tokens] Failed to update ${token.account_label}:`, updateError);
          
          // Log failure
          await supabase.from('token_refresh_logs').insert({
            token_id: token.id,
            account_label: token.account_label,
            status: 'error',
            error_message: 'DB update failed: ' + updateError.message,
            old_expires_at: expiresAt?.toISOString() || null,
          });

          results.push({ id: token.id, account_label: token.account_label, success: false, error: 'DB update failed' });
        } else {
          console.log(`[refresh-tokens] ✓ ${token.account_label} refreshed, expires ${newExpiresAt.toISOString()}`);
          
          // Log success
          await supabase.from('token_refresh_logs').insert({
            token_id: token.id,
            account_label: token.account_label,
            status: 'success',
            old_expires_at: expiresAt?.toISOString() || null,
            new_expires_at: newExpiresAt.toISOString(),
          });

          results.push({ id: token.id, account_label: token.account_label, success: true });
        }
      } else {
        // Mark token as inactive if refresh fails
        await supabase
          .from('token_pool')
          .update({ is_active: false })
          .eq('id', token.id);

        // Log failure
        await supabase.from('token_refresh_logs').insert({
          token_id: token.id,
          account_label: token.account_label,
          status: 'failed',
          error_message: 'Firebase refresh token invalid or expired. Token marked as inactive.',
          old_expires_at: expiresAt?.toISOString() || null,
        });

        console.error(`[refresh-tokens] ✗ ${token.account_label} refresh failed, marked inactive`);
        results.push({ id: token.id, account_label: token.account_label, success: false, error: 'Refresh token invalid' });
      }
    }

    const refreshedCount = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`[refresh-tokens] Done: ${refreshedCount} refreshed, ${failed} failed, ${tokens.length} total`);

    return new Response(JSON.stringify({
      message: `Refreshed ${refreshedCount}/${tokens.length} tokens`,
      refreshed: refreshedCount,
      failed,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[refresh-tokens] Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
