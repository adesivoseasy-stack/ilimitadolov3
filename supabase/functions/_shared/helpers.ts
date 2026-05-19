import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-user-id, x-github-token, x-openai-key, x-anthropic-key, x-google-key, x-xai-key, x-deepseek-key, x-groq-key, x-agentrouter-key, x-openrouter-key, x-openai-base-url, x-lovable-token, x-session-token",
  "Content-Type": "application/json; charset=utf-8",
};

// ── Rate limiter in-memory por licença (max 2 req/s) — legacy, mantido para compat ──
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 1000;
const RATE_LIMIT_MAX = 2;

export function checkRateLimit(licenseId: string): { allowed: boolean } {
  const now = Date.now();
  const timestamps = rateLimitMap.get(licenseId) || [];
  const recent = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) {
    rateLimitMap.set(licenseId, recent);
    return { allowed: false };
  }
  recent.push(now);
  rateLimitMap.set(licenseId, recent);
  if (rateLimitMap.size > 10000) {
    for (const [key, val] of rateLimitMap) {
      if (val.every(t => now - t > 60000)) rateLimitMap.delete(key);
    }
  }
  return { allowed: true };
}

// ── Rate limiter por license_key (15s cooldown, persistido no DB) ──
const RATE_LIMIT_COOLDOWN_SECONDS = 20;

export async function checkLicenseRateLimit(licenseKey: string): Promise<{ allowed: boolean; waitSeconds?: number; licenseId?: string }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: license, error } = await supabase
    .from("licenses")
    .select("id, last_message_at, status")
    .eq("license_key", licenseKey)
    .maybeSingle();

  if (error || !license) {
    return { allowed: false, waitSeconds: 0 };
  }

  if (license.status !== "active") {
    return { allowed: false, waitSeconds: 0 };
  }

  if (license.last_message_at) {
    const lastAt = new Date(license.last_message_at).getTime();
    const now = Date.now();
    const elapsed = (now - lastAt) / 1000;
    if (elapsed < RATE_LIMIT_COOLDOWN_SECONDS) {
      const wait = Math.ceil(RATE_LIMIT_COOLDOWN_SECONDS - elapsed);
      return { allowed: false, waitSeconds: wait, licenseId: license.id };
    }
  }

  // Update last_message_at atomically
  await supabase
    .from("licenses")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", license.id);

  return { allowed: true, licenseId: license.id };
}

// ── Valida sessão de licença ──
export async function validateSession(req: Request): Promise<{ valid: boolean; error?: string; licenseId?: string }> {
  const sessionToken = req.headers.get("x-session-token");
  if (!sessionToken) {
    return { valid: false, error: "Token de sessão não fornecido. Ative sua licença." };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: session, error } = await supabase
    .from("sessions")
    .select("id, license_id, expires_at")
    .eq("session_token", sessionToken)
    .maybeSingle();

  if (error || !session) {
    return { valid: false, error: "Sessão inválida ou expirada. Reative sua licença." };
  }

  if (new Date(session.expires_at) < new Date()) {
    // Clean up expired session
    await supabase.from("sessions").delete().eq("id", session.id);
    return { valid: false, error: "Sessão expirada. Reative sua licença." };
  }

  // Check if license is still active
  const { data: license } = await supabase
    .from("licenses")
    .select("status, expires_at, max_messages, messages_used, revoked_at")
    .eq("id", session.license_id)
    .maybeSingle();

  if (!license || license.status !== "active") {
    // Clean up session for inactive license
    await supabase.from("sessions").delete().eq("id", session.id);
    return { valid: false, error: "Licença inválida ou expirada. Reative sua licença." };
  }

  // Check if license was revoked
  if (license.revoked_at) {
    await supabase.from("sessions").delete().eq("id", session.id);
    return { valid: false, error: "Licença revogada. Entre em contato com o suporte." };
  }

  // Check if license has expired by date
  if (new Date(license.expires_at) < new Date()) {
    // Auto-update license status to expired
    await supabase.from("licenses").update({ status: "expired" }).eq("id", session.license_id);
    await supabase.from("sessions").delete().eq("id", session.id);
    return { valid: false, error: "Licença expirada. Renove sua licença para continuar." };
  }

  // Check message limit if applicable
  if (license.max_messages && license.messages_used >= license.max_messages) {
    return { valid: false, error: "Limite de mensagens atingido para esta licença." };
  }

  // Update last_activity
  await supabase.from("sessions").update({ last_activity: new Date().toISOString() }).eq("id", session.id);

  return { valid: true, licenseId: session.license_id };
}

// ── Incrementa contador de mensagens da licença ──
export async function incrementMessageCount(licenseId: string): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data } = await supabase.from("licenses").select("messages_used").eq("id", licenseId).single();

  if (data) {
    await supabase
      .from("licenses")
      .update({ messages_used: (data.messages_used || 0) + 1 })
      .eq("id", licenseId);
  }
}

// ── Extrai segredos do request (headers > env) ──
export function getSecrets(req: Request) {
  const headers = req.headers;
  return {
    githubToken: headers.get("x-github-token") || Deno.env.get("GITHUB_TOKEN") || "",
    openaiKey: headers.get("x-openai-key") || Deno.env.get("OPENAI_API_KEY") || "",
    anthropicKey: headers.get("x-anthropic-key") || Deno.env.get("ANTHROPIC_API_KEY") || "",
    openaiBaseUrl: headers.get("x-openai-base-url") || Deno.env.get("OPENAI_BASE_URL") || "",
    lovableToken: headers.get("x-lovable-token") || Deno.env.get("LOVABLE_TOKEN") || "",
    userId: headers.get("x-user-id") || "anonymous",
  };
}

