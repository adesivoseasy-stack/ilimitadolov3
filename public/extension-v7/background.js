// ============================================================
// Ilimitado Lov v7 — Background Service Worker (Bubbly Edition)
// Routes messages to Bubbly Edge Functions:
//   /propose  → AI generates code changes proposal
//   /commit   → Commits approved changes to GitHub
//   /chat     → Free chat with AI
//   /byok     → Full auto flow (propose + commit + sync)
// ============================================================

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

const SUPABASE_URL = 'https://rmetppilvfrxosvxzhgj.supabase.co/functions/v1';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtZXRwcGlsdmZyeG9zdnh6aGdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNjE2MzgsImV4cCI6MjA4NTYzNzYzOH0.9ClXH2tomnJAGf0BSTAsJ7v4DTfnKQ8DDcrFj8mbqxY';

// ==========================================
// Ensure unique user ID per browser
// ==========================================
async function getUserId() {
  const stored = await chrome.storage.local.get('bubbly_user_id');
  if (stored.bubbly_user_id) return stored.bubbly_user_id;
  const id = crypto.randomUUID();
  await chrome.storage.local.set({ bubbly_user_id: id });
  return id;
}

// ==========================================
// Build headers for Bubbly endpoints
// ==========================================
async function buildHeaders() {
  const userId = await getUserId();
  const config = await chrome.storage.local.get([
    'github_token', 'lovable_auth_token',
    'openai_key', 'anthropic_key', 'openai_base_url',
    'licenseSessionToken'
  ]);

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'apikey': SUPABASE_ANON_KEY,
    'x-user-id': userId,
  };

  if (config.github_token)        headers['x-github-token']   = config.github_token;
  if (config.lovable_auth_token)   headers['x-lovable-token']  = config.lovable_auth_token;
  if (config.openai_key)           headers['x-openai-key']     = config.openai_key;
  if (config.anthropic_key)        headers['x-anthropic-key']  = config.anthropic_key;
  if (config.openai_base_url)      headers['x-openai-base-url'] = config.openai_base_url;
  if (config.licenseSessionToken)  headers['x-session-token']  = config.licenseSessionToken;

  return headers;
}

// ==========================================
// Fetch with retry (up to 3 attempts)
// ==========================================
async function retryFetch(url, opts, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, opts);
      return res;
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
    }
  }
}

// ==========================================
// Call a Bubbly endpoint
// ==========================================
async function callBubbly(endpoint, body) {
  const headers = await buildHeaders();
  const response = await retryFetch(`${SUPABASE_URL}/${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await response.text();
    console.error(`[v7-bg] Non-JSON from /${endpoint}:`, response.status, text.substring(0, 200));
    return { ok: false, error: `Servidor retornou resposta inválida (${response.status}).` };
  }

  return response.json();
}

// ==========================================
// GitHub API fallback: detect repo from user's repos
// ==========================================
async function detectRepoViaGitHubAPI() {
  const config = await chrome.storage.local.get(['github_token', 'detected_github_repo']);
  
  // Already have repo
  if (config.detected_github_repo) return config.detected_github_repo;
  if (!config.github_token) return null;
  
  try {
    // Get recently pushed repos
    const res = await fetch('https://api.github.com/user/repos?sort=pushed&per_page=10', {
      headers: {
        'Authorization': `Bearer ${config.github_token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });
    if (!res.ok) return null;
    
    const repos = await res.json();
    if (!repos.length) return null;
    
    // If we have a project ID, try to match by repo description or name patterns
    // Otherwise return the most recently pushed repo
    const stored = await chrome.storage.local.get('lovable_project_id');
    const projectId = stored.lovable_project_id;
    
    if (projectId) {
      // Look for repos that mention the project ID or lovable
      for (const repo of repos) {
        const desc = (repo.description || '').toLowerCase();
        const name = repo.full_name.toLowerCase();
        if (desc.includes(projectId) || desc.includes('lovable') || name.includes('lovable')) {
          console.log('[v7-bg] GitHub API matched repo:', repo.full_name);
          return repo.full_name;
        }
      }
    }
    
    // Fallback: most recent repo (user can override in config)
    console.log('[v7-bg] GitHub API fallback to most recent:', repos[0].full_name);
    return repos[0].full_name;
  } catch (e) {
    console.error('[v7-bg] GitHub API detection failed:', e.message);
    return null;
  }
}

// ==========================================
// Capture auth tokens from Lovable requests
// ==========================================
chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    const headers = details.requestHeaders || [];
    let authToken = null;
    let gitSha = null;

    for (const h of headers) {
      const name = h.name.toLowerCase();
      if (name === 'authorization' && h.value?.startsWith('Bearer ')) {
        authToken = h.value.replace('Bearer ', '');
      }
      if (name === 'x-client-git-sha' && h.value) {
        gitSha = h.value;
      }
    }

    if (authToken) {
      chrome.storage.local.set({
        lovable_auth_token: authToken,
        lovable_token_captured_at: Date.now()
      });
    }

    if (gitSha) {
      chrome.storage.local.set({ lovable_git_sha: gitSha });
    }

    const projectMatch = details.url.match(/\/projects\/([a-f0-9-]{36})/);
    if (projectMatch) {
      chrome.storage.local.set({ lovable_project_id: projectMatch[1] });
    }
  },
  {
    urls: [
      'https://api.lovable.dev/*',
      'https://*.lovable.dev/*',
      'https://*.supabase.co/*'
    ]
  },
  ['requestHeaders']
);

// ==========================================
// Handle messages from sidepanel & content
// ==========================================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  // --- Repo detected by content script ---
  if (message.type === 'github.repo.detected') {
    chrome.storage.local.set({ detected_github_repo: message.repo });
    chrome.runtime.sendMessage({ type: 'github.repo.updated', repo: message.repo }).catch(() => {});
  }

  // --- GitHub API fallback detection ---
  if (message.type === 'v7.detect_repo_github_api') {
    detectRepoViaGitHubAPI().then(repo => {
      if (repo) {
        chrome.storage.local.set({ detected_github_repo: repo });
        chrome.runtime.sendMessage({ type: 'github.repo.updated', repo }).catch(() => {});
      }
      sendResponse({ repo: repo || null });
    });
    return true;
  }

  // --- Get all config ---
  if (message.type === 'v7.get_all_config') {
    chrome.storage.local.get([
      'github_token', 'github_branch', 'detected_github_repo',
      'lovable_auth_token', 'lovable_token_captured_at',
      'lovable_project_id', 'lovable_git_sha',
      'openai_key', 'anthropic_key', 'openai_base_url',
      'bubbly_user_id'
    ]).then(config => sendResponse(config));
    return true;
  }

  // --- BYOK: full auto flow (propose + commit + sync) ---
  if (message.type === 'bubbly.byok') {
    (async () => {
      try {
        const config = await chrome.storage.local.get([
          'detected_github_repo', 'lovable_auth_token', 'lovable_project_id',
          'cached_repo_paths', 'cached_repo_paths_at'
        ]);

        const cacheAge = Date.now() - (config.cached_repo_paths_at || 0);
        const cachedPaths = (cacheAge < 120000 && config.cached_repo_paths?.length)
          ? config.cached_repo_paths : undefined;

        const result = await callBubbly('byok', {
          message: message.payload.message,
          projectId: config.lovable_project_id || 'unknown',
          githubRepo: config.detected_github_repo || message.payload.githubRepo || '',
          lovableToken: config.lovable_auth_token || '',
          currentPage: message.payload.currentPage || '/',
          providerChain: message.payload.providerChain || [],
          systemPrompt: message.payload.systemPrompt || '',
          cachedPaths: cachedPaths,
          conversationHistory: message.payload.conversationHistory || [],
        });

        if (result?.applied) {
          chrome.storage.local.remove(['cached_repo_paths', 'cached_repo_paths_at']);
        } else if (result?.repoPaths?.length) {
          chrome.storage.local.set({
            cached_repo_paths: result.repoPaths,
            cached_repo_paths_at: Date.now(),
          });
        }

        sendResponse(result);
      } catch (e) {
        sendResponse({ ok: false, error: e.message });
      }
    })();
    return true;
  }

  // --- Propose: AI generates code changes ---
  if (message.type === 'bubbly.propose') {
    (async () => {
      try {
        const config = await chrome.storage.local.get(['detected_github_repo', 'github_branch']);
        const result = await callBubbly('propose', {
          repoInput: config.detected_github_repo || message.payload.repoInput || '',
          branch: config.github_branch || message.payload.branch || 'main',
          prompt: message.payload.prompt,
          systemPrompt: message.payload.systemPrompt || '',
          providerChain: message.payload.providerChain || [],
          attachments: message.payload.attachments || [],
          conversationHistory: message.payload.conversationHistory || [],
        });
        sendResponse(result);
      } catch (e) {
        sendResponse({ ok: false, error: e.message });
      }
    })();
    return true;
  }

  // --- Commit: apply approved changes ---
  if (message.type === 'bubbly.commit') {
    (async () => {
      try {
        const config = await chrome.storage.local.get(['detected_github_repo', 'github_branch']);
        const result = await callBubbly('commit', {
          repoInput: config.detected_github_repo || message.payload.repoInput || '',
          branch: config.github_branch || message.payload.branch || 'main',
          commitMessage: message.payload.commitMessage,
          changes: message.payload.changes,
        });
        sendResponse(result);
      } catch (e) {
        sendResponse({ ok: false, error: e.message });
      }
    })();
    return true;
  }

  // --- Chat: free conversation with AI ---
  if (message.type === 'bubbly.chat') {
    (async () => {
      try {
        const result = await callBubbly('chat', {
          systemPrompt: message.payload.systemPrompt || '',
          userMessage: message.payload.userMessage,
          providerChain: message.payload.providerChain || [],
          attachments: message.payload.attachments || [],
          conversationHistory: message.payload.conversationHistory || [],
        });
        sendResponse(result);
      } catch (e) {
        sendResponse({ ok: false, error: e.message });
      }
    })();
    return true;
  }

  return true;
});
