import { corsHeaders, getSecrets, ghCommitMany, isProtected, parseRepo, validateSession, checkRateLimit } from "../_shared/helpers.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Validate license session
    const session = await validateSession(req);
    if (!session.valid) {
      return Response.json({ ok: false, error: session.error }, { status: 403, headers: corsHeaders });
    }

    if (session.licenseId && !checkRateLimit(session.licenseId).allowed) {
      return Response.json({ ok: false, error: "Rate limit: máximo 2 requisições por segundo. Aguarde um momento." }, { status: 429, headers: corsHeaders });
    }

    const secrets = getSecrets(req);
    const { repoInput, branch = "main", commitMessage, changes } = await req.json();

    if (!changes?.length) throw new Error("Sem mudanças para commitar.");
    const token = secrets.githubToken;
    if (!token) throw new Error("GitHub token não encontrado.");

    const { owner, repo } = parseRepo(repoInput);
    const safeChanges = changes.filter((c: any) => !isProtected(c.path));
    if (!safeChanges.length) throw new Error("Todas as mudanças foram bloqueadas (arquivos protegidos).");

    const result = await ghCommitMany(owner, repo, branch, commitMessage || "Update via Bubbly", safeChanges, token);

    return Response.json({ ok: true, result }, { headers: corsHeaders });
  } catch (e: any) {
    return Response.json({ ok: false, error: e.message }, { status: 400, headers: corsHeaders });
  }
});