// ── Retry genérico com exponential backoff ──
async function withRetry<T>(
  fn: () => Promise<T>,
  { maxRetries = 3, baseDelay = 1000, retryOn = (_e: any): boolean => true as boolean } = {},
): Promise<T> {
  let lastError: any;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      lastError = e;
      if (i === maxRetries || !retryOn(e)) throw e;
      const delay = baseDelay * Math.pow(2, i) + Math.random() * 500;
      console.warn(
        `[RETRY] Tentativa ${i + 1}/${maxRetries} falhou: ${e.message}. Aguardando ${Math.round(delay)}ms...`,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

function isRetryableError(e: any): boolean {
  const msg = e?.message || "";
  // Don't retry "request too large" / TPM errors — skip to next provider
  if (/request too large|tokens per min|TPM|context.length|max.context/i.test(msg)) return false;
  return /429|rate.limit|too many|5\d{2}|timeout|network|ECONNRESET|fetch failed|overload|unavailable|busy|capacity/i.test(
    msg,
  );
}

// ── GitHub: fetch com retry ──
export async function ghFetch(url: string, token: string, opts: RequestInit = {}) {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    ...((opts.headers as Record<string, string>) || {}),
  };
  return withRetry(
    async () => {
      const res = await fetch(url, { ...opts, headers });
      const text = await res.text();
      const json = text ? JSON.parse(text) : null;
      if (!res.ok) {
        const err = new Error(json?.message || `HTTP ${res.status}`);
        (err as any).status = res.status;
        throw err;
      }
      return json;
    },
    { maxRetries: 3, baseDelay: 1000, retryOn: isRetryableError },
  );
}

// ── GitHub: detecta branch padrão ──
async function detectDefaultBranch(owner: string, repo: string, token: string): Promise<string> {
  try {
    const repoData = await ghFetch(`https://api.github.com/repos/${owner}/${repo}`, token);
    return repoData?.default_branch || "main";
  } catch {
    return "main";
  }
}

// ── GitHub: resolve branch ──
async function resolveBranch(owner: string, repo: string, branch: string, token: string): Promise<string> {
  try {
    await ghFetch(`https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${branch}`, token);
    return branch;
  } catch (e: any) {
    if (e?.status === 404 && branch === "main") {
      const defaultBranch = await detectDefaultBranch(owner, repo, token);
      if (defaultBranch !== branch) return defaultBranch;
    }
    throw e;
  }
}

// ── GitHub: lista árvore do repo ──
export async function getRepoPaths(owner: string, repo: string, branch: string, token: string): Promise<string[]> {
  const resolvedBranch = await resolveBranch(owner, repo, branch, token);
  const ref = await ghFetch(`https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${resolvedBranch}`, token);
  const commitSha = ref?.object?.sha;
  const commit = await ghFetch(`https://api.github.com/repos/${owner}/${repo}/git/commits/${commitSha}`, token);
  const treeSha = commit?.tree?.sha;
  const tree = await ghFetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`, token);
  return (tree?.tree || []).filter((x: any) => x.type === "blob").map((x: any) => x.path as string);
}

// ── GitHub: lê arquivo ──
export async function getFileContent(
  owner: string,
  repo: string,
  branch: string,
  filePath: string,
  token: string,
): Promise<string | null> {
  try {
    const data = await ghFetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`,
      token,
    );
    if (data?.content) {
      // Decode base64 → binary → UTF-8 (preserves accented characters)
      const binary = atob(data.content.replace(/\n/g, ""));
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new TextDecoder("utf-8").decode(bytes);
    }
    return null;
  } catch {
    return null;
  }
}

// ── GitHub: lê primeiras N linhas de um arquivo ──
export async function getFileHead(
  owner: string,
  repo: string,
  branch: string,
  filePath: string,
  token: string,
  lines = 20,
): Promise<string> {
  const content = await getFileContent(owner, repo, branch, filePath, token);
  if (!content) return "";
  return content.split("\n").slice(0, lines).join("\n");
}

// ── GitHub: commit atômico de múltiplos arquivos ──
export async function ghCommitMany(
  owner: string,
  repo: string,
  branch: string,
  message: string,
  changes: { path: string; newContent: string }[],
  token: string,
) {
  const ref = await ghFetch(`https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${branch}`, token);
  const parentSha = ref?.object?.sha;
  const parentCommit = await ghFetch(`https://api.github.com/repos/${owner}/${repo}/git/commits/${parentSha}`, token);
  const baseTreeSha = parentCommit?.tree?.sha;

  const treeItems = [];
  for (const ch of changes.slice(0, 8)) {
    const blob = await ghFetch(`https://api.github.com/repos/${owner}/${repo}/git/blobs`, token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: ch.newContent, encoding: "utf-8" }),
    });
    treeItems.push({ path: ch.path, mode: "100644", type: "blob", sha: blob.sha });
  }

  const newTree = await ghFetch(`https://api.github.com/repos/${owner}/${repo}/git/trees`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base_tree: baseTreeSha, tree: treeItems }),
  });

  const newCommit = await ghFetch(`https://api.github.com/repos/${owner}/${repo}/git/commits`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, tree: newTree.sha, parents: [parentSha] }),
  });

  await ghFetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`, token, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sha: newCommit.sha, force: false }),
  });

  return { sha: newCommit.sha, url: `https://github.com/${owner}/${repo}/commit/${newCommit.sha}` };
}

