// ============================================================
// Ilimitado Lov v7 — Content Script: Auto-detect GitHub Repo
// Runs inside Lovable pages to extract the connected GitHub repo
// ============================================================

const FALSE_POSITIVE_PREFIXES = [
  'google/', 'openai/', 'anthropic/', 'meta/', 'mistral/', 'cohere/',
  'microsoft/', 'amazon/', 'nvidia/', 'deepseek/', 'claude-', 'gpt-',
  'facebook/', 'huggingface/', 'stability/', 'together/', 'fireworks/',
  'openrouter/', 'openrouter.ai/', 'api.', 'x.ai/', 'z.ai/',
  'qwen/', 'meta-llama/',
];

function isLikelyRepo(candidate) {
  if (!candidate || !candidate.includes('/')) return false;
  if (!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(candidate)) return false;
  const lower = candidate.toLowerCase();
  for (const prefix of FALSE_POSITIVE_PREFIXES) {
    if (lower.startsWith(prefix)) return false;
  }
  if (/\.(js|ts|tsx|jsx|css|html|json|md|png|jpg|svg|woff|ttf|ai|io|com|co|dev)$/i.test(candidate)) return false;
  const [owner, repo] = candidate.split('/');
  if (owner.length < 2 || repo.length < 2) return false;
  if (/^\d/.test(owner)) return false;
  if (/\.(com|ai|io|dev|co|org|net)$/i.test(owner)) return false;
  // Reject AI model-looking names
  if (/^(llama|gemini|grok|glm|mixtral|gemma|phi|command|deepseek|claude|gpt)/i.test(owner)) return false;
  return true;
}

let lastSavedRepo = null;

function saveRepo(repo) {
  if (!repo || !isLikelyRepo(repo)) return;
  lastSavedRepo = repo;
  chrome.storage.local.set({ detected_github_repo: repo });
  chrome.runtime.sendMessage({ type: 'github.repo.detected', repo }).catch(() => {});
  console.log('[v7] Repo detectado:', repo);
}

function findRepoInObject(obj, depth = 0) {
  if (depth > 5 || !obj || typeof obj !== 'object') return null;
  
  const repoKeys = [
    'github_repo', 'githubRepo', 'full_name', 'fullName', 
    'repo', 'repository', 'repo_name', 'repoName',
    'github_full_name', 'github_repository', 'repo_full_name',
    'connectedRepo', 'connected_repo', 'gitHubRepository',
  ];
  for (const key of repoKeys) {
    if (obj[key] && typeof obj[key] === 'string' && isLikelyRepo(obj[key])) {
      return obj[key].replace(/\.git$/, '');
    }
  }
  
  const urlKeys = ['clone_url', 'html_url', 'git_url', 'ssh_url', 'svn_url'];
  for (const key of urlKeys) {
    if (obj[key] && typeof obj[key] === 'string') {
      const match = obj[key].match(/github\.com[/:]([^/]+\/[^/.]+)/);
      if (match && isLikelyRepo(match[1])) return match[1].replace(/\.git$/, '');
    }
  }
  
  const nestedKeys = ['project', 'github', 'integration', 'settings', 'data', 'result', 
                       'github_integration', 'githubIntegration', 'git', 'vcs', 'source_control',
                       'connected_repository', 'attributes', 'meta', 'config'];
  for (const key of nestedKeys) {
    if (obj[key] && typeof obj[key] === 'object') {
      const found = findRepoInObject(obj[key], depth + 1);
      if (found) return found;
    }
  }
  
  if (Array.isArray(obj) && depth < 3) {
    for (const item of obj) {
      const found = findRepoInObject(item, depth + 1);
      if (found) return found;
    }
  }
  
  return null;
}

const REPO_PATTERNS = [
  /"(?:github_repo|full_name|githubRepo|github_repository|repo_full_name|connectedRepo|connected_repo)"\s*:\s*"([^"]+)"/,
  /"(?:clone_url|html_url)"\s*:\s*"https?:\/\/github\.com\/([^"]+?)(?:\.git)?"/,
  /github\.com\/([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)/,
];

function findRepoInText(text) {
  for (const pattern of REPO_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const candidate = match[1].replace(/\.git$/, '').replace(/\/(tree|blob|issues|pulls|settings|actions).*$/, '');
      if (isLikelyRepo(candidate)) return candidate;
    }
  }
  return null;
}

