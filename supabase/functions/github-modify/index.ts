import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json; charset=utf-8',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message, github_token, github_repo, branch = 'main' } = await req.json()

    console.log(`[github-modify] Received: repo="${github_repo}", branch="${branch}", message="${message?.slice(0, 50)}"`)

    if (!message || !github_token || !github_repo) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios: message, github_token, github_repo' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate repo format (must be "owner/repo")
    const repoMatch = github_repo.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/)
    if (!repoMatch) {
      return new Response(
        JSON.stringify({ error: `Formato de repositório inválido: "${github_repo}". Esperado: "usuario/repositorio"` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Read AI API key — prefer LOVABLE_API_KEY, fallback to agent_router_token from DB
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')
    let aiApiKey = lovableApiKey || ''
    let aiBaseUrl = 'https://ai.gateway.lovable.dev/v1/chat/completions'
    let aiModel = 'google/gemini-2.5-flash'

    if (!lovableApiKey) {
      // Fallback: try agent_router_token from system_config
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      const { data: configData, error: configError } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'agent_router_token')
        .single()

      if (configError || !configData?.value) {
        console.error('No AI API key available:', configError?.message)
        return new Response(
          JSON.stringify({ error: 'Nenhuma chave de IA configurada.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      aiApiKey = configData.value
      aiBaseUrl = 'https://agentrouter.org/v1/chat/completions'
      aiModel = 'gpt-5'
    }

    console.log(`[github-modify] Using AI: ${lovableApiKey ? 'Lovable Gateway' : 'AgentRouter'}, model: ${aiModel}`)

    // Debug token info (safe - only prefix/suffix)
    const cleanToken = github_token.trim().replace(/\n/g, '').replace(/\r/g, '')
    console.log(`[github-modify] Token info: length=${cleanToken.length}, prefix="${cleanToken.substring(0, 7)}", suffix="${cleanToken.substring(cleanToken.length - 4)}"`)

    const ghHeaders = {
      'Authorization': `token ${cleanToken}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'IlimitadoLov-v7',
      'X-GitHub-Api-Version': '2022-11-28',
    }

    // 0. First check if the token itself is valid
    const userRes = await fetch('https://api.github.com/user', { headers: ghHeaders })
    if (!userRes.ok) {
      console.error(`[github-modify] Token invalid: ${userRes.status}`)
      return new Response(
        JSON.stringify({ 
          error: `Token GitHub inválido (status ${userRes.status}). Verifique se o token está correto e não expirou.`,
          hint: 'Gere um novo token em github.com/settings/tokens com permissão "repo".'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const userData = await userRes.json()
    console.log(`[github-modify] Authenticated as: ${userData.login}`)

    // 0b. Verify repo access
    const repoCheckRes = await fetch(`https://api.github.com/repos/${github_repo}`, { headers: ghHeaders })
    if (!repoCheckRes.ok) {
      const errData = await repoCheckRes.json()
      console.error(`[github-modify] Repo check failed: ${repoCheckRes.status} - ${errData.message}`)
      
      let repoHint = ''
      if (repoCheckRes.status === 404) {
        const reposRes = await fetch('https://api.github.com/user/repos?per_page=5&sort=updated', { headers: ghHeaders })
        if (reposRes.ok) {
          const repos = await reposRes.json()
          const repoNames = repos.map((r: any) => r.full_name).join(', ')
          repoHint = ` Repos acessíveis: ${repoNames || 'nenhum'}.`
          console.log(`[github-modify] User repos: ${repoNames}`)
        }
      }
      
      return new Response(
        JSON.stringify({ 
          error: repoCheckRes.status === 404 
            ? `Repositório "${github_repo}" não encontrado para o usuário "${userData.login}".${repoHint}`
            : `GitHub erro (${repoCheckRes.status}): ${errData.message}`,
          hint: 'Verifique se o repositório existe e se o token tem permissão "repo".'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. Fetch repo tree
    console.log(`[github-modify] Fetching tree for ${github_repo}@${branch}`)
    const treeRes = await fetch(
      `https://api.github.com/repos/${github_repo}/git/trees/${branch}?recursive=1`,
      { headers: ghHeaders }
    )
    if (!treeRes.ok) {
      const err = await treeRes.json()
      console.error(`[github-modify] Tree fetch failed: ${treeRes.status} - ${err.message}`)
      return new Response(
        JSON.stringify({ error: `Branch "${branch}" não encontrada no repositório "${github_repo}". Verifique o nome do branch.` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const treeData = await treeRes.json()

    // 2. Filter relevant files — limit to avoid WAF blocking large payloads
    const allRelevantFiles = treeData.tree.filter((file: any) =>
      file.type === 'blob' &&
      (file.path.startsWith('src/') ||
       file.path.startsWith('supabase/functions/') ||
       file.path.startsWith('public/extension-v7/') ||
       file.path === 'package.json' ||
       file.path === 'vite.config.ts') &&
      (file.path.endsWith('.ts') ||
       file.path.endsWith('.tsx') ||
       file.path.endsWith('.js') ||
       file.path.endsWith('.jsx') ||
       file.path.endsWith('.json') ||
       file.path.endsWith('.css') ||
       file.path.endsWith('.html')) &&
      !file.path.includes('node_modules') &&
      !file.path.includes('.test.') &&
      !file.path.endsWith('.d.ts') &&
      !file.path.includes('types.ts') // skip large auto-generated types
    )

    // Smart file selection: prioritize files related to the message
    const messageLower = message.toLowerCase()
    const scored = allRelevantFiles.map((f: any) => {
      let score = 0
      const pathLower = f.path.toLowerCase()
      // Boost files whose path matches words in the message
      const words = messageLower.split(/\s+/).filter((w: string) => w.length > 3)
      for (const word of words) {
        if (pathLower.includes(word)) score += 10
      }
      // Boost important files
      if (pathLower.includes('index.') || pathLower.includes('app.')) score += 3
      if (pathLower.includes('page') || pathLower.includes('component')) score += 2
      if (pathLower.endsWith('.css')) score += 1
      return { ...f, score }
    })
    scored.sort((a: any, b: any) => b.score - a.score)
    const relevantFiles = scored.slice(0, 40) // max 40 files

    console.log(`[github-modify] Selected ${relevantFiles.length}/${allRelevantFiles.length} files`)

    // 3. Read file contents in batches of 10, truncate large files
    const MAX_FILE_CHARS = 8000
    const fileContents: string[] = []
    for (let i = 0; i < relevantFiles.length; i += 10) {
      const batch = relevantFiles.slice(i, i + 10)
      const batchContents = await Promise.all(
        batch.map(async (file: any) => {
          try {
            const res = await fetch(
              `https://api.github.com/repos/${github_repo}/contents/${file.path}?ref=${branch}`,
              { headers: ghHeaders }
            )
            if (!res.ok) return `// FILE: ${file.path}\n// (could not read)`
            const data = await res.json()
            let content = data.encoding === 'base64'
              ? atob(data.content.replace(/\n/g, ''))
              : data.content || ''
            if (content.length > MAX_FILE_CHARS) {
              content = content.slice(0, MAX_FILE_CHARS) + '\n// ... (truncated)'
            }
            return `// FILE: ${file.path}\n${content}`
          } catch {
            return `// FILE: ${file.path}\n// (error reading)`
          }
        })
      )
      fileContents.push(...batchContents)
    }

    const codeContext = fileContents.join('\n\n---\n\n')
    console.log(`[github-modify] Total context size: ${codeContext.length} chars`)

    // 4. Send to AI
    console.log(`[github-modify] Sending to AI (${aiModel}), context size: ${codeContext.length} chars`)
    const aiRes = await fetch(aiBaseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiApiKey}`,
        'User-Agent': 'IlimitadoLov/7.1',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          {
            role: 'system',
            content: `Você é um assistente especialista em TypeScript e React que modifica código de projetos Lovable/Supabase.

REGRAS OBRIGATÓRIAS:
- Responda APENAS com um array JSON válido, sem texto antes ou depois
- Sem markdown, sem blocos de código, sem explicações fora do JSON
- Formato exato:
[{"path":"src/...","content":"conteúdo completo do arquivo","action":"update|create|delete"}]
- "action": "update" = modificar existente, "create" = novo arquivo, "delete" = remover
- Para "delete" o campo "content" pode ser string vazia
- Retorne APENAS os arquivos que precisam mudar
- Mantenha TODO o código existente que não precisa ser alterado
- TypeScript correto, sem erros de compilação`
          },
          {
            role: 'user',
            content: `Instrução: ${message}\n\nCódigo atual do projeto:\n${codeContext}`
          }
        ]
      })
    })

    const aiResText = await aiRes.text()
    console.log(`[github-modify] AgentRouter response status: ${aiRes.status}, length: ${aiResText.length}, type: ${aiRes.headers.get('content-type')}`)
    
    if (!aiRes.ok) {
      console.error(`[github-modify] AgentRouter error: ${aiResText.slice(0, 300)}`)
      return new Response(
        JSON.stringify({ error: `AgentRouter erro ${aiRes.status}: ${aiResText.slice(0, 200)}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let aiData: any
    try {
      aiData = JSON.parse(aiResText)
    } catch (parseErr) {
      console.error(`[github-modify] Failed to parse AgentRouter response: ${aiResText.slice(0, 300)}`)
      return new Response(
        JSON.stringify({ error: `AgentRouter retornou resposta inválida (não-JSON). Tente novamente.`, raw: aiResText.slice(0, 200) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!aiData.choices?.[0]?.message?.content) {
      console.error(`[github-modify] Unexpected AI response structure:`, JSON.stringify(aiData).slice(0, 300))
      return new Response(
        JSON.stringify({ error: 'AgentRouter retornou resposta sem conteúdo. Tente novamente.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const rawContent = aiData.choices[0].message.content

    // 5. Parse response
    let filesToModify: Array<{ path: string; content: string; action: string }>
    try {
      filesToModify = JSON.parse(rawContent)
    } catch {
      const jsonMatch = rawContent.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        return new Response(
          JSON.stringify({ error: 'AI retornou formato inválido', raw: rawContent.slice(0, 500) }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      filesToModify = JSON.parse(jsonMatch[0])
    }

    // 6. Get latest commit SHA
    const refRes = await fetch(
      `https://api.github.com/repos/${github_repo}/git/ref/heads/${branch}`,
      { headers: ghHeaders }
    )
    const refData = await refRes.json()
    const latestCommitSha = refData.object.sha

    const commitRes = await fetch(
      `https://api.github.com/repos/${github_repo}/git/commits/${latestCommitSha}`,
      { headers: ghHeaders }
    )
    const commitData = await commitRes.json()
    const baseTreeSha = commitData.tree.sha

    // 7. Create blobs
    const treeItems = await Promise.all(
      filesToModify
        .filter(f => f.action !== 'delete')
        .map(async (file) => {
          const blobRes = await fetch(
            `https://api.github.com/repos/${github_repo}/git/blobs`,
            {
              method: 'POST',
              headers: ghHeaders,
              body: JSON.stringify({ content: file.content, encoding: 'utf-8' }),
            }
          )
          const blobData = await blobRes.json()
          return { path: file.path, mode: '100644' as const, type: 'blob' as const, sha: blobData.sha }
        })
    )

    const deleteItems = filesToModify
      .filter(f => f.action === 'delete')
      .map(file => ({ path: file.path, mode: '100644' as const, type: 'blob' as const, sha: null as any }))

    // 8. Create new tree
    const newTreeRes = await fetch(
      `https://api.github.com/repos/${github_repo}/git/trees`,
      {
        method: 'POST',
        headers: ghHeaders,
        body: JSON.stringify({ base_tree: baseTreeSha, tree: [...treeItems, ...deleteItems] }),
      }
    )
    const newTreeData = await newTreeRes.json()

    // 9. Create commit
    const newCommitRes = await fetch(
      `https://api.github.com/repos/${github_repo}/git/commits`,
      {
        method: 'POST',
        headers: ghHeaders,
        body: JSON.stringify({
          message: `feat: ${message.slice(0, 72)} [AgentRouter v7]`,
          tree: newTreeData.sha,
          parents: [latestCommitSha],
        }),
      }
    )
    const newCommitData = await newCommitRes.json()

    // 10. Update branch ref
    await fetch(
      `https://api.github.com/repos/${github_repo}/git/refs/heads/${branch}`,
      {
        method: 'PATCH',
        headers: ghHeaders,
        body: JSON.stringify({ sha: newCommitData.sha }),
      }
    )

    console.log(`[github-modify] Success: ${filesToModify.length} files, commit ${newCommitData.sha}`)

    return new Response(
      JSON.stringify({
        success: true,
        commit_url: newCommitData.html_url,
        commit_sha: newCommitData.sha,
        files_modified: filesToModify.map(f => ({ path: f.path, action: f.action })),
        files_count: filesToModify.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[github-modify] Error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
