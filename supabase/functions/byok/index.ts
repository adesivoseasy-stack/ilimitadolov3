import {
  corsHeaders, getSecrets, getRepoPaths, getFileContent,
  extractJson, extractJsonWithRetry, callAIWithFallback, ghCommitMany, isProtected, parseRepo,
  aiRankFiles, buildCompactTree, formatConversationHistory, createSSEWriter,
  generateProjectSystemPrompt,
  findImporters, findPotentialImporters, buildFileBlock, validateSession, incrementMessageCount,
  applyDiffOperations, checkRateLimit,
} from "../_shared/helpers.ts";

const BASE_SYSTEM_PROMPT = `Você é o Bubbly, um agente de código especialista em projetos web modernos com React/TypeScript/Tailwind hospedados no Lovable.

REGRAS FUNDAMENTAIS (OBRIGATÓRIAS — violá-las é ERRO GRAVE):

⚠️ REGRA #1 — ESCOPO MÍNIMO (MAIS IMPORTANTE DE TODAS):
- Modifique APENAS as linhas diretamente relacionadas ao pedido do usuário.
- Se o usuário pedir "mude o título", altere SOMENTE o título. NÃO toque em NADA mais.
- Se o usuário pedir "adicione um botão", adicione APENAS o botão. NÃO reformate, refatore ou "melhore" o resto.
- CADA LINHA que você alterar além do necessário é um BUG que você está introduzindo.

⚠️ REGRA #2 — PROIBIÇÕES ABSOLUTAS (sem pedido explícito do usuário):
- NÃO altere cores, temas, estilos, backgrounds, paletas, CSS variables
- NÃO remova, apague ou simplifique dados existentes (produtos, listas, cards, seções, textos)
- NÃO renomeie componentes, variáveis, funções ou classes
- NÃO reorganize layouts, reordene imports ou mude formatação
- NÃO remova imports, dependências ou código "não utilizado"
- NÃO adicione features, validações ou melhorias não solicitadas
- NÃO mude aspas simples para duplas ou vice-versa
- NÃO altere indentação ou espaçamento de código não modificado
- NÃO crie arquivos novos a menos que o pedido exija explicitamente
- NÃO apague/remova arquivos sem pedido explícito
- NÃO insira comentários desnecessários ou redundantes

⚠️ REGRA #3 — FORMATO DE RESPOSTA POR DIFF:
- Para cada arquivo modificado, retorne APENAS as operações de diff (search/replace).
- O campo "search" deve conter o trecho EXATO do código original que será substituído.
- O campo "replace" deve conter o trecho novo que substituirá o original.
- Use trechos de contexto suficientes para identificar unicamente o local da mudança (3-5 linhas antes/depois).
- Para NOVOS arquivos, use search vazio ("") e coloque o conteúdo completo em replace.

⚠️ REGRA #4 — AUTO-REVISÃO OBRIGATÓRIA:
Antes de responder, verifique CADA operação de diff:
1. O search corresponde EXATAMENTE ao código original?
2. Cada alteração é NECESSÁRIA para o pedido? Se não → REMOVA a operação
3. Imports corretos? Módulos existem na árvore?
4. Interfaces/props mudaram? Atualize APENAS os consumidores afetados.

⚠️ REGRA #5 — PEDIDOS AMBÍGUOS E RISCO:
- Se o pedido é ambíguo ou vago, aja de forma CONSERVADORA.
- Se a mudança pode causar quebra crítica, ALERTE no campo "notes".

REGRAS ADICIONAIS:
- Use a árvore do repositório para entender dependências e imports.
- Considere o histórico de conversa para manter contexto.

Responda SEMPRE em JSON válido no formato:
{
  "summary": "breve descrição do que foi feito",
  "changesDescription": [{"path": "caminho/arquivo", "description": "o que mudou neste arquivo"}],
  "files": [
    {
      "path": "caminho/do/arquivo.tsx",
      "operations": [
        { "search": "trecho exato do original", "replace": "trecho com a mudança" }
      ]
    }
  ],
  "commitMessage": "feat: descrição curta",
  "notes": "alertas, suposições ou riscos identificados (opcional)"
}

IMPORTANTE: Para arquivos NOVOS, use uma única operação com search vazio:
{ "path": "novo/arquivo.tsx", "operations": [{ "search": "", "replace": "conteúdo completo" }] }`;

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
      message, projectId, githubRepo, lovableToken,
      currentPage = "/", providerChain, systemPrompt,
      cachedPaths, conversationHistory = [], stream: wantStream = false,
      mode = "auto", // "auto" | "plan"
    } = await req.json();

    if (!message) throw new Error("Mensagem vazia.");

    const token = secrets.githubToken;
    const lToken = lovableToken || secrets.lovableToken;

    // ── Plan mode: return plan without executing ──
    if (mode === "plan") {
      let owner = "", repo = "";
      try {
        const parsed = parseRepo(githubRepo || "");
        owner = parsed.owner; repo = parsed.repo;
      } catch {
        return Response.json({ ok: false, error: "GitHub repo não identificado." }, { status: 400, headers: corsHeaders });
      }

      let allPaths: string[] = [];
      let treeString = "";
      if (token) {
        allPaths = cachedPaths?.length ? cachedPaths : await getRepoPaths(owner, repo, "main", token);
        treeString = buildCompactTree(allPaths);
      }

      const historyBlock = formatConversationHistory(conversationHistory);
      const planPrompt = `${historyBlock}PEDIDO DO USUÁRIO:\n${message}\n\nESTRUTURA DO REPOSITÓRIO:\n${treeString}\n\nAnalise o pedido e retorne um PLANO em JSON:
{
  "plan": "Descrição do que será feito",
  "steps": ["passo 1", "passo 2", ...],
  "filesToModify": ["arquivo1.tsx", "arquivo2.ts"],
  "filesToCreate": ["novo-arquivo.tsx"],
  "risks": "possíveis problemas ou cuidados"
}`;

      const dynamicSysPrompt = token
        ? await generateProjectSystemPrompt(owner, repo, "main", token, allPaths, "Você é o Bubbly, um agente que planeja alterações de código. Retorne APENAS JSON válido.")
        : "Você é o Bubbly, um agente que planeja alterações de código. Retorne APENAS JSON válido.";

      const { answer, usedProvider, usedModel } = await callAIWithFallback(
        providerChain, dynamicSysPrompt, planPrompt, 'byok-plan'
      );

      const plan = extractJson(answer);
      return Response.json({
        ok: true, plan, repoPaths: allPaths, usedProvider, usedModel,
      }, { headers: corsHeaders });
    }

    // ── Auto mode (streaming or not) ──
    const processRequest = async (sse?: ReturnType<typeof createSSEWriter>) => {
      let owner = "", repo = "";
      try {
        const parsed = parseRepo(githubRepo || "");
        owner = parsed.owner; repo = parsed.repo;
      } catch {
        if (sse) { sse.write("error", { error: "GitHub repo não identificado." }); sse.close(); return; }
        throw new Error("GitHub repo não identificado.");
      }

      sse?.write("progress", { step: "repo", icon: "folder-tree", message: `Conectando ao repositório ${owner}/${repo}...` });

      let defaultBranch = "main";
      if (token) {
        try {
          const repoData = await (await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
            headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
          })).json();
          defaultBranch = repoData?.default_branch || "main";
        } catch {}
      }

      let contextFiles: { path: string; content: string }[] = [];
      let allPaths: string[] = [];
      let treeString = "";
      if (token) {
        try {
          sse?.write("progress", { step: "tree", icon: "folder-tree", message: "Indexando arquivos..." });
          allPaths = cachedPaths?.length ? cachedPaths : await getRepoPaths(owner, repo, defaultBranch, token);
          treeString = buildCompactTree(allPaths);

          sse?.write("progress", { step: "ranking", icon: "brain", message: "Selecionando arquivos relevantes..." });
          const ranked = await aiRankFiles(allPaths, message, conversationHistory, providerChain, owner, repo, defaultBranch, token);

          sse?.write("progress", { step: "ranked_files", icon: "file-check", message: `Arquivos selecionados: ${ranked.join(', ')}` });
          contextFiles = await Promise.all(
            ranked.map(async p => ({
              path: p,
              content: (await getFileContent(owner, repo, defaultBranch, p, token)) || "",
            }))
          );

          // Find importers
          const existingPaths = new Set(contextFiles.map(f => f.path));

          for (const f of contextFiles) {
            const imp = findImporters(f.path, contextFiles);
            for (const ip of imp) if (!existingPaths.has(ip)) {
              const content = await getFileContent(owner, repo, defaultBranch, ip, token);
              if (content) { contextFiles.push({ path: ip, content }); existingPaths.add(ip); }
            }
          }

          const potentialImporters = findPotentialImporters(ranked, allPaths, existingPaths);
          if (potentialImporters.length > 0) {
            sse?.write("progress", { step: "importers", icon: "file-check", message: `Verificando ${potentialImporters.length} dependentes...` });
            const importerFiles = await Promise.all(
              potentialImporters.map(async p => ({
                path: p,
                content: (await getFileContent(owner, repo, defaultBranch, p, token)) || "",
              }))
            );
            const rankedNames = ranked.map(r => r.split('/').pop()?.replace(/\.(tsx?|jsx?)$/, '') || '').filter(Boolean);
            for (const impFile of importerFiles) {
              if (existingPaths.has(impFile.path)) continue;
              const imports = rankedNames.some(name => {
                return [
                  new RegExp(`from\\s+['"][^'"]*${name}['"]`),
                  new RegExp(`import\\(['"][^'"]*${name}['"]\\)`),
                ].some(p => p.test(impFile.content));
              });
              if (imports) {
                contextFiles.push(impFile);
                existingPaths.add(impFile.path);
              }
            }
          }
        } catch (e: any) {
          sse?.write("progress", { step: "warning", icon: "alert-triangle", message: `Contexto parcial: ${e.message}` });
        }
      }

      // Dynamic system prompt
      sse?.write("progress", { step: "ai", icon: "sparkles", message: "Gerando alterações..." });

      const dynamicSysPrompt = token
        ? await generateProjectSystemPrompt(owner, repo, defaultBranch, token, allPaths, systemPrompt || BASE_SYSTEM_PROMPT)
        : (systemPrompt || BASE_SYSTEM_PROMPT);

      const historyBlock = formatConversationHistory(conversationHistory);

      const { block: fileBlock, includedCount, omittedCount } = contextFiles.length
        ? buildFileBlock(contextFiles, 50000)
        : { block: "(Repositório sem arquivos no contexto.)", includedCount: 0, omittedCount: 0 };

      if (omittedCount > 0) {
        sse?.write("progress", { step: "token_limit", icon: "alert-triangle", message: `${omittedCount} arquivos omitidos por limite de tokens (${includedCount} incluídos)` });
      }

      const userContent = `${historyBlock}PROMPT DO USUÁRIO:\n${message}\n\nPÁGINA ATUAL: ${currentPage}\n\nESTRUTURA DO REPOSITÓRIO:\n${treeString}\n\nARQUIVOS NO CONTEXTO:\n${fileBlock}`;

      let heartbeatId: number | undefined;
      if (sse) {
        heartbeatId = setInterval(() => {
          sse.write("heartbeat", { ts: Date.now() });
        }, 8000);
      }

      let answer = "";
      let usedProvider = "";
      let usedModel = "";

      try {
        const aiResponse = await callAIWithFallback(
          providerChain, dynamicSysPrompt, userContent, 'byok-auto'
        );
        answer = aiResponse.answer;
        usedProvider = aiResponse.usedProvider;
        usedModel = aiResponse.usedModel;
      } finally {
        if (heartbeatId) clearInterval(heartbeatId);
      }

      sse?.write("progress", { step: "parse", icon: "check", message: `Resposta recebida (${usedProvider}/${usedModel})` });

      const proposal = await extractJsonWithRetry(answer, providerChain, dynamicSysPrompt);

      // Increment message count
      if (session.licenseId) await incrementMessageCount(session.licenseId);

      // Apply diffs: convert operations to full file content
      let applied = false;
      let commitResult = null;
      if (proposal.files?.length && token) {
        sse?.write("progress", { step: "diff", icon: "file-diff", message: "Aplicando diffs nos arquivos..." });

        const safeChanges: { path: string; newContent: string }[] = [];
        const diffStats: { path: string; applied: number; failed: number; total: number; failedSearches?: string[] }[] = [];
        let totalSkipped = 0;

        for (const f of proposal.files) {
          if (isProtected(f.path)) continue;
          const cleanPath = f.path.startsWith("/") ? f.path.substring(1) : f.path;

          if (f.operations && Array.isArray(f.operations)) {
            // Diff mode: apply search/replace operations
            if (f.operations.length === 1 && f.operations[0].search === '') {
              // New file
              safeChanges.push({ path: cleanPath, newContent: f.operations[0].replace });
              diffStats.push({ path: cleanPath, applied: 1, failed: 0, total: 1 });
            } else {
              // Existing file: get original and apply diffs with stats
              const original = contextFiles.find(cf => cf.path === cleanPath)?.content
                || await getFileContent(owner, repo, defaultBranch, cleanPath, token) || '';
              const result = applyDiffOperations(original, f.operations, true);
              diffStats.push({ path: cleanPath, applied: result.applied, failed: result.failed, total: result.total, failedSearches: result.failedSearches });
              // Only include if content actually changed
              if (result.content !== original) {
                safeChanges.push({ path: cleanPath, newContent: result.content });
              } else {
                totalSkipped++;
                console.warn(`[byok] Skipping ${cleanPath}: no diff applied (content unchanged)`);
              }
            }
          } else if (f.content) {
            // Fallback: old format with full content
            safeChanges.push({ path: cleanPath, newContent: f.content });
            diffStats.push({ path: cleanPath, applied: 1, failed: 0, total: 1 });
          }
        }

        // Send diff stats via SSE
        sse?.write("diff_stats", { files: diffStats, totalApplied: safeChanges.length, totalSkipped });

        if (safeChanges.length) {
          sse?.write("progress", { step: "commit", icon: "git-commit", message: `Fazendo commit de ${safeChanges.length} arquivo(s) no GitHub...` });
          commitResult = await ghCommitMany(
            owner, repo, defaultBranch,
            proposal.commitMessage || proposal.summary || "Update via Bubbly",
            safeChanges, token
          );
          applied = true;
        } else if (proposal.files?.length) {
          // AI proposed changes but none actually modified files
          const failedInfo = diffStats.filter(d => d.failed > 0).map(d => `${d.path}: ${d.failed}/${d.total} falharam`).join(', ');
          sse?.write("warning", { message: `Nenhum diff aplicado com sucesso. ${failedInfo ? 'Detalhes: ' + failedInfo : 'Tente reformular o pedido.'}` });
        }
      }

      // Sync Lovable
      if (applied && projectId && lToken && projectId !== "unknown") {
        sse?.write("progress", { step: "sync", icon: "refresh-cw", message: "Sincronizando com Lovable..." });
        await fetch(`https://api.lovable.dev/projects/${projectId}/report_error`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: `Uncaught Error: Bubbly Sync ${Date.now()}`,
            error_type: "runtime",
            meta_data: { message: "Sync Trigger", filename: "src/main.tsx", lineno: 1, blankScreen: true },
          }),
        }).catch(console.error);

        sse?.write("progress", { step: "publish", icon: "rocket", message: "Publicando automaticamente..." });
        await new Promise(r => setTimeout(r, 8000));

        try {
          const publishRes = await fetch(`https://api.lovable.dev/projects/${projectId}/publish`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${lToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({}),
          });
          
          if (!publishRes.ok) {
            const deployRes = await fetch(`https://api.lovable.dev/projects/${projectId}/deployments`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${lToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ environment: "production" }),
            });
            
            if (deployRes.ok) {
              sse?.write("progress", { step: "published", icon: "check-circle", message: "✅ Publicado com sucesso!" });
            } else {
              sse?.write("progress", { step: "publish-warn", icon: "alert-triangle", message: "⚠️ Sincronizado, mas publish manual pode ser necessário." });
            }
          } else {
            sse?.write("progress", { step: "published", icon: "check-circle", message: "✅ Publicado com sucesso!" });
          }
        } catch (pubErr) {
          console.error("[byok] Auto-publish error:", pubErr);
          sse?.write("progress", { step: "publish-warn", icon: "alert-triangle", message: "⚠️ Sincronizado, publish automático não disponível." });
        }
      }

      const result = {
        ok: true,
        answer,
        applied,
        commit: commitResult,
        repoPaths: allPaths,
        summary: proposal.summary || "",
        changesDescription: proposal.changesDescription || [],
        usedProvider,
        usedModel,
      };

      if (sse) {
        sse.write("result", result);
        sse.close();
      }
      return result;
    };

    // Streaming mode
    if (wantStream) {
      const sse = createSSEWriter();
      processRequest(sse).catch((e: any) => {
        sse.write("error", { error: e.message });
        sse.close();
      });

      return new Response(sse.stream, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    // Non-streaming
    const result = await processRequest();
    return Response.json(result, { headers: corsHeaders });
  } catch (e: any) {
    return Response.json({ ok: false, error: e.message }, { status: 400, headers: corsHeaders });
  }
});
