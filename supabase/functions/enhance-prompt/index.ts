import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token',
  'Content-Type': 'application/json; charset=utf-8',
};

const SYSTEM_PROMPT = `Você é um especialista em engenharia de prompts para o Lovable.dev (gerador de aplicações web em React + Tailwind + Supabase).

Sua tarefa: pegar o prompt curto/vago do usuário e transformá-lo em um prompt RICO, ESPECÍFICO e ACIONÁVEL que gere o melhor resultado possível no Lovable.

Regras:
- Responda SEMPRE em português (pt-BR).
- Mantenha a intenção original do usuário, apenas expanda e detalhe.
- Inclua: objetivo claro, principais telas/seções, componentes UI esperados, paleta/visual sugerido (moderno, glassmorphism, dark/light), comportamento, dados/estado, e quaisquer integrações óbvias (auth, banco).
- Se for uma alteração pequena (ex: "muda a cor do botão"), apenas refine sendo mais específico — NÃO transforme em projeto inteiro.
- Não use markdown, não use listas com bullets. Devolva texto corrido, direto, em 2-6 parágrafos curtos no MÁXIMO.
- NÃO adicione preâmbulos como "Aqui está o prompt:" — devolva APENAS o prompt melhorado.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const sessionToken = req.headers.get('x-session-token');
    if (!sessionToken) {
      return new Response(JSON.stringify({ error: 'Missing session token' }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: session } = await supabase
      .from('sessions')
      .select('id, expires_at, licenses(status)')
      .eq('session_token', sessionToken)
      .maybeSingle();

    if (!session || new Date(session.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'Sessão inválida ou expirada' }), { status: 401, headers: corsHeaders });
    }
    const lic = (session as any).licenses;
    if (!lic || lic.status === 'revoked' || lic.status === 'expired') {
      return new Response(JSON.stringify({ error: 'Licença inválida' }), { status: 403, headers: corsHeaders });
    }

    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
      return new Response(JSON.stringify({ error: 'Digite um prompt para melhorar' }), { status: 400, headers: corsHeaders });
    }

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'AI não configurada' }), { status: 500, headers: corsHeaders });
    }

    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Prompt original do usuário:\n\n"""${prompt.trim()}"""` },
        ],
      }),
    });

    if (aiResp.status === 429) {
      return new Response(JSON.stringify({ error: 'Muitas requisições. Aguarde alguns segundos.' }), { status: 429, headers: corsHeaders });
    }
    if (aiResp.status === 402) {
      return new Response(JSON.stringify({ error: 'Créditos de IA esgotados. Contate o suporte.' }), { status: 402, headers: corsHeaders });
    }
    if (!aiResp.ok) {
      const txt = await aiResp.text();
      console.error('[enhance-prompt] AI error', aiResp.status, txt);
      return new Response(JSON.stringify({ error: 'Erro ao melhorar prompt' }), { status: 500, headers: corsHeaders });
    }

    const data = await aiResp.json();
    const improved = data?.choices?.[0]?.message?.content?.trim();
    if (!improved) {
      return new Response(JSON.stringify({ error: 'Resposta vazia da IA' }), { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ improved }), { headers: corsHeaders });
  } catch (err) {
    console.error('[enhance-prompt] error', err);
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: corsHeaders });
  }
});