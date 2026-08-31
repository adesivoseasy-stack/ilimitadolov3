import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")               ?? ""
const SUPABASE_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")  ?? ""
const COTA_MAX    = 10
const COTA_JANELA = 24 * 60 * 60 * 1000

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-device-id, x-license-key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  let licenseKey = ""
  try {
    if (req.method === "POST") {
      const b = await req.json()
      licenseKey = String(b?.licenseKey ?? "").trim().toUpperCase()
    } else {
      const url = new URL(req.url)
      licenseKey = String(url.searchParams.get("licenseKey") ?? "").trim().toUpperCase()
    }
  } catch { return json({ erro: "Corpo inválido" }, 400) }

  if (!licenseKey) return json({ erro: "licenseKey ausente" }, 400)

  if (!SUPABASE_URL || !SUPABASE_SERVICE) {
    return json({ erro: "Configuração interna inválida" }, 500)
  }

  try {
    // Validar licença
    const lr = await fetch(
      `${SUPABASE_URL}/rest/v1/licenses?license_key=eq.${encodeURIComponent(licenseKey)}&select=id,status&limit=1`,
      { headers: { apikey: SUPABASE_SERVICE, Authorization: `Bearer ${SUPABASE_SERVICE}` } }
    )
    if (lr.ok) {
      const lrows: any[] = await lr.json()
      if (!lrows.length) return json({ erro: "Licença não encontrada" }, 401)
      const status = String(lrows[0]?.status ?? "").toLowerCase()
      if (["revoked","expired","inactive","banned"].includes(status))
        return json({ erro: `Licença com status: ${status}` }, 401)
    }

    // Buscar cota
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/boost_cota?license_id=eq.${encodeURIComponent(licenseKey)}&select=usos,janela_inicio&limit=1`,
      { headers: { apikey: SUPABASE_SERVICE, Authorization: `Bearer ${SUPABASE_SERVICE}` } }
    )
    const rows: any[] = r.ok ? await r.json() : []

    if (!rows.length) {
      return json({ usados: 0, restantes: COTA_MAX, reseta_em: null })
    }

    const now = Date.now()
    const ji = new Date(rows[0].janela_inicio)
    const elapsed = now - ji.getTime()

    if (elapsed >= COTA_JANELA) {
      // Janela expirou
      return json({ usados: 0, restantes: COTA_MAX, reseta_em: null })
    }

    const usos = Number(rows[0].usos) || 0
    const resetaEm = new Date(ji.getTime() + COTA_JANELA).toISOString()
    const horasRestantes = Math.ceil((ji.getTime() + COTA_JANELA - now) / 3_600_000)

    return json({
      usados: usos,
      restantes: Math.max(0, COTA_MAX - usos),
      reseta_em: resetaEm,
      horas_restantes: horasRestantes,
    })
  } catch (e) {
    console.error("[boost-saldo] exception:", e)
    return json({ usados: 0, restantes: COTA_MAX, reseta_em: null })
  }
})