// ── Ranking de arquivos por prompt (keyword-based fallback) ──
export function rankFiles(paths: string[], prompt: string): string[] {
  const p = prompt
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const words = p
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3)
    .slice(0, 15);
  const allowExt = /\.(tsx|ts|jsx|js|css|html|json|md|sql)$/i;

  const synonyms: Record<string, string[]> = {
    botao: ["button", "btn"],
    baixar: ["download", "extension"],
    extensao: ["extension", "download"],
    pagina: ["page", "pages"],
    componente: ["component", "components"],
    configuracao: ["config", "settings"],
    dashboard: ["dashboard", "index"],
    licenca: ["license", "licenses"],
    cliente: ["customer", "customers"],
    template: ["template", "templates"],
    autenticacao: ["auth", "login"],
    usuario: ["user", "profile"],
    revenda: ["reseller"],
    gerente: ["manager"],
    admin: ["admin"],
  };

  const expandedWords = new Set(words);
  for (const w of words) {
    if (synonyms[w]) for (const syn of synonyms[w]) expandedWords.add(syn);
  }

  return paths
    .filter((f) => allowExt.test(f))
    .map((f) => {
      const x = f.toLowerCase();
      const fileName = x.split("/").pop() || "";
      let score = 0;
      for (const w of expandedWords) {
        if (x.includes(w)) score += 10;
        if (fileName.includes(w)) score += 5;
      }
      if (x.includes("/src/")) score += 2;
      if (x.includes("/pages/")) score += 3;
      if (x.includes("/components/")) score += 2;
      if (x.includes("/hooks/")) score += 2;
      if (fileName === "index.tsx" || fileName === "index.ts") score += 1;
      if (fileName === "app.tsx") score += 1;
      if (x.includes(".test.") || x.includes(".spec.")) score -= 5;
      if (x.includes("node_modules")) score -= 100;
      return { f, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 7)
    .map((x) => x.f);
}

// ── Estima tokens (~4 chars/token) ──
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// ── Concurrency-limited parallel execution ──
async function parallelLimit<T>(tasks: (() => Promise<T>)[], limit = 5): Promise<T[]> {
  const results: T[] = [];
  let idx = 0;
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, async () => {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]();
    }
  });
  await Promise.all(workers);
  return results;
}

// ── Ranking de arquivos por IA com contexto parcial (2 etapas) — usa modelo barato ──
export async function aiRankFiles(
  allPaths: string[],
  prompt: string,
  conversationHistory: any[],
  providerChain: any[],
  owner?: string,
  repo?: string,
  branch?: string,
  token?: string,
): Promise<string[]> {
  const allowExt = /\.(tsx|ts|jsx|js|css|html|json|md|sql)$/i;
  const filteredPaths = allPaths.filter((f) => allowExt.test(f) && !f.includes("node_modules"));

  if (filteredPaths.length <= 15) return filteredPaths;

  try {
    const historyBlock = conversationHistory?.length
      ? `\nHISTÓRICO RECENTE:\n${conversationHistory
          .slice(-3)
          .map((m: any) => {
            let line = `${m.role}: ${m.content}`;
            if (m.meta?.filesChanged?.length) line += ` [arquivos: ${m.meta.filesChanged.join(", ")}]`;
            return line;
          })
          .join("\n")}\n`
      : "";

    let filePreviewBlock = "";
    if (owner && repo && branch && token) {
      const keywordTop = rankFiles(allPaths, prompt);
      const previewPaths = keywordTop.slice(0, 15);
      const tasks = previewPaths.map((p) => async () => {
        const head = await getFileHead(owner, repo, branch, p, token, 15);
        return head ? `\n--- ${p} ---\n${head}\n` : "";
      });
      const previews = await parallelLimit(tasks, 5);
      const validPreviews = previews.filter(Boolean);
      if (validPreviews.length) {
        filePreviewBlock = `\nPRÉVIA DOS ARQUIVOS (primeiras linhas dos candidatos):\n${validPreviews.join("")}\n`;
      }
    }

    const rankingSystemPrompt = `Você é um assistente que seleciona arquivos relevantes de um repositório.
Analise o pedido do usuário, o histórico e a prévia dos arquivos.
Considere dependências, imports e arquivos relacionados.
Retorne APENAS um JSON array com os 12-15 caminhos mais relevantes.
Exemplo: ["src/App.tsx", "src/pages/Home.tsx"]`;

    const rankingUserContent = `PEDIDO DO USUÁRIO:\n${prompt}\n${historyBlock}${filePreviewBlock}\nARQUIVOS DISPONÍVEIS (${filteredPaths.length}):\n${filteredPaths.join("\n")}`;

    // Use cheapest provider for ranking
    const cheapChain = getCheapProviderChain(providerChain);
    const { answer } = await callAIWithFallback(cheapChain, rankingSystemPrompt, rankingUserContent, "ranking");

    const cleaned = answer
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();
    const startBracket = cleaned.indexOf("[");
    const endBracket = cleaned.lastIndexOf("]");
    if (startBracket === -1 || endBracket === -1) throw new Error("No array found");

    const parsed = JSON.parse(cleaned.slice(startBracket, endBracket + 1));
    if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("Empty array");

    const validPaths = parsed.filter((p: string) => filteredPaths.includes(p));
    if (validPaths.length < 3) throw new Error("Too few valid paths");

    console.log(`[aiRankFiles] IA selecionou ${validPaths.length} arquivos de ${filteredPaths.length}`);
    return validPaths.slice(0, 15);
  } catch (e: any) {
    console.warn(`[aiRankFiles] Fallback para ranking por keywords: ${e.message}`);
    return rankFiles(allPaths, prompt);
  }
}

// ── Constrói árvore de diretórios indentada ──
export function buildTreeString(allPaths: string[]): string {
  const MAX_LINES = 300;
  const tree: Record<string, any> = {};

  for (const p of allPaths) {
    const parts = p.split("/");
    let node = tree;
    for (const part of parts) {
      if (!node[part]) node[part] = {};
      node = node[part];
    }
  }

  const lines: string[] = [];
  function walk(node: Record<string, any>, indent: string) {
    const keys = Object.keys(node).sort();
    for (const key of keys) {
      if (lines.length >= MAX_LINES) {
        lines.push(`${indent}... (${allPaths.length - lines.length} mais arquivos)`);
        return;
      }
      const children = Object.keys(node[key]);
      if (children.length > 0) {
        lines.push(`${indent}${key}/`);
        walk(node[key], indent + "  ");
      } else {
        lines.push(`${indent}${key}`);
      }
    }
  }

  walk(tree, "");
  return lines.join("\n");
}

