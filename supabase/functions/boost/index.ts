import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const SUPABASE_URL      = Deno.env.get("SUPABASE_URL")               ?? ""
const SUPABASE_SERVICE  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")  ?? ""

const COTA_MAX    = 10
const COTA_JANELA = 24 * 60 * 60 * 1000  // 24h em ms

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-device-id, x-license-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ─── Feature flag ─────────────────────────────────────────────────────────────
async function boostAtivo(): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE) return true
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/system_config?key=eq.feature_flags&select=value&limit=1`,
      { headers: { apikey: SUPABASE_SERVICE, Authorization: `Bearer ${SUPABASE_SERVICE}` } }
    )
    if (!r.ok) return true
    const rows: any[] = await r.json()
    const flags = rows[0]?.value
    if (!flags) return true
    const f = typeof flags === "string" ? JSON.parse(flags) : flags
    return f["lov3_boost"] !== false
  } catch { return true }
}

// ─── Validação de licença ──────────────────────────────────────────────────────
async function validateLicenseKey(licenseKey: string): Promise<{ ok: boolean; licenseId?: string; error?: string }> {
  if (!licenseKey) return { ok: false, error: "licenseKey ausente" }
  // Sem env vars em produção = configuração errada → bloquear
  if (!SUPABASE_URL || !SUPABASE_SERVICE) return { ok: false, error: "Configuração interna inválida" }
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/licenses?license_key=eq.${encodeURIComponent(licenseKey)}&select=id,status,expires_at&limit=1`,
      { headers: { apikey: SUPABASE_SERVICE, Authorization: `Bearer ${SUPABASE_SERVICE}` } }
    )
    // 429 = brute-force detectado → bloquear, não deixar passar
    if (r.status === 429) return { ok: false, error: "Muitas tentativas. Tente novamente em instantes." }
    // 5xx = Supabase instável → fail-open pontual para não bloquear usuários válidos
    if (r.status >= 500) return { ok: true }
    if (!r.ok) return { ok: false, error: `Erro ao validar licença: HTTP ${r.status}` }
    const rows: any[] = await r.json()
    if (!rows.length) return { ok: false, error: "Licença não cadastrada no sistema" }
    const lic = rows[0]
    const status = String(lic.status ?? "").toLowerCase()
    if (["revoked","expired","inactive","banned"].includes(status))
      return { ok: false, error: `Licença com status: ${status}` }
    if (lic.expires_at && new Date(lic.expires_at) < new Date())
      return { ok: false, error: "Licença expirada" }
    return { ok: true, licenseId: String(lic.id) }
  } catch (e) {
    console.warn("[boost] validateLicense exception (fail-open):", e)
    return { ok: true }
  }
}

// ─── Cota ─────────────────────────────────────────────────────────────────────
interface CotaResult { ok: boolean; usados?: number; resetaEm?: string; erro?: string }

