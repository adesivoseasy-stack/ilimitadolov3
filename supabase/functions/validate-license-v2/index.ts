import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS })

  const reply = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } })

  try {
    const { license_key, hwid } = await req.json()
    if (!license_key) return reply({ ok: false, error: "Chave de licenca ausente" }, 400)

    const key = String(license_key).toUpperCase().trim()

    // Busca a licenca — colunas reais da tabela
    const url = `${SUPABASE_URL}/rest/v1/licenses?license_key=eq.${encodeURIComponent(key)}&select=id,license_key,email,status,expires_at&limit=1`
    const resp = await fetch(url, {
      method: "GET",
      headers: {
        "apikey": SUPABASE_SERVICE,
        "Authorization": `Bearer ${SUPABASE_SERVICE}`,
      },
    })

    if (!resp.ok) {
      const t = await resp.text()
      console.error("[validate] supabase error:", resp.status, t.slice(0, 200))
      return reply({ ok: false, error: "Erro ao consultar licenca" }, 500)
    }

    const rows: any[] = await resp.json()

    if (!Array.isArray(rows) || rows.length === 0) {
      return reply({ ok: false, error: "Licenca invalida." }, 401)
    }

    const lic = rows[0]

    if (lic.status && lic.status !== "active") {
      return reply({ ok: false, error: `Licenca ${lic.status}.` }, 401)
    }

    if (lic.expires_at && new Date(lic.expires_at) < new Date()) {
      return reply({ ok: false, error: "Licenca expirada." }, 401)
    }

    // HWID via tabela devices (license_id FK)
    if (hwid) {
      const devUrl = `${SUPABASE_URL}/rest/v1/devices?license_id=eq.${lic.id}&select=hwid&limit=1`
      const devResp = await fetch(devUrl, {
        headers: { "apikey": SUPABASE_SERVICE, "Authorization": `Bearer ${SUPABASE_SERVICE}` },
      })
      if (devResp.ok) {
        const devs: any[] = await devResp.json()
        if (devs.length === 0) {
          // Registra o dispositivo
          await fetch(`${SUPABASE_URL}/rest/v1/devices`, {
            method: "POST",
            headers: {
              "apikey": SUPABASE_SERVICE,
              "Authorization": `Bearer ${SUPABASE_SERVICE}`,
              "Content-Type": "application/json",
              "Prefer": "return=minimal",
            },
            body: JSON.stringify({ license_id: lic.id, hwid, last_seen_at: new Date().toISOString(), activated_at: new Date().toISOString() }),
          })
        } else if (devs[0].hwid !== hwid) {
          return reply({ ok: false, error: "Dispositivo diferente do registrado." }, 403)
        }
      }
    }

    return reply({ ok: true, valid: true, plan: lic.status, credits: null })

  } catch (err) {
    console.error("[validate-license-v2] erro:", err)
    return reply({ ok: false, error: String(err) }, 500)
  }
})