// ── Formata histórico de conversação (inteligente: 3 recentes + resumo) ──
export function formatConversationHistory(history: any[]): string {
  if (!history?.length) return "";

  if (history.length <= 3) {
    const formatted = history
      .map((m: any) => {
        let line = `[${m.role}]: ${m.content}`;
        if (m.meta?.filesChanged?.length) line += ` [modificou: ${m.meta.filesChanged.join(", ")}]`;
        if (m.meta?.commitSha) line += ` [commit: ${m.meta.commitSha.substring(0, 7)}]`;
        return line;
      })
      .join("\n");
    return `\nHISTÓRICO DE CONVERSA:\n${formatted}\n`;
  }

  // Older messages: 1-line summary each
  const older = history.slice(0, -3);
  const olderSummary = older
    .map((m: any) => {
      const short = (m.content || "").substring(0, 60).replace(/\n/g, " ");
      const files = m.meta?.filesChanged?.length ? ` [${m.meta.filesChanged.length} arquivos]` : "";
      return `${m.role}: ${short}...${files}`;
    })
    .join("\n");

  // Recent 3: full detail
  const recent = history.slice(-3);
  const recentFormatted = recent
    .map((m: any) => {
      let line = `[${m.role}]: ${m.content}`;
      if (m.meta?.filesChanged?.length) line += ` [modificou: ${m.meta.filesChanged.join(", ")}]`;
      if (m.meta?.commitSha) line += ` [commit: ${m.meta.commitSha.substring(0, 7)}]`;
      return line;
    })
    .join("\n");

  return `\nRESUMO DO HISTÓRICO ANTERIOR:\n${olderSummary}\n\nMENSAGENS RECENTES:\n${recentFormatted}\n`;
}

// ── Constrói árvore compacta (só src/ com contagem) ──
export function buildCompactTree(allPaths: string[]): string {
  const skipDirs = ["node_modules", ".git", "dist", "build", ".next"];
  const assetExts = /\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|mp4|webm|mp3|wav)$/i;

  const relevant = allPaths.filter((p) => {
    if (skipDirs.some((d) => p.startsWith(d + "/") || p.includes("/" + d + "/"))) return false;
    if (assetExts.test(p)) return false;
    return true;
  });

  const dirCounts: Record<string, number> = {};
  const topFiles: string[] = [];
  for (const p of relevant) {
    const parts = p.split("/");
    if (parts.length === 1) {
      topFiles.push(p);
    } else {
      const dir = parts.slice(0, Math.min(3, parts.length - 1)).join("/");
      dirCounts[dir] = (dirCounts[dir] || 0) + 1;
    }
  }

  const lines: string[] = [];
  for (const f of topFiles.slice(0, 5)) lines.push(f);
  if (topFiles.length > 5) lines.push(`... (+${topFiles.length - 5} arquivos na raiz)`);

  const sortedDirs = Object.entries(dirCounts).sort(([a], [b]) => a.localeCompare(b));
  for (const [dir, count] of sortedDirs) {
    lines.push(`${dir}/ (${count} arquivos)`);
  }

  return lines.join("\n");
}

// ── Retorna chain com modelo mais barato para ranking ──
export function getCheapProviderChain(providerChain: any[]): any[] {
  if (!providerChain?.length) return providerChain;
  const cheapModels = ["flash", "nano", "mini", "lite", "haiku", "free"];
  const cheapEntry = providerChain.find((p) => cheapModels.some((cm) => (p.model || "").toLowerCase().includes(cm)));
  if (cheapEntry) return [cheapEntry, ...providerChain.filter((p) => p !== cheapEntry)];
  return [...providerChain].reverse();
}

// ── Gera system prompt dinâmico do projeto ──
export async function generateProjectSystemPrompt(
  owner: string,
  repo: string,
  branch: string,
  token: string,
  allPaths: string[],
  basePrompt: string,
): Promise<string> {
  let stackInfo = "";
  try {
    const pkgContent = await getFileContent(owner, repo, branch, "package.json", token);
    if (pkgContent) {
      const pkg = JSON.parse(pkgContent);
      const deps = Object.keys(pkg.dependencies || {})
        .slice(0, 20)
        .join(", ");
      stackInfo = `\nPROJETO: "${pkg.name || repo}"${pkg.description ? ` — ${pkg.description}` : ""}
Stack: ${deps}`;
    }
  } catch {}

  const conventions: string[] = [];
  const hasPages = allPaths.some((p) => p.includes("/pages/"));
  const hasComponents = allPaths.some((p) => p.includes("/components/"));
  const hasHooks = allPaths.some((p) => p.includes("/hooks/"));
  const hasSupabase = allPaths.some((p) => p.includes("supabase"));
  const hasTailwind = allPaths.some((p) => p.includes("tailwind"));

  if (hasPages) conventions.push("- Páginas em src/pages/");
  if (hasComponents) conventions.push("- Componentes em src/components/");
  if (hasHooks) conventions.push('- Hooks customizados em src/hooks/ com prefixo "use"');
  if (hasSupabase) conventions.push("- Backend via Supabase (client em src/integrations/supabase/)");
  if (hasTailwind) conventions.push("- Estilização com Tailwind CSS");

  const conventionsBlock = conventions.length ? `\nCONVENÇÕES DO PROJETO:\n${conventions.join("\n")}` : "";

  return `${basePrompt}${stackInfo}${conventionsBlock}`;
}

// ── generateResponsibilityMap REMOVIDO — incorporado no ranking ──
export async function generateResponsibilityMap(
  _allPaths: string[],
  _providerChain: any[],
  _owner?: string,
  _repo?: string,
  _branch?: string,
  _token?: string,
): Promise<string> {
  return ""; // Otimização: mapa eliminado para reduzir chamadas de IA
}

// ── Aplica operações de diff (search/replace) sobre o conteúdo original ──
export interface DiffResult {
  content: string;
  applied: number;
  failed: number;
  total: number;
  failedSearches: string[];
}