async function consumirCota(licenseId: string): Promise<CotaResult> {
  try {
    const now = new Date()
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/boost_cota?license_id=eq.${encodeURIComponent(licenseId)}&select=usos,janela_inicio&limit=1`,
      { headers: { apikey: SUPABASE_SERVICE, Authorization: `Bearer ${SUPABASE_SERVICE}` } }
    )
    const rows: any[] = r.ok ? await r.json() : []

    let usos = 0
    let janelaInicio = now
    let existeRegistro = false

    if (rows.length > 0) {
      existeRegistro = true
      const ji = new Date(rows[0].janela_inicio)
      if (now.getTime() - ji.getTime() < COTA_JANELA) {
        usos = Number(rows[0].usos) || 0
        janelaInicio = ji
      }
      // se janela expirou: usos=0, janelaInicio=now (reinicia)
    }

    if (usos >= COTA_MAX) {
      const resetaEm = new Date(janelaInicio.getTime() + COTA_JANELA).toISOString()
      return { ok: false, usados: usos, resetaEm, erro: "Limite de Boosts atingido" }
    }

    const novoUsos = usos + 1
    const patch = { usos: novoUsos, janela_inicio: janelaInicio.toISOString(), atualizado_em: now.toISOString() }

    if (existeRegistro) {
      await fetch(`${SUPABASE_URL}/rest/v1/boost_cota?license_id=eq.${encodeURIComponent(licenseId)}`, {
        method: "PATCH",
        headers: { apikey: SUPABASE_SERVICE, Authorization: `Bearer ${SUPABASE_SERVICE}`, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify(patch),
      })
    } else {
      await fetch(`${SUPABASE_URL}/rest/v1/boost_cota`, {
        method: "POST",
        headers: { apikey: SUPABASE_SERVICE, Authorization: `Bearer ${SUPABASE_SERVICE}`, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ license_id: licenseId, ...patch }),
      })
    }
    return { ok: true, usados: novoUsos }
  } catch (e) {
    console.error("[boost] consumirCota exception:", e)
    return { ok: false, erro: "Erro interno ao verificar cota" }
  }
}

async function estornarCota(licenseId: string): Promise<void> {
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/boost_cota?license_id=eq.${encodeURIComponent(licenseId)}&select=usos&limit=1`,
      { headers: { apikey: SUPABASE_SERVICE, Authorization: `Bearer ${SUPABASE_SERVICE}` } }
    )
    const rows: any[] = r.ok ? await r.json() : []
    if (!rows.length) return
    const usos = Math.max(0, (Number(rows[0].usos) || 0) - 1)
    await fetch(`${SUPABASE_URL}/rest/v1/boost_cota?license_id=eq.${encodeURIComponent(licenseId)}`, {
      method: "PATCH",
      headers: { apikey: SUPABASE_SERVICE, Authorization: `Bearer ${SUPABASE_SERVICE}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ usos, atualizado_em: new Date().toISOString() }),
    })
    console.log(`[boost] cota estornada → licenseId=${licenseId.slice(0,8)} usos=${usos}`)
  } catch (e) {
    console.error("[boost] estornarCota exception:", e)
  }
}

// ─── Telemetria ───────────────────────────────────────────────────────────────
async function gravarTelemetria(licenseId: string, evento: string, statusRE: number | null, statusChat: number | null, estornado: boolean): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/boost_telemetria`, {
      method: "POST",
      headers: { apikey: SUPABASE_SERVICE, Authorization: `Bearer ${SUPABASE_SERVICE}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ license_id: licenseId, evento, status_report_error: statusRE, status_chat: statusChat, estornado }),
    })
  } catch (e) {
    console.error("[boost] gravarTelemetria exception:", e)
  }
}

// ─── Handler principal ────────────────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return json({ erro: "Método não permitido" }, 405)

  let body: any
  try { body = await req.json() } catch { return json({ erro: "Corpo JSON inválido" }, 400) }

  const { licenseKey, deviceId, lovableToken, lovableProjectId, mensagem, currentPage } = body

  // ─── Validação (ANTES de consumir cota) ───────────────────────────────────
  if (!UUID_RE.test(String(lovableProjectId ?? "")))
    return json({ erro: "lovableProjectId deve ser um UUID válido" }, 400)
  if (!lovableToken || String(lovableToken).length < 20)
    return json({ erro: "lovableToken ausente ou muito curto" }, 400)
  if (!mensagem || !String(mensagem).trim())
    return json({ erro: "mensagem não pode ser vazia" }, 400)
  if (!deviceId || deviceId === "unknown")
    return json({ erro: "deviceId inválido" }, 400)
  if (!licenseKey)
    return json({ erro: "licenseKey ausente" }, 400)

  // ─── Feature flag ──────────────────────────────────────────────────────────
  if (!await boostAtivo())
    return json({ erro: "LOV3 Boost temporariamente indisponível" }, 503)

  // ─── Licença ───────────────────────────────────────────────────────────────
  const lk = String(licenseKey).trim().toUpperCase()
  const licCheck = await validateLicenseKey(lk)
  if (!licCheck.ok) return json({ erro: licCheck.error ?? "Licença inválida" }, 401)
  const licenseId = licCheck.licenseId ?? lk

  // ─── Consumir cota ─────────────────────────────────────────────────────────
  const cota = await consumirCota(licenseId)
  if (!cota.ok) {
    const horas = cota.resetaEm
      ? Math.ceil((new Date(cota.resetaEm).getTime() - Date.now()) / 3_600_000)
      : 24
    return json({ erro: cota.erro, usados: COTA_MAX, restantes: 0, reseta_em: cota.resetaEm, horas_restantes: horas }, 429)
  }

  // ─── Montar payload ────────────────────────────────────────────────────────
  const timestamp     = Date.now()
  const runtimeErrorId = `runtime-${timestamp}-${crypto.randomUUID().replace(/-/g,"").slice(0,8).toLowerCase()}`
  const filename       = currentPage && currentPage !== "/" ? String(currentPage) : "Unknown file"
  const msg            = String(mensagem).trim()
  const runtimeMetadata = { timestamp, error_type: "RUNTIME_ERROR", filename, lineno: 0, colno: 0, stack: `Error: ${msg}`, has_blank_screen: true }
  const metadataJson   = JSON.stringify(runtimeMetadata, null, 2)
  const errorMessage   = `${msg}\n${metadataJson}`
  const cleanToken     = String(lovableToken).replace(/^Bearer\s+/i, "")
  const projectId      = String(lovableProjectId)
  const tokenPreview   = cleanToken.slice(0, 6) + "..."

  const lovHeaders = {
    Authorization: `Bearer ${cleanToken}`,
    "Content-Type": "application/json",
    Origin: "https://lovable.dev",
    Referer: "https://lovable.dev/",
  }

  let statusReportError: number | null = null
  let statusChat: number | null = null

  // ─── PASSO A: report_error ────────────────────────────────────────────────
  try {
    const reportPayload = { message: msg, hidden: true, error_type: "runtime", meta_data: runtimeMetadata }
    console.log(`[boost] PASSO A report_error project=${projectId.slice(0,8)} token=${tokenPreview}`)
    const rResp = await fetch(`https://api.lovable.dev/projects/${encodeURIComponent(projectId)}/report_error`, {
      method: "POST", headers: lovHeaders, body: JSON.stringify(reportPayload),
    })
    statusReportError = rResp.status
    const rawText = await rResp.text()
    console.log(`[boost] report_error status=${rResp.status} body=${rawText.slice(0, 500)}`)

    if (!rResp.ok) {
      await estornarCota(licenseId)
      await gravarTelemetria(licenseId, "boost_estornado", statusReportError, null, true)
      const indisponivel = rResp.status === 404
      if (indisponivel) console.warn("[boost] INDISPONIVEL: report_error retornou 404")
      return json({ erro: `report_error falhou (${rResp.status}). Boost estornado.`, boost_indisponivel: indisponivel }, 502)
    }

    let respBody: any = {}
    try { respBody = JSON.parse(rawText) } catch { respBody = {} }
    const hasErrorId = respBody?.error_id || respBody?.id || respBody?.data?.error_id
    if (!hasErrorId) {
      console.warn("[boost] report_error ok mas sem error_id — abortando")
      await estornarCota(licenseId)
      await gravarTelemetria(licenseId, "boost_estornado", statusReportError, null, true)
      return json({ erro: "report_error não retornou error_id. Boost estornado." }, 502)
    }
  } catch (e) {
    console.error("[boost] PASSO A exception:", e)
    await estornarCota(licenseId)
    await gravarTelemetria(licenseId, "boost_estornado", statusReportError, null, true)
    return json({ erro: "Erro de rede em report_error. Boost estornado." }, 502)
  }

  // ─── PASSO B: chat com fix_error ──────────────────────────────────────────
  const chatPayload = {
    message: `For the code present, I get the error below.\n\nPlease think step-by-step in order to resolve it.\n\`\`\`\n${errorMessage}\n\`\`\`\n`,
    intent: "fix_error",
    contains_error: true,
    error_source: "runtime_error_toast",
    error_ids: [runtimeErrorId],
    message_intent_metadata: {
      fix_error_metadata: {
        error_source: "runtime_error_toast",
        errors: [{ error_type: "runtime", error_message: errorMessage, error_id: runtimeErrorId }],
      },
    },
    runtime_errors: [],
  }

  const chatBodyStr = JSON.stringify(chatPayload)
  if (chatBodyStr.length > 2 * 1024 * 1024) {
    await estornarCota(licenseId)
    await gravarTelemetria(licenseId, "boost_estornado", statusReportError, null, true)
    return json({ erro: "Payload excede 2MB. Boost estornado." }, 400)
  }

  try {
    console.log(`[boost] PASSO B chat project=${projectId.slice(0,8)} runtimeErrorId=${runtimeErrorId}`)
    const cResp = await fetch(`https://api.lovable.dev/projects/${encodeURIComponent(projectId)}/chat`, {
      method: "POST", headers: lovHeaders, body: chatBodyStr,
    })
    statusChat = cResp.status
    const chatRaw = await cResp.text()
    console.log(`[boost] chat status=${cResp.status} body=${chatRaw.slice(0, 500)}`)

    if (!cResp.ok) {
      await estornarCota(licenseId)
      await gravarTelemetria(licenseId, "boost_estornado", statusReportError, statusChat, true)
      const indisponivel = cResp.status === 404
      if (indisponivel) console.warn("[boost] INDISPONIVEL: chat retornou 404")
      return json({ erro: `chat falhou (${cResp.status}). Boost estornado.`, boost_indisponivel: indisponivel }, 502)
    }

    await gravarTelemetria(licenseId, "boost_usado", statusReportError, statusChat, false)
    return json({
      ok: true,
      usados: cota.usados,
      restantes: COTA_MAX - (cota.usados ?? 0),
      lovable_url: `https://lovable.dev/projects/${projectId}`,
    })
  } catch (e) {
    console.error("[boost] PASSO B exception:", e)
    await estornarCota(licenseId)
    await gravarTelemetria(licenseId, "boost_estornado", statusReportError, statusChat, true)
    return json({ erro: "Erro de rede em chat. Boost estornado." }, 502)
  }
})