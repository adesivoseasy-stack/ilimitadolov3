import {
  corsHeaders, getSecrets, getRepoPaths, getFileContent,
  extractJson, extractJsonWithRetry, callAIWithFallback, isProtected, parseRepo,
  aiRankFiles, buildCompactTree, formatConversationHistory,
  generateProjectSystemPrompt, buildFileBlock, findImporters, findPotentialImporters, validateSession, incrementMessageCount,
  applyDiffOperations, checkRateLimit,
} from "../_shared/helpers.ts";

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
    const {
      repoInput, branch = "main", prompt, systemPrompt,
      providerChain, attachments = [], conversationHistory = [],
    } = await req.json();

    if (!repoInput || !prompt) throw new Error("repoInput e prompt são obrigatórios.");
    const { owner, repo } = parseRepo(repoInput);
    const token = secrets.githubToken;
    if (!token) throw new Error("GitHub token não encontrado.");

    // 1) Listar arquivos e ranking por IA
    const allPaths = await getRepoPaths(owner, repo, branch, token);
    const treeString = buildCompactTree(allPaths);
    const selectedPaths = (await aiRankFiles(allPaths, prompt, conversationHistory, providerChain, owner, repo, branch, token))
      .filter(p => !isProtected(p));

    // 2) Baixar conteúdo dos arquivos selecionados
    let files = await Promise.all(
      selectedPaths.map(async p => ({
        path: p,
        content: (await getFileContent(owner, repo, branch, p, token)) || "",
      }))
    );

    // 2b) Find importers
    const existingPaths = new Set(files.map(f => f.path));
    
    for (const f of [...files]) {
      const importers = findImporters(f.path, files);
      for (const impPath of importers) {
        if (!existingPaths.has(impPath)) {
          const content = await getFileContent(owner, repo, branch, impPath, token);
          if (content) {
            files.push({ path: impPath, content });
            existingPaths.add(impPath);
          }
        }
      }
    }

    const potentialImps = findPotentialImporters(selectedPaths, allPaths, existingPaths);
    if (potentialImps.length > 0) {
      const impFiles = await Promise.all(
        potentialImps.map(async p => ({
          path: p,
          content: (await getFileContent(owner, repo, branch, p, token)) || "",
        }))
      );
      const rankedNames = selectedPaths.map(r => r.split('/').pop()?.replace(/\.(tsx?|jsx?)$/, '') || '').filter(Boolean);
      for (const impFile of impFiles) {
        if (existingPaths.has(impFile.path)) continue;
        const imports = rankedNames.some(name => {
          return new RegExp(`from\\s+['"][^'"]*${name}['"]`).test(impFile.content);
        });
        if (imports) {
          files.push(impFile);
          existingPaths.add(impFile.path);
        }
      }
    }

    // 3) Dynamic system prompt + chamar IA with diff format
    const defaultPrompt = `Você é o Bubbly, agente de código especialista em React/TypeScript/Tailwind.

⚠️ REGRAS OBRIGATÓRIAS:
1. ESCOPO MÍNIMO: Modifique APENAS as linhas relacionadas ao pedido. CADA linha extra é um BUG.
2. PROIBIÇÕES: NÃO altere cores, temas, layouts, estilos, dados ou estruturas sem pedido explícito. NÃO remova, renomeie, reformate ou "melhore" código existente. NÃO crie nem apague arquivos sem pedido explícito. NÃO insira comentários desnecessários.
3. PRESERVAÇÃO: Preserve o código original — aplique SOMENTE as alterações mínimas via operações search/replace.
4. AUTO-REVISÃO: Antes de responder, verifique cada operação. Se não é necessária → REMOVA.
5. AMBIGUIDADE E RISCO: Aja conservadoramente em pedidos vagos. Alerte sobre riscos de quebra no campo "notes".

Use a árvore do repositório para entender dependências e imports.

Retorne APENAS JSON válido:
{
  "commitMessage": "string",
  "changes": [{ "path": "caminho", "operations": [{ "search": "trecho original", "replace": "trecho novo" }] }],
  "summary": "o que foi feito",
  "changesDescription": [{"path": "caminho", "description": "o que mudou"}],
  "notes": "string"
}

Para arquivos NOVOS: use search vazio ("") e conteúdo completo em replace.`;

    const dynamicSysPrompt = await generateProjectSystemPrompt(
      owner, repo, branch, token, allPaths,
      systemPrompt || defaultPrompt
    );

    const historyBlock = formatConversationHistory(conversationHistory);
    const { block: fileBlock } = buildFileBlock(files, 50000);

    let userContent = `${historyBlock}PROMPT DO USUÁRIO:\n${prompt}\n\nESTRUTURA DO REPOSITÓRIO:\n${treeString}\n\nARQUIVOS:\n${fileBlock}`;

    for (const a of attachments) {
      if (a?.kind === "text" && a.text) userContent += `\n\nANEXO (${a.name}):\n${a.text}`;
    }

    const { answer, usedProvider, usedModel } = await callAIWithFallback(
      providerChain, dynamicSysPrompt, userContent, 'propose'
    );

    // Retry on invalid JSON
    const proposal = await extractJsonWithRetry(answer, providerChain, dynamicSysPrompt);

    // Increment message count
    if (session.licenseId) await incrementMessageCount(session.licenseId);

    // Apply diffs to produce full file content for the proposal
    const safeChanges: any[] = [];
    for (const c of (proposal.changes || [])) {
      if (isProtected(c.path)) continue;
      if (c.operations && Array.isArray(c.operations)) {
        if (c.operations.length === 1 && c.operations[0].search === '') {
          safeChanges.push({ path: c.path, newContent: c.operations[0].replace });
        } else {
          const original = files.find(f => f.path === c.path)?.content
            || await getFileContent(owner, repo, branch, c.path, token) || '';
          const newContent = applyDiffOperations(original, c.operations, false);
          // Only include if content actually changed
          if (newContent !== original) {
            safeChanges.push({ path: c.path, newContent });
          } else {
            console.warn(`[propose] Skipping ${c.path}: no diff applied (content unchanged)`);
          }
        }
      } else if (c.newContent) {
        // Fallback: old format
        safeChanges.push({ path: c.path, newContent: c.newContent });
      }
    }

    return Response.json(
      {
        ok: true,
        proposal: {
          commitMessage: proposal.commitMessage,
          notes: proposal.notes || "",
          summary: proposal.summary || "",
          changesDescription: proposal.changesDescription || [],
          changes: safeChanges,
        },
        usedProvider,
        usedModel,
      },
      { headers: corsHeaders }
    );
  } catch (e: any) {
    return Response.json({ ok: false, error: e.message }, { status: 400, headers: corsHeaders });
  }
});