export function applyDiffOperations(
  originalContent: string,
  operations: { search: string; replace: string }[],
  returnStats?: true,
): DiffResult;
export function applyDiffOperations(
  originalContent: string,
  operations: { search: string; replace: string }[],
  returnStats?: false,
): string;
export function applyDiffOperations(
  originalContent: string,
  operations: { search: string; replace: string }[],
  returnStats: boolean = false,
): string | DiffResult {
  let content = originalContent;
  let appliedCount = 0;
  const failedSearches: string[] = [];

  for (const op of operations) {
    if (!op.search || op.search.trim() === "") continue;

    // 1) Exact match
    let idx = content.indexOf(op.search);
    if (idx !== -1) {
      content = content.substring(0, idx) + op.replace + content.substring(idx + op.search.length);
      appliedCount++;
      continue;
    }

    // 2) Normalized whitespace match (CRLF → LF, trim)
    const normalizedSearch = op.search.replace(/\r\n/g, "\n").trim();
    const normalizedContent = content.replace(/\r\n/g, "\n");
    idx = normalizedContent.indexOf(normalizedSearch);
    if (idx !== -1) {
      content =
        normalizedContent.substring(0, idx) + op.replace + normalizedContent.substring(idx + normalizedSearch.length);
      appliedCount++;
      continue;
    }

    // 3) Fuzzy match: collapse all whitespace to single spaces
    const fuzzySearch = normalizedSearch.replace(/\s+/g, " ");
    const fuzzyContent = normalizedContent.replace(/\s+/g, " ");
    const fIdx = fuzzyContent.indexOf(fuzzySearch);
    if (fIdx !== -1) {
      // Map fuzzy index back to original content position
      let realStart = 0,
        fuzzyPos = 0;
      const src = normalizedContent;
      while (fuzzyPos < fIdx && realStart < src.length) {
        if (/\s/.test(src[realStart])) {
          while (realStart < src.length && /\s/.test(src[realStart])) realStart++;
          fuzzyPos++;
        } else {
          realStart++;
          fuzzyPos++;
        }
      }
      let realEnd = realStart,
        matchLen = 0;
      while (matchLen < fuzzySearch.length && realEnd < src.length) {
        if (/\s/.test(src[realEnd])) {
          while (realEnd < src.length && /\s/.test(src[realEnd])) realEnd++;
          matchLen++;
        } else {
          realEnd++;
          matchLen++;
        }
      }
      content = normalizedContent.substring(0, realStart) + op.replace + normalizedContent.substring(realEnd);
      appliedCount++;
      continue;
    }

    failedSearches.push(op.search.substring(0, 80));
    console.warn(`[applyDiff] Search block not found (${op.search.substring(0, 80)}...)`);
  }

  const total = operations.filter((op) => op.search && op.search.trim() !== "").length;
  if (appliedCount === 0 && total > 0) {
    console.warn(`[applyDiff] WARNING: 0/${total} operations applied — file unchanged`);
  }

  if (returnStats) {
    return { content, applied: appliedCount, failed: total - appliedCount, total, failedSearches };
  }
  return content;
}

// ── Hash simples para paths (para cache) ──
export function hashPaths(paths: string[]): string {
  const str = paths.sort().join("|");
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `${paths.length}_${hash}`;
}

// ── Encontra arquivos que importam um dado arquivo ──
export function findImporters(targetPath: string, allFiles: { path: string; content: string }[]): string[] {
  const fileName =
    targetPath
      .split("/")
      .pop()
      ?.replace(/\.(tsx?|jsx?)$/, "") || "";
  if (!fileName) return [];

  const importPatterns = [
    new RegExp(`from\\s+['"][^'"]*${fileName}['"]`),
    new RegExp(`import\\(['"][^'"]*${fileName}['"]\\)`),
  ];

  const importers: string[] = [];
  for (const f of allFiles) {
    if (f.path === targetPath) continue;
    if (importPatterns.some((p) => p.test(f.content))) {
      importers.push(f.path);
    }
  }
  return importers;
}

// ── Encontra importers potenciais na árvore completa (sem conteúdo) ──
export function findPotentialImporters(targetPaths: string[], allPaths: string[], excludePaths: Set<string>): string[] {
  // Heuristic: files in the same or parent directory are likely importers
  const targetDirs = new Set<string>();
  const targetNames = new Set<string>();
  for (const tp of targetPaths) {
    const parts = tp.split("/");
    parts.pop();
    targetDirs.add(parts.join("/"));
    if (parts.length > 1) {
      parts.pop();
      targetDirs.add(parts.join("/"));
    }
    const name =
      tp
        .split("/")
        .pop()
        ?.replace(/\.(tsx?|jsx?)$/, "") || "";
    if (name) targetNames.add(name);
  }

  const codeExt = /\.(tsx?|jsx?)$/;
  return allPaths
    .filter((p) => {
      if (excludePaths.has(p)) return false;
      if (!codeExt.test(p)) return false;
      const dir = p.split("/").slice(0, -1).join("/");
      // Only files in nearby directories
      return targetDirs.has(dir);
    })
    .slice(0, 8);
}

// ── Monta bloco de arquivos com limite de tokens ──
export function buildFileBlock(
  contextFiles: { path: string; content: string }[],
  maxTokens = 80000,
): { block: string; includedCount: number; omittedCount: number } {
  let tokenCount = 0;
  let block = "";
  let includedCount = 0;

  for (let i = 0; i < contextFiles.length; i++) {
    const f = contextFiles[i];
    const entry = `FILE: ${f.path}\n-----\n${f.content}\n-----\n\n`;
    const entryTokens = estimateTokens(entry);

    if (tokenCount + entryTokens > maxTokens) {
      const omitted = contextFiles.length - i;
      block += `\n... (${omitted} arquivos omitidos por limite de contexto)\n`;
      return { block, includedCount, omittedCount: omitted };
    }

    block += entry;
    tokenCount += entryTokens;
    includedCount++;
  }

  return { block, includedCount, omittedCount: 0 };
}

// ── Retry inteligente de JSON inválido ──
export async function extractJsonWithRetry(
  rawAnswer: string,
  providerChain: any[],
  systemPrompt: string,
): Promise<any> {
  try {
    return extractJson(rawAnswer);
  } catch (firstError: any) {
    console.warn(`[extractJsonWithRetry] Primeiro parse falhou: ${firstError.message}. Tentando retry...`);
    try {
      const retryPrompt = `Sua resposta anterior continha JSON inválido. Aqui está o início da resposta problemática:
"${rawAnswer.slice(0, 500)}..."

Reescreva APENAS o JSON válido no mesmo formato solicitado, sem texto fora do JSON. Corrija qualquer problema de sintaxe.`;

      const { answer: retryAnswer } = await callAIWithFallback(providerChain, systemPrompt, retryPrompt);
      return extractJson(retryAnswer);
    } catch (retryError: any) {
      console.error(`[extractJsonWithRetry] Retry também falhou: ${retryError.message}`);
      throw new Error(`JSON inválido da IA (mesmo após retry): ${firstError.message}`);
    }
  }
}

// ── Extrai e repara JSON da resposta da IA ──
export function extractJson(text: string) {
  let cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  const a = cleaned.indexOf("{"),
    b = cleaned.lastIndexOf("}");
  if (a === -1 || b === -1) throw new Error("IA não retornou JSON válido.");
  cleaned = cleaned.slice(a, b + 1);

  try {
    return JSON.parse(cleaned);
  } catch (_) {
    cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

    let fixed = "";
    let inStr = false;
    let esc = false;
    for (let i = 0; i < cleaned.length; i++) {
      const ch = cleaned[i];
      if (esc) {
        fixed += ch;
        esc = false;
        continue;
      }
      if (ch === "\\") {
        fixed += ch;
        esc = true;
        continue;
      }
      if (ch === '"') {
        inStr = !inStr;
        fixed += ch;
        continue;
      }
      if (inStr) {
        if (ch === "\n") {
          fixed += "\\n";
          continue;
        }
        if (ch === "\r") {
          fixed += "\\r";
          continue;
        }
        if (ch === "\t") {
          fixed += "\\t";
          continue;
        }
      }
      fixed += ch;
    }
    cleaned = fixed;

    cleaned = cleaned.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");

    try {
      return JSON.parse(cleaned);
    } catch (_2) {
      let openBraces = 0,
        openBrackets = 0,
        inString = false,
        lastChar = "";
      for (const ch of cleaned) {
        if (ch === '"' && lastChar !== "\\") inString = !inString;
        if (!inString) {
          if (ch === "{") openBraces++;
          if (ch === "}") openBraces--;
          if (ch === "[") openBrackets++;
          if (ch === "]") openBrackets--;
        }
        lastChar = ch;
      }

      if (inString) {
        const lastQuote = cleaned.lastIndexOf('"');
        if (lastQuote > 0) {
          cleaned = cleaned.slice(0, lastQuote) + '"';
          openBraces = 0;
          openBrackets = 0;
          inString = false;
          lastChar = "";
          for (const ch of cleaned) {
            if (ch === '"' && lastChar !== "\\") inString = !inString;
            if (!inString) {
              if (ch === "{") openBraces++;
              if (ch === "}") openBraces--;
              if (ch === "[") openBrackets++;
              if (ch === "]") openBrackets--;
            }
            lastChar = ch;
          }
          if (inString) cleaned += '"';
        }
      }

      cleaned = cleaned.replace(/,\s*$/, "");
      for (let i = 0; i < openBrackets; i++) cleaned += "]";
      for (let i = 0; i < openBraces; i++) cleaned += "}";

      try {
        return JSON.parse(cleaned);
      } catch (e: any) {
        console.error("[extractJson] Raw AI output (first 500):", text.substring(0, 500));
        throw new Error(`JSON inválido da IA: ${e.message}`);
      }
    }
  }
}

// ── Detecta tipo de provider ──
function resolveProviderType(p: any): string {
  const id = (p.id || "").toLowerCase();
  const model = (p.model || "").toLowerCase();
  const base = (p.baseUrl || "").toLowerCase();

  if (id === "anthropic" || model.includes("claude")) return "anthropic";
  if (id === "google" || id === "gemini" || model.startsWith("gemini")) return "google";
  if (id === "xai" || id === "grok" || model.includes("grok") || base.includes("x.ai")) return "xai";
  if (id === "deepseek" || model.includes("deepseek") || base.includes("deepseek")) return "deepseek";
  if (id === "groq" || base.includes("groq.com")) return "groq";
  if (id === "agentrouter" || base.includes("agentrouter.org")) return "openrouter"; // OpenAI-compatible
  if (id === "moonshot" || base.includes("moonshot.ai")) return "moonshot";
  if (id === "openrouter" || base.includes("openrouter")) return "openrouter";
  if (id === "zai" || id === "z.ai" || base.includes("z.ai")) return "zai";
  return "openai";
}

const PROVIDER_URLS: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com",
  google: "https://generativelanguage.googleapis.com",
  xai: "https://api.x.ai/v1",
  deepseek: "https://api.deepseek.com",
  groq: "https://api.groq.com/openai/v1",
  openrouter: "https://openrouter.ai/api/v1",
  zai: "https://api.z.ai/api/paas/v4",
  agentrouter: "https://agentrouter.org/v1",
  moonshot: "https://api.moonshot.ai/v1",
};