// ==========================================
// Elements to EXCLUDE from scanning (chat/message areas)
// ==========================================
const CHAT_SELECTORS = [
  '[class*="chat"]', '[class*="Chat"]', '[class*="message"]', '[class*="Message"]',
  '[class*="conversation"]', '[class*="Conversation"]',
  '[class*="response"]', '[class*="Response"]',
  '[class*="markdown"]', '[class*="Markdown"]',
  '[class*="prose"]', '[class*="bubble"]',
  '[role="log"]', '[role="feed"]',
  '[data-message]', '[data-chat]',
  // Lovable specific chat containers
  '.chat-messages', '.message-list', '.ai-response',
  'pre', 'code',
];

function isInsideChatArea(element) {
  let el = element;
  let depth = 0;
  while (el && depth < 15) {
    if (el.nodeType === 1) {
      const cls = (el.className || '').toString().toLowerCase();
      const role = (el.getAttribute?.('role') || '').toLowerCase();
      // Check if inside a chat/message container
      if (
        cls.includes('chat') || cls.includes('message') || cls.includes('conversation') ||
        cls.includes('response') || cls.includes('markdown') || cls.includes('prose') ||
        cls.includes('bubble') || cls.includes('log') || cls.includes('feed') ||
        role === 'log' || role === 'feed'
      ) {
        return true;
      }
      // Check if inside a code block
      const tag = el.tagName?.toLowerCase();
      if (tag === 'pre' || tag === 'code') return true;
    }
    el = el.parentElement;
    depth++;
  }
  return false;
}

// ==========================================
// Strategy 1: Intercept fetch calls (ONLY Lovable/GitHub API)
// ==========================================
const IGNORED_URL_PATTERNS = [
  '/functions/v1/chat', '/functions/v1/byok', '/functions/v1/propose',
  '/functions/v1/commit', '/functions/v1/process-message', '/functions/v1/send-message',
  '/functions/v1/validate-license', '/functions/v1/create-session',
  '/functions/v1/get-templates', '/functions/v1/get-support-info',
  '/functions/v1/refine-prompt', '/functions/v1/serve-extension-ui',
  'supabase.co/functions/',
  // AI provider URLs to ignore
  'openrouter.ai/', 'api.openai.com/', 'api.anthropic.com/',
  'generativelanguage.googleapis.com/', 'api.x.ai/',
  'api.deepseek.com/', 'api.groq.com/', 'api.z.ai/',
  'agentrouter.org/', 'ai.gateway.lovable.dev/',
];

function shouldInterceptUrl(url) {
  if (!url) return false;
  for (const pattern of IGNORED_URL_PATTERNS) {
    if (url.includes(pattern)) return false;
  }
  // ONLY intercept Lovable project API and GitHub API
  return (
    url.includes('api.lovable.dev') ||
    url.includes('api.github.com/')
  );
}

function interceptNetworkCalls() {
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    try {
      const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
      if (shouldInterceptUrl(url)) {
        const clone = response.clone();
        clone.text().then(text => {
          try {
            try {
              const data = JSON.parse(text);
              const repo = findRepoInObject(data);
              if (repo) { saveRepo(repo); return; }
            } catch {}
            const repo = findRepoInText(text);
            if (repo) saveRepo(repo);
          } catch {}
        }).catch(() => {});
      }
    } catch (e) {}
    return response;
  };

  const origXhrOpen = XMLHttpRequest.prototype.open;
  const origXhrSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function(method, url) {
    this._v7url = url;
    return origXhrOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function() {
    this.addEventListener('load', function() {
      try {
        if (shouldInterceptUrl(this._v7url)) {
          const repo = findRepoInText(this.responseText);
          if (repo) saveRepo(repo);
        }
      } catch {}
    });
    return origXhrSend.apply(this, arguments);
  };
}

// ==========================================
// Strategy 2: DOM — GitHub widget detection (PRECISE)
// Only looks inside Lovable's GitHub settings popover/dialog
// ==========================================
function extractFromDOM() {
  try {
    // 2a. PRECISE: Look inside Radix popovers/dialogs that show "Connected" (GitHub widget)
    const containers = document.querySelectorAll(
      '[data-radix-popper-content-wrapper], [data-radix-portal], [role="dialog"], [role="menu"], [data-state="open"]'
    );
    for (const container of containers) {
      // Only search containers that mention "Connected" — this is the GitHub settings panel
      if (!container.textContent.includes('Connected')) continue;

      // Try link first
      const a = container.querySelector('a[href*="github.com"]');
      if (a) {
        const match = (a.href || '').match(/github\.com\/([\w.-]+\/[\w.-]+)/);
        if (match) {
          const candidate = match[1].replace(/\.git$/, '').replace(/\/(tree|blob|issues|pulls|settings|actions).*$/, '');
          if (isLikelyRepo(candidate)) return candidate;
        }
      }

      // Fallback: find visible "owner/repo" text inside the Connected panel
      const spans = container.querySelectorAll('span, p, a, div, code');
      for (const el of spans) {
        if (el.children.length > 2) continue; // skip containers with many children
        const text = el.textContent.trim();
        if (/^[\w.-]+\/[\w.-]+$/.test(text) && !text.includes(' ') && isLikelyRepo(text)) {
          return text;
        }
      }
    }

    // 2b. Broader: Find GitHub links in sidebar/nav/header areas ONLY (never chat)
    const safeContainers = document.querySelectorAll(
      'nav, aside, header, footer, [class*="sidebar"], [class*="Sidebar"], [class*="settings"], [class*="Settings"], [class*="header"], [class*="Header"], [class*="toolbar"], [class*="Toolbar"]'
    );
    for (const container of safeContainers) {
      const links = container.querySelectorAll('a[href*="github.com"]');
      for (const a of links) {
        if (isInsideChatArea(a)) continue;
        const match = (a.href || '').match(/github\.com\/([\w.-]+\/[\w.-]+)/);
        if (match) {
          const candidate = match[1].replace(/\.git$/, '').replace(/\/(tree|blob|issues|pulls|settings|actions).*$/, '');
          if (isLikelyRepo(candidate)) return candidate;
        }
      }
    }
  } catch (e) {}
  return null;
}

// ==========================================
// Strategy 3: localStorage / sessionStorage
// ==========================================
function extractFromStorage() {
  try {
    const storages = [localStorage, sessionStorage];
    for (const storage of storages) {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        // Only check keys that look like project/repo/github config
        const lk = key.toLowerCase();
        if (!lk.includes('repo') && !lk.includes('github') && !lk.includes('project') && !lk.includes('git')) continue;
        const value = storage.getItem(key);
        if (!value || value.length > 10000) continue;
        const repo = findRepoInText(value);
        if (repo) return repo;
      }
    }
  } catch (e) {}
  return null;
}

// ==========================================
// Strategy 4: Lovable API — multiple endpoints
// ==========================================
async function fetchRepoFromLovableAPI() {
  try {
    const projectMatch = location.href.match(/lovable\.dev\/projects\/([a-f0-9-]+)/);
    if (!projectMatch) return null;
    const projectId = projectMatch[1];
    chrome.storage.local.set({ lovable_project_id: projectId });
    
    const endpoints = [
      `https://api.lovable.dev/projects/${projectId}`,
      `https://api.lovable.dev/api/projects/${projectId}`,
      `https://api.lovable.dev/v1/projects/${projectId}`,
    ];
    
    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint, { credentials: 'include' });
        if (!res.ok) continue;
        const text = await res.text();
        
        try {
          const data = JSON.parse(text);
          const repo = findRepoInObject(data);
          if (repo) return repo;
        } catch {}
        
        const repo = findRepoInText(text);
        if (repo) return repo;
      } catch {}
    }
  } catch (e) {
    console.log('[v7] API fetch failed:', e.message);
  }
  return null;
}

// ==========================================
// Strategy 5: React Fiber tree inspection
// ==========================================
function extractFromReactFiber() {
  try {
    const rootEl = document.getElementById('root') || document.getElementById('__next');
    if (!rootEl) return null;
    
    const fiberKey = Object.keys(rootEl).find(k => k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance'));
    if (!fiberKey) return null;
    
    let fiber = rootEl[fiberKey];
    const visited = new Set();
    const queue = [fiber];
    
    while (queue.length > 0 && visited.size < 800) {
      const node = queue.shift();
      if (!node || visited.has(node)) continue;
      visited.add(node);
      
      if (node.memoizedProps) {
        const props = node.memoizedProps;
        if (typeof props.href === 'string' && props.href.includes('github.com')) {
          const match = props.href.match(/github\.com\/([\w.-]+\/[\w.-]+)/);
          if (match) {
            const candidate = match[1].replace(/\.git$/, '').replace(/\/(tree|blob|issues|pulls).*$/, '');
            if (isLikelyRepo(candidate)) return candidate;
          }
        }
        
        // Only check structured repo keys, not arbitrary props
        const repo = findRepoInObject(props);
        if (repo) return repo;
      }
      
      // Traverse memoizedState chain
      let stateNode = node.memoizedState;
      let stateDepth = 0;
      while (stateNode && stateDepth < 10) {
        try {
          if (stateNode.memoizedState && typeof stateNode.memoizedState === 'object') {
            const repo = findRepoInObject(stateNode.memoizedState);
            if (repo) return repo;
          }
          if (stateNode.queue?.lastRenderedState && typeof stateNode.queue.lastRenderedState === 'object') {
            const repo = findRepoInObject(stateNode.queue.lastRenderedState);
            if (repo) return repo;
          }
        } catch {}
        stateNode = stateNode.next;
        stateDepth++;
      }
      
      if (node.child) queue.push(node.child);
      if (node.sibling) queue.push(node.sibling);
      if (node.return && !visited.has(node.return) && visited.size < 200) queue.push(node.return);
    }
  } catch (e) {
    console.log('[v7] Fiber scan failed:', e.message);
  }
  return null;
}

// ==========================================
// Strategy 6: REMOVED — page text scanning was causing false positives
// The full-page text scan was catching github.com links from AI chat responses.
// ==========================================

// ==========================================
// Main detection orchestrator
// ==========================================
async function detectRepo() {
  // Quick check: if we already have a repo and we're still on same project, skip
  if (lastSavedRepo) {
    const stored = await chrome.storage.local.get('detected_github_repo');
    if (stored.detected_github_repo) {
      const domRepo = extractFromDOM();
      if (domRepo && domRepo !== stored.detected_github_repo) {
        saveRepo(domRepo);
        return domRepo;
      }
      return stored.detected_github_repo;
    }
  }

  // Full detection: run strategies in priority order
  let repo = extractFromDOM() || extractFromStorage() || extractFromReactFiber();
  
  if (repo) {
    saveRepo(repo);
    return repo;
  }
  
  // Async: Lovable API
  repo = await fetchRepoFromLovableAPI();
  if (repo) {
    saveRepo(repo);
    return repo;
  }
  
  console.log('[v7] Nenhum repo detectado em nenhuma estratégia');
  return null;
}

// ==========================================
// Initialize
// ==========================================
interceptNetworkCalls();

const initialDelays = [1000, 2000, 4000, 8000, 15000];
initialDelays.forEach(delay => {
  setTimeout(async () => {
    const stored = await chrome.storage.local.get('detected_github_repo');
    if (!stored.detected_github_repo) {
      detectRepo();
    }
  }, delay);
});

let pollingInterval = null;
function startPolling() {
  if (pollingInterval) return;
  pollingInterval = setInterval(async () => {
    if (!location.href.includes('lovable.dev/projects/')) {
      clearInterval(pollingInterval);
      pollingInterval = null;
      return;
    }
    await detectRepo();
  }, 10000);
}

if (location.href.includes('lovable.dev/projects/')) {
  startPolling();
}

let lastUrl = location.href;
const navObserver = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    console.log('[v7] Navegação SPA detectada:', lastUrl);
    const oldProject = lastUrl.match(/projects\/([a-f0-9-]+)/)?.[1];
    const newProject = location.href.match(/projects\/([a-f0-9-]+)/)?.[1];
    if (oldProject && newProject && oldProject !== newProject) {
      lastSavedRepo = null;
      chrome.storage.local.remove('detected_github_repo');
    }
    if (location.href.includes('lovable.dev/projects/')) {
      lastSavedRepo = null;
      setTimeout(() => detectRepo(), 500);
      setTimeout(() => detectRepo(), 2000);
      setTimeout(() => detectRepo(), 5000);
      startPolling();
    } else {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
      }
    }
  }
});
navObserver.observe(document.body, { childList: true, subtree: true });

let debounceTimer = null;
const observer = new MutationObserver(() => {
  if (lastSavedRepo) return;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => detectRepo(), 2000);
});
observer.observe(document.body, { childList: true, subtree: true });

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'github.repo.request') {
    detectRepo().then(repo => {
      sendResponse({ repo: repo || null });
    });
    return true;
  }
});