// ── Google Gemini API call ──
async function callGoogleGemini(p: any, systemPrompt: string, userContent: string): Promise<string> {
  const model = p.model || "gemini-2.5-flash";
  const baseUrl = (p.baseUrl || PROVIDER_URLS.google).replace(/\/+$/, "");
  const url = `${baseUrl}/v1beta/models/${model}:generateContent?key=${p.key}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userContent }] }],
        generationConfig: { maxOutputTokens: 8192, responseMimeType: "application/json" },
      }),
    });
  } catch (fetchErr: any) {
    throw new Error(`Google fetch failed: ${fetchErr.message}`);
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json") && !contentType.includes("text/json")) {
    const text = await res.text().catch(() => "(unreadable body)");
    throw new Error(`Google returned non-JSON (${res.status} ${contentType}): ${text.slice(0, 300)}`);
  }

  let data: any;
  try {
    data = await res.json();
  } catch (parseErr: any) {
    throw new Error(`Google JSON parse failed (${res.status}): ${parseErr.message}`);
  }

  if (!res.ok) {
    const err = new Error(data?.error?.message || `Google HTTP ${res.status}`);
    (err as any).status = res.status;
    throw err;
  }

  const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  if (!answer && data.candidates?.[0]?.finishReason === "SAFETY") {
    throw new Error("Google blocked response due to safety filters.");
  }
  return answer;
}

// ── Google Gemini Streaming ──
async function callGoogleGeminiStream(p: any, systemPrompt: string, userContent: string): Promise<ReadableStream> {
  const model = p.model || "gemini-2.5-flash";
  const baseUrl = (p.baseUrl || PROVIDER_URLS.google).replace(/\/+$/, "");
  const url = `${baseUrl}/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${p.key}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userContent }] }],
        generationConfig: { maxOutputTokens: 8192 },
      }),
    });
  } catch (fetchErr: any) {
    throw new Error(`Google stream fetch failed: ${fetchErr.message}`);
  }

  if (!res.ok) {
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json") && !contentType.includes("text/json")) {
      const text = await res.text().catch(() => "(unreadable body)");
      throw new Error(`Google stream non-JSON error (${res.status} ${contentType}): ${text.slice(0, 300)}`);
    }
    let data: any;
    try {
      data = await res.json();
    } catch {
      data = {};
    }
    throw new Error(data?.error?.message || `Google stream HTTP ${res.status}`);
  }

  if (!res.body) throw new Error("Google stream returned empty body");

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  return new ReadableStream({
    async pull(controller) {
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || "";
            if (text) {
              const chunk = JSON.stringify({ choices: [{ delta: { content: text } }] });
              controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
            }
          } catch {}
        }
      }
    },
  });
}

// ── Anthropic Claude API call ──
async function callAnthropic(p: any, systemPrompt: string, userContent: string): Promise<string> {
  const baseUrl = (p.baseUrl || "https://api.anthropic.com").replace(/\/+$/, "");

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "x-api-key": p.key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: p.model || "claude-sonnet-4-20250514",
        max_tokens: 8192,
        system: systemPrompt,
        messages: [{ role: "user", content: userContent }],
      }),
    });
  } catch (fetchErr: any) {
    throw new Error(`Anthropic fetch failed: ${fetchErr.message}`);
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json") && !contentType.includes("text/json")) {
    const text = await res.text().catch(() => "(unreadable body)");
    throw new Error(`Anthropic returned non-JSON (${res.status} ${contentType}): ${text.slice(0, 300)}`);
  }

  let data: any;
  try {
    data = await res.json();
  } catch (parseErr: any) {
    throw new Error(`Anthropic JSON parse failed (${res.status}): ${parseErr.message}`);
  }

  if (!res.ok) {
    const err = new Error(data?.error?.message || `Anthropic HTTP ${res.status}`);
    (err as any).status = res.status;
    throw err;
  }
  return data.content?.[0]?.text || "";
}

// ── Anthropic Claude Streaming ──
async function callAnthropicStream(p: any, systemPrompt: string, userContent: string): Promise<ReadableStream> {
  const baseUrl = (p.baseUrl || "https://api.anthropic.com").replace(/\/+$/, "");

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "x-api-key": p.key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: p.model || "claude-sonnet-4-20250514",
        max_tokens: 8192,
        stream: true,
        system: systemPrompt,
        messages: [{ role: "user", content: userContent }],
      }),
    });
  } catch (fetchErr: any) {
    throw new Error(`Anthropic stream fetch failed: ${fetchErr.message}`);
  }

  if (!res.ok) {
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json") && !contentType.includes("text/json")) {
      const text = await res.text().catch(() => "(unreadable body)");
      throw new Error(`Anthropic stream non-JSON error (${res.status} ${contentType}): ${text.slice(0, 300)}`);
    }
    let data: any;
    try {
      data = await res.json();
    } catch {
      data = {};
    }
    throw new Error(data?.error?.message || `Anthropic stream HTTP ${res.status}`);
  }

  if (!res.body) throw new Error("Anthropic stream returned empty body");

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  return new ReadableStream({
    async pull(controller) {
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.type === "content_block_delta") {
              const text = parsed.delta?.text || "";
              if (text) {
                const chunk = JSON.stringify({ choices: [{ delta: { content: text } }] });
                controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
              }
            }
          } catch {}
        }
      }
    },
  });
}

// ── OpenAI-compatible API call ──
async function callOpenAICompatible(
  p: any,
  providerType: string,
  systemPrompt: string,
  userContent: string,
): Promise<string> {
  const baseUrl = (p.baseUrl || PROVIDER_URLS[providerType] || PROVIDER_URLS.openai).replace(/\/+$/, "");

  const body: any = {
    model: p.model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
  };

  if (providerType === "moonshot") {
    body.max_completion_tokens = 8192;
  } else {
    body.max_tokens = 8192;
  }

  if (providerType === "openai" || providerType === "openrouter" || providerType === "deepseek") {
    body.response_format = { type: "json_object" };
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${p.key}`,
    "Content-Type": "application/json",
  };

  if (providerType === "openrouter") {
    headers["HTTP-Referer"] = "https://ilimitadolov.app";
    headers["X-Title"] = "Ilimitado Lov";
  }

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  } catch (fetchErr: any) {
    throw new Error(`${providerType} fetch failed: ${fetchErr.message}`);
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json") && !contentType.includes("text/json")) {
    const text = await res.text().catch(() => "(unreadable body)");
    throw new Error(`${providerType} returned non-JSON (${res.status} ${contentType}): ${text.slice(0, 300)}`);
  }

  let data: any;
  try {
    data = await res.json();
  } catch (parseErr: any) {
    throw new Error(`${providerType} JSON parse failed (${res.status}): ${parseErr.message}`);
  }

  if (!res.ok) {
    const err = new Error(data?.error?.message || `${providerType} HTTP ${res.status}`);
    (err as any).status = res.status;
    throw err;
  }
  return data.choices?.[0]?.message?.content || "";
}

// ── OpenAI-compatible Streaming ──
async function callOpenAICompatibleStream(
  p: any,
  providerType: string,
  systemPrompt: string,
  userContent: string,
): Promise<ReadableStream> {
  const baseUrl = (p.baseUrl || PROVIDER_URLS[providerType] || PROVIDER_URLS.openai).replace(/\/+$/, "");

  const body: any = {
    model: p.model,
    stream: true,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
  };

  if (providerType === "moonshot") {
    body.max_completion_tokens = 8192;
  } else {
    body.max_tokens = 8192;
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${p.key}`,
    "Content-Type": "application/json",
  };

  if (providerType === "openrouter") {
    headers["HTTP-Referer"] = "https://ilimitadolov.app";
    headers["X-Title"] = "Ilimitado Lov";
  }

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  } catch (fetchErr: any) {
    throw new Error(`${providerType} stream fetch failed: ${fetchErr.message}`);
  }

  if (!res.ok) {
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json") && !contentType.includes("text/json")) {
      const text = await res.text().catch(() => "(unreadable body)");
      throw new Error(`${providerType} stream non-JSON error (${res.status} ${contentType}): ${text.slice(0, 300)}`);
    }
    let data: any;
    try {
      data = await res.json();
    } catch {
      data = {};
    }
    throw new Error(data?.error?.message || `${providerType} stream HTTP ${res.status}`);
  }

  if (!res.body) throw new Error(`${providerType} stream returned empty body`);

  return res.body;
}

// ── Persiste métricas de tokens no banco ──
async function saveTokenMetrics(
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  durationMs: number,
  functionName = "unknown",
) {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    await supabase.from("token_metrics").insert({
      provider,
      model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: inputTokens + outputTokens,
      duration_ms: durationMs,
      function_name: functionName,
    });
  } catch (e: any) {
    console.warn(`[saveTokenMetrics] Falha ao salvar: ${e.message}`);
  }
}

// ── Chama IA com fallback multi-provider (com métricas de tokens) ──
export async function callAIWithFallback(
  providerChain: any[],
  systemPrompt: string,
  userContent: string,
  functionName = "unknown",
): Promise<{ answer: string; usedProvider: string; usedModel: string }> {
  if (!providerChain?.length) throw new Error("providerChain vazia.");
  let lastError: Error | null = null;

  const inputTokens = estimateTokens(systemPrompt) + estimateTokens(userContent);

  for (const p of providerChain) {
    try {
      const providerType = resolveProviderType(p);
      const startTime = Date.now();
      const answer = await withRetry(
        async () => {
          switch (providerType) {
            case "google":
              return await callGoogleGemini(p, systemPrompt, userContent);
            case "anthropic":
              return await callAnthropic(p, systemPrompt, userContent);
            default:
              return await callOpenAICompatible(p, providerType, systemPrompt, userContent);
          }
        },
        { maxRetries: 4, baseDelay: 3000, retryOn: isRetryableError },
      );

      const elapsed = Date.now() - startTime;
      const outputTokens = estimateTokens(answer);
      console.log(
        `[TOKEN_METRICS] provider=${p.id} model=${p.model} input=${inputTokens} output=${outputTokens} total=${inputTokens + outputTokens} time=${elapsed}ms`,
      );

      // Persist to DB (fire-and-forget)
      saveTokenMetrics(p.id || providerType, p.model, inputTokens, outputTokens, elapsed, functionName);

      return { answer, usedProvider: p.id || providerType, usedModel: p.model };
    } catch (e: any) {
      console.error(`[FALLBACK] Falha em ${p.id} (${p.model}): ${e.message}`);
      lastError = new Error(`[${p.id}] ${e.message}`);
    }
  }
  throw new Error(`Todos os provedores falharam. Último erro: ${lastError?.message}`);
}

// ── Chama IA com streaming ──
export async function callAIStreamingWithFallback(
  providerChain: any[],
  systemPrompt: string,
  userContent: string,
): Promise<{ stream: ReadableStream; usedProvider: string; usedModel: string }> {
  if (!providerChain?.length) throw new Error("providerChain vazia.");
  let lastError: Error | null = null;

  for (const p of providerChain) {
    try {
      const providerType = resolveProviderType(p);
      let stream: ReadableStream;

      switch (providerType) {
        case "google":
          stream = await callGoogleGeminiStream(p, systemPrompt, userContent);
          break;
        case "anthropic":
          stream = await callAnthropicStream(p, systemPrompt, userContent);
          break;
        default:
          stream = await callOpenAICompatibleStream(p, providerType, systemPrompt, userContent);
          break;
      }

      return { stream, usedProvider: p.id || providerType, usedModel: p.model };
    } catch (e: any) {
      console.error(`[STREAM FALLBACK] Falha em ${p.id} (${p.model}): ${e.message}`);
      lastError = new Error(`[${p.id}] ${e.message}`);
    }
  }
  throw new Error(`Todos os provedores falharam. Último erro: ${lastError?.message}`);
}

// ── Helper: cria SSE writer ──
export function createSSEWriter() {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController | null = null;

  const stream = new ReadableStream({
    start(c) {
      controller = c;
    },
  });

  return {
    stream,
    write(event: string, data: any) {
      if (controller) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      }
    },
    close() {
      if (controller) controller.close();
    },
  };
}

const PROTECTED = ["src/components/ui/", "src/integrations/supabase/types.ts", "package-lock.json"];
export function isProtected(p: string) {
  return PROTECTED.some((pp) => p === pp || p.startsWith(pp));
}

export function parseRepo(input: string) {
  const s = (input || "").trim();
  if (s.includes("github.com/")) {
    const u = new URL(s);
    const parts = u.pathname.split("/").filter(Boolean);
    return { owner: parts[0], repo: parts[1].replace(/\.git$/i, "") };
  }
  const parts = s.split("/").filter(Boolean);
  if (parts.length !== 2) throw new Error("Use owner/repo.");
  return { owner: parts[0], repo: parts[1] };
}
