// ============================================================
// Ilimitado Lov v7 — Sidepanel Logic (Bubbly Edition v8)
// Supports 4 modes: BYOK (auto), Plan+Execute, Propose+Commit (review), Chat
// Multi-provider API keys with auto-detection
// Structured conversation history with meta (filesChanged, commitSha)
// ============================================================

const SUPABASE_URL = 'https://rmetppilvfrxosvxzhgj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtZXRwcGlsdmZyeG9zdnh6aGdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNjE2MzgsImV4cCI6MjA4NTYzNzYzOH0.9ClXH2tomnJAGf0BSTAsJ7v4DTfnKQ8DDcrFj8mbqxY';

let currentMode = 'byok';
let pendingProposal = null;
let pendingPlan = null;
let conversationHistory = [];
const MAX_HISTORY = 20;
let currentRepoKey = '';

// ==========================================
// Conversation History Management (Structured)
// ==========================================
async function loadConversationHistory() {
  const config = await chrome.storage.local.get(['detected_github_repo']);
  const repo = config.detected_github_repo || 'default';
  currentRepoKey = `bubbly_conversation_${repo.replace(/[^a-z0-9]/gi, '_')}`;
  const stored = await chrome.storage.local.get([currentRepoKey]);
  conversationHistory = stored[currentRepoKey] || [];
}

function addToHistory(role, content, meta = null) {
  const maxLen = role === 'user' ? 300 : 200;
  const truncated = (content || '').substring(0, maxLen);
  const entry = { role, content: truncated };
  if (meta) entry.meta = meta;
  conversationHistory.push(entry);
  if (conversationHistory.length > MAX_HISTORY) {
    conversationHistory = conversationHistory.slice(-MAX_HISTORY);
  }
  if (currentRepoKey) {
    chrome.storage.local.set({ [currentRepoKey]: conversationHistory });
  }
}

async function clearConversationHistory() {
  conversationHistory = [];
  if (currentRepoKey) {
    await chrome.storage.local.remove([currentRepoKey]);
  }
}

// Provider URL map
const PROVIDER_URLS = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com',
  google: 'https://generativelanguage.googleapis.com',
  xai: 'https://api.x.ai/v1',
  deepseek: 'https://api.deepseek.com',
  groq: 'https://api.groq.com/openai/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  zai: 'https://api.z.ai/api/paas/v4',
  agentrouter: 'https://agentrouter.org/v1',
  moonshot: 'https://api.moonshot.ai/v1',
};

const ALL_KEY_IDS = ['openrouter', 'openai', 'google', 'anthropic', 'xai', 'deepseek', 'groq', 'zai', 'agentrouter', 'moonshot'];
const STORAGE_KEY_PREFIX = 'provider_key_';
const STORAGE_KEYS_PREFIX = 'provider_keys_';
// ==========================================
// Multi-key helpers
// ==========================================
function getProviderKeys(config, providerId) {
  // Try new multi-key format first
  const keysJson = config[STORAGE_KEYS_PREFIX + providerId];
  if (keysJson) {
    try {
      const arr = JSON.parse(keysJson);
      if (Array.isArray(arr) && arr.length) return arr.filter(k => k.trim());
    } catch {}
  }
  // Fallback to old single-key format
  const single = config[STORAGE_KEY_PREFIX + providerId];
  if (single && single.trim()) return [single.trim()];
  return [];
}

function renderProviderKeys(providerId, keys) {
  const container = document.getElementById('keys-' + providerId);
  if (!container) return;
  const placeholder = container.dataset.placeholder || '';
  if (!keys.length) keys = [''];
  container.innerHTML = keys.map((key, i) => `
    <div class="provider-key-item">
      <div class="provider-key-row">
        <span class="key-label">Key ${keys.length > 1 ? (i + 1) : ''}</span>
        <input type="password" class="provider-key-input" data-provider="${providerId}" data-index="${i}" placeholder="${placeholder}" value="${key}" />
      </div>
      <button class="key-remove-btn" onclick="removeProviderKey('${providerId}', ${i})" title="Remover key">×</button>
    </div>
  `).join('');
  // Add input listeners for auto-save
  container.querySelectorAll('.provider-key-input').forEach(input => {
    input.addEventListener('input', scheduleAutoSave);
  });
  updateKeyCountBadge(providerId, keys.filter(k => k.trim()).length);
}

function addProviderKey(providerId) {
  const container = document.getElementById('keys-' + providerId);
  if (!container) return;
  const inputs = container.querySelectorAll('.provider-key-input');
  const keys = Array.from(inputs).map(i => i.value);
  keys.push('');
  renderProviderKeys(providerId, keys);
  // Focus the new input
  const newInputs = container.querySelectorAll('.provider-key-input');
  if (newInputs.length) newInputs[newInputs.length - 1].focus();
}

function removeProviderKey(providerId, index) {
  const container = document.getElementById('keys-' + providerId);
  if (!container) return;
  const inputs = container.querySelectorAll('.provider-key-input');
  const keys = Array.from(inputs).map(i => i.value).filter((_, i) => i !== index);
  if (!keys.length) keys.push('');
  renderProviderKeys(providerId, keys);
  scheduleAutoSave();
}

function getProviderKeysFromDOM(providerId) {
  const container = document.getElementById('keys-' + providerId);
  if (!container) return [];
  return Array.from(container.querySelectorAll('.provider-key-input'))
    .map(i => i.value.trim())
    .filter(k => k);
}

function updateKeyCountBadge(providerId, count) {
  const header = document.querySelector(`.provider-profile[data-provider="${providerId}"] .provider-profile-name`);
  if (!header) return;
  let badge = header.querySelector('.key-count-badge');
  if (count > 1) {
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'key-count-badge';
      header.appendChild(badge);
    }
    badge.textContent = count + ' keys';
  } else if (badge) {
    badge.remove();
  }
}


// ==========================================
// Status UI helpers
// ==========================================
function setStatus(id, text, status) {
  const el = document.getElementById(id);
  if (!el) return;
  const dotClass = status === 'ok' ? 'dot-ok' : status === 'warn' ? 'dot-warn' : 'dot-err';
  el.innerHTML = `<span class="status-dot ${dotClass}"></span> ${text}`;
}

// ==========================================
// Resolve which provider a model value belongs to
// ==========================================
function getProviderForModel(modelValue) {
  if (modelValue.startsWith('direct:')) {
    return modelValue.split(':')[1];
  }
  if (modelValue.includes('/')) {
    return 'openrouter';
  }
  return 'openai';
}

// ==========================================
// Highlight active provider
// ==========================================
function highlightActiveProvider(provider) {
  const hint = document.getElementById('provider-url-hint');
  if (hint && PROVIDER_URLS[provider]) {
    hint.textContent = `→ ${PROVIDER_URLS[provider]}`;
  } else if (hint) {
    hint.textContent = '';
  }
}

// ==========================================
// Update provider status dots
// ==========================================
function updateProviderStatuses() {
  ALL_KEY_IDS.forEach(id => {
    const keys = getProviderKeysFromDOM(id);
    const dot = document.getElementById(`status-${id}`);
    if (dot) {
      dot.classList.toggle('configured', keys.length > 0);
    }
  });
}

// ==========================================
// OpenRouter dynamic model loading
// ==========================================
let openrouterModelsCache = null;
let openrouterModelsLoaded = false;

async function loadOpenRouterModels() {
  if (openrouterModelsLoaded) return;
  openrouterModelsLoaded = true;
  const list = document.getElementById('openrouter-model-list');
  const loading = document.getElementById('openrouter-loading');
  
  try {
    const cached = await chrome.storage.local.get(['or_models_cache', 'or_models_cached_at']);
    const cacheAge = Date.now() - (cached.or_models_cached_at || 0);
    
    let models;
    if (cached.or_models_cache && cacheAge < 3600000) {
      models = cached.or_models_cache;
    } else {
      const res = await fetch('https://openrouter.ai/api/v1/models');
      const data = await res.json();
      models = (data.data || [])
        .filter(m => {
          const out = m.architecture?.output_modalities;
          return out && out.includes('text');
        })
        .map(m => {
          const p = m.pricing || {};
          const promptCost = parseFloat(p.prompt || '0');
          const completionCost = parseFloat(p.completion || '0');
          const isFree = promptCost === 0 && completionCost === 0;
          return {
            id: m.id,
            name: m.name || m.id,
            ctx: m.context_length || 0,
            free: isFree,
            cost: isFree ? null : `$${(promptCost * 1e6).toFixed(2)}/$${(completionCost * 1e6).toFixed(2)} /1M`,
          };
        });
      models.sort((a, b) => {
        if (a.free !== b.free) return a.free ? -1 : 1;
        return b.ctx - a.ctx;
      });
      await chrome.storage.local.set({ or_models_cache: models, or_models_cached_at: Date.now() });
    }
    
    openrouterModelsCache = models;
    renderOpenRouterModels(models);
  } catch (e) {
    if (loading) loading.textContent = '❌ Erro ao carregar modelos';
    console.error('Failed to load OpenRouter models:', e);
    openrouterModelsLoaded = false;
  }
}

function renderOpenRouterModels(models, filter = '') {
  const list = document.getElementById('openrouter-model-list');
  if (!list) return;
  
  const currentModel = document.querySelector('.model-option.selected')?.dataset?.model;
  const q = filter.toLowerCase();
  const filtered = q ? models.filter(m => m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q)) : models;
  
  let html = '';
  let lastFree = null;
  
  for (const m of filtered) {
    if (lastFree === true && !m.free) {
      html += '<div class="provider-divider"></div>';
    }
    lastFree = m.free;
    
    const selected = m.id === currentModel ? ' selected' : '';
    const ctxLabel = m.ctx >= 1000000 ? `${(m.ctx / 1000000).toFixed(1)}M` : m.ctx >= 1000 ? `${Math.round(m.ctx / 1000)}K` : m.ctx;
    
    if (m.free) {
      html += `<div class="model-option${selected}" data-model="${m.id}"><span class="model-radio"></span><span class="model-name">${m.name}</span><span class="model-badge">FREE</span></div>`;
    } else {
      html += `<div class="model-option${selected}" data-model="${m.id}"><span class="model-radio"></span><span class="model-name" title="${m.id} · ${ctxLabel} ctx · ${m.cost}">${m.name}</span><span class="model-badge" style="background:var(--primary-dim);color:var(--primary);font-size:7px">${ctxLabel}</span></div>`;
    }
  }
  
  if (!filtered.length) {
    html = '<div style="text-align:center;padding:12px;color:var(--text-muted);font-size:11px;">Nenhum modelo encontrado</div>';
  }
  
  list.innerHTML = html;
  
  list.querySelectorAll('.model-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.model-option').forEach(el => el.classList.remove('selected'));
      opt.classList.add('selected');
      const customInput = document.getElementById('openai-model');
      if (customInput) customInput.value = '';
      const bar = document.getElementById('selected-model-name');
      if (bar) bar.textContent = opt.dataset.model;
    });
  });
}

// ==========================================
// Select a model in the UI
// ==========================================
function selectModelInUI(modelValue, autoExpand = false) {
  document.querySelectorAll('.model-option').forEach(el => el.classList.remove('selected'));
  const match = document.querySelector(`.model-option[data-model="${modelValue}"]`);
  if (match) {
    match.classList.add('selected');
    if (autoExpand) {
      const body = match.closest('.provider-body');
      if (body) body.classList.add('open');
    }
  }
  const bar = document.getElementById('selected-model-name');
  if (bar) bar.textContent = modelValue || 'Nenhum selecionado';
}

// ==========================================
// Load and display all config
// ==========================================
async function loadAndDisplayConfig() {
  const storageKeys = [
    'github_token', 'github_branch', 'detected_github_repo',
    'lovable_auth_token', 'lovable_token_captured_at',
    'openai_model',
    ...ALL_KEY_IDS.map(id => STORAGE_KEY_PREFIX + id),
    ...ALL_KEY_IDS.map(id => STORAGE_KEYS_PREFIX + id),
    'openai_key', 'anthropic_key', 'openai_base_url',
  ];

  const config = await chrome.storage.local.get(storageKeys);

  if (config.detected_github_repo) {
    const repoEl = document.getElementById('status-repo');
    if (repoEl) {
      repoEl.innerHTML = `<span class="status-dot dot-ok"></span> <span style="color:var(--success);font-weight:600;">${config.detected_github_repo}</span>`;
    }
    document.getElementById('detected-repo').value = config.detected_github_repo;
  } else {
    setStatus('status-repo', 'Detectando...', 'warn');
  }

  const branch = config.github_branch || 'main';
  setStatus('status-branch', branch, 'ok');
  document.getElementById('github-branch').value = branch;

  if (config.lovable_auth_token) {
    const age = Date.now() - (config.lovable_token_captured_at || 0);
    const ageMin = Math.floor(age / 60000);
    const isExpired = ageMin > 55;
    setStatus('status-token',
      isExpired ? `Expirado (${ageMin}m)` : `OK (${ageMin}m)`,
      isExpired ? 'warn' : 'ok'
    );
  } else {
    setStatus('status-token', 'Aguardando', 'warn');
  }

  if (config.github_token) {
    document.getElementById('github-token').value = config.github_token;
  }

  // Multi-key support: render key inputs for each provider
  // Skip re-rendering if user is currently editing a key input (prevents wiping newly added empty fields)
  const activeEl = document.activeElement;
  const isEditingKey = activeEl && activeEl.classList.contains('provider-key-input');

  ALL_KEY_IDS.forEach(id => {
    // If user is editing a key in this provider, skip re-render to preserve their input
    if (isEditingKey && activeEl.dataset.provider === id) return;

    // Also skip if there's an empty key field (user just clicked "add") 
    const container = document.getElementById('keys-' + id);
    if (container) {
      const inputs = container.querySelectorAll('.provider-key-input');
      const hasEmptyField = Array.from(inputs).some(i => i.value === '');
      if (hasEmptyField && inputs.length > 1) return; // preserve added empty fields
    }

    let keys = getProviderKeys(config, id);
    // Migration from old single-key format
    if (!keys.length) {
      if (id === 'openai' && config.openai_key && !config.openai_base_url?.includes('openrouter')) {
        keys = [config.openai_key];
      } else if (id === 'openrouter' && config.openai_key && config.openai_base_url?.includes('openrouter')) {
        keys = [config.openai_key];
      } else if (id === 'anthropic' && config.anthropic_key) {
        keys = [config.anthropic_key];
      }
    }
    renderProviderKeys(id, keys.length ? keys : ['']);
  });

  if (config.openai_model) {
    const provider = getProviderForModel(config.openai_model);
    if (provider === 'openrouter' && !openrouterModelsLoaded) {
      await loadOpenRouterModels();
    }
    selectModelInUI(config.openai_model);
    const match = document.querySelector(`.model-option[data-model="${config.openai_model}"]`);
    if (!match) {
      const customInput = document.getElementById('openai-model');
      if (customInput) customInput.value = config.openai_model;
    }
    highlightActiveProvider(provider);
  }

  updateProviderStatuses();
  return config;
}

// ==========================================
// Save config (silent = no chat messages)
// ==========================================
let _autoSaveTimer = null;

function scheduleAutoSave() {
  clearTimeout(_autoSaveTimer);
  _autoSaveTimer = setTimeout(() => saveConfig(true), 800);
}

async function saveConfig(silent = false) {
  const token = document.getElementById('github-token').value;
  const branch = document.getElementById('github-branch').value;
  const repo = document.getElementById('detected-repo').value.trim();

  const selectedOption = document.querySelector('.model-option.selected');
  const customModel = document.getElementById('openai-model').value.trim();
  const openaiModel = selectedOption ? selectedOption.dataset.model : (customModel || 'qwen/qwen3-coder:free');

  const data = {
    github_token: token,
    github_branch: branch || 'main',
    openai_model: openaiModel,
  };

  if (repo) data.detected_github_repo = repo;

  ALL_KEY_IDS.forEach(id => {
    const keys = getProviderKeysFromDOM(id);
    data[STORAGE_KEYS_PREFIX + id] = JSON.stringify(keys);
    // Keep backward compat: first key in old format
    data[STORAGE_KEY_PREFIX + id] = keys[0] || '';
  });

  await chrome.storage.local.set(data);
  await chrome.storage.local.remove(['cached_repo_paths', 'cached_repo_paths_at']);

  if (!silent) {
    const keysToValidate = ALL_KEY_IDS.filter(id => {
      return getProviderKeysFromDOM(id).length > 0;
    });

    if (keysToValidate.length > 0) {
      appendMessage('ai', 'Validando chaves de API...');

      // Validate ALL keys for each provider, not just the first
      const allResults = [];
      for (const id of keysToValidate) {
        const providerKeys = getProviderKeysFromDOM(id);
        const keyResults = await Promise.all(providerKeys.map(k => validateApiKey(id, k)));
        allResults.push({ id, keys: providerKeys, results: keyResults });
      }

      const lines = [];
      let allValid = true;
      allResults.forEach(({ id, keys, results }) => {
        const dot = document.getElementById(`status-${id}`);
        const anyValid = results.some(r => r.ok);
        const allKeysValid = results.every(r => r.ok);

        // Clear inline styles, use class-based status
        if (dot) {
          dot.style.background = '';
          dot.style.boxShadow = '';
          if (anyValid) {
            dot.classList.add('configured');
            dot.classList.remove('invalid');
          } else {
            dot.classList.remove('configured');
            dot.classList.add('invalid');
          }
        }

        if (keys.length === 1) {
          if (results[0].ok) {
            lines.push(`✅ ${id}: válida`);
          } else {
            allValid = false;
            lines.push(`❌ ${id}: ${results[0].error}`);
          }
        } else {
          const validCount = results.filter(r => r.ok).length;
          if (allKeysValid) {
            lines.push(`✅ ${id}: ${validCount}/${keys.length} keys válidas`);
          } else {
            if (!anyValid) allValid = false;
            lines.push(`⚠️ ${id}: ${validCount}/${keys.length} keys válidas`);
          }
        }
      });

      const msgs = document.querySelectorAll('.msg-ai');
      const lastMsg = msgs[msgs.length - 1];
      if (lastMsg && lastMsg.textContent.includes('Validando')) lastMsg.remove();

      appendMessage('ai', `Validação:\n${lines.join('\n')}${allValid ? '\n\nConfigurações salvas!' : '\n\nSalvo, mas algumas chaves são inválidas.'}`);
    } else {
      appendMessage('ai', 'Configurações salvas!');
    }
  } else {
    // Silent save: still update dot statuses based on key presence
    ALL_KEY_IDS.forEach(id => {
      const keys = getProviderKeysFromDOM(id);
      const dot = document.getElementById(`status-${id}`);
      if (dot) {
        dot.style.background = '';
        dot.style.boxShadow = '';
        dot.classList.toggle('configured', keys.length > 0);
      }
    });
  }

  // Don't call loadAndDisplayConfig on silent save — it re-renders key inputs and wipes empty fields
  if (!silent) {
    await loadAndDisplayConfig();
  }
  if (typeof updateGearBadge === 'function') updateGearBadge();
}

// ==========================================
// Validate a single API key
// ==========================================
async function validateApiKey(providerId, key) {
  try {
    switch (providerId) {
      case 'openrouter': {
        const r = await fetch('https://openrouter.ai/api/v1/models', { headers: { 'Authorization': `Bearer ${key}` } });
        return r.ok ? { ok: true } : { ok: false, error: `HTTP ${r.status}` };
      }
      case 'openai': {
        const r = await fetch('https://api.openai.com/v1/models', { headers: { 'Authorization': `Bearer ${key}` } });
        return r.ok ? { ok: true } : { ok: false, error: `HTTP ${r.status}` };
      }
      case 'google': {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        return r.ok ? { ok: true } : { ok: false, error: `HTTP ${r.status}` };
      }
      case 'anthropic': {
        const r = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json', 'anthropic-dangerous-direct-browser-access': 'true' },
          body: JSON.stringify({ model: 'claude-3-5-haiku-20241022', max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] }),
        });
        if (r.ok) return { ok: true };
        if (r.status === 401 || r.status === 403) return { ok: false, error: 'chave inválida' };
        return { ok: true };
      }
      case 'xai': {
        const r = await fetch('https://api.x.ai/v1/models', { headers: { 'Authorization': `Bearer ${key}` } });
        return r.ok ? { ok: true } : { ok: false, error: r.status === 401 ? 'chave inválida' : `HTTP ${r.status}` };
      }
      case 'deepseek': {
        const r = await fetch('https://api.deepseek.com/models', { headers: { 'Authorization': `Bearer ${key}` } });
        return r.ok ? { ok: true } : { ok: false, error: r.status === 401 ? 'chave inválida' : `HTTP ${r.status}` };
      }
      case 'zai': {
        const r = await fetch('https://api.z.ai/api/paas/v4/models', { headers: { 'Authorization': `Bearer ${key}` } });
        if (r.ok || r.status === 404) return { ok: true };
        return { ok: false, error: r.status === 401 ? 'chave inválida' : `HTTP ${r.status}` };
      }
      case 'groq': {
        const r = await fetch('https://api.groq.com/openai/v1/models', { headers: { 'Authorization': `Bearer ${key}` } });
        return r.ok ? { ok: true } : { ok: false, error: r.status === 401 ? 'chave inválida' : `HTTP ${r.status}` };
      }
      case 'agentrouter': {
        const r = await fetch('https://agentrouter.org/v1/models', { headers: { 'Authorization': `Bearer ${key}` } });
        if (r.ok || r.status === 404) return { ok: true };
        return { ok: false, error: r.status === 401 ? 'chave inválida' : `HTTP ${r.status}` };
      }
      case 'moonshot': {
        // Moonshot/Kimi API blocks CORS from browser extensions
        // Accept any non-empty key — backend will validate at runtime
        if (key && key.trim().length >= 10) return { ok: true };
        return { ok: false, error: 'chave muito curta' };
      }
      default: return { ok: true };
    }
  } catch (e) {
    return { ok: false, error: e.message || 'erro de rede' };
  }
}

// ==========================================
// Build provider chain from stored keys
// ==========================================
async function getProviderChain() {
  const storageKeys = ['openai_model', ...ALL_KEY_IDS.map(id => STORAGE_KEY_PREFIX + id), ...ALL_KEY_IDS.map(id => STORAGE_KEYS_PREFIX + id)];
  const config = await chrome.storage.local.get(storageKeys);
  const chain = [];
  const model = config.openai_model || 'gpt-4o';

  // Helper to get all keys for a provider
  function keysFor(pid) { return getProviderKeys(config, pid); }

  // Helper: default fallback model for each provider
  const FALLBACK_MODELS = {
    openrouter: 'qwen/qwen3-coder:free',
    openai: 'gpt-4.1-mini',
    anthropic: 'claude-sonnet-4-20250514',
    google: 'gemini-2.5-flash',
    xai: 'grok-3-mini',
    deepseek: 'deepseek-chat',
    groq: 'llama-3.3-70b-versatile',
    zai: 'glm-4.5',
    agentrouter: 'deepseek-v3.1',
    moonshot: 'kimi-k2.5',
  };

  // Primary model — add all keys for the primary provider
  if (model.startsWith('direct:')) {
    const [, provider, actualModel] = model.split(':');
    for (const key of keysFor(provider)) {
      chain.push({ id: provider, key, model: actualModel, baseUrl: PROVIDER_URLS[provider] || undefined });
    }
  } else if (model.includes('/')) {
    for (const key of keysFor('openrouter')) {
      chain.push({ id: 'openrouter', key, model, baseUrl: PROVIDER_URLS.openrouter });
    }
  } else {
    for (const key of keysFor('openai')) {
      chain.push({ id: 'openai', key, model, baseUrl: PROVIDER_URLS.openai });
    }
  }

  // Fallback: other providers with all their keys
  const primaryProvider = getProviderForModel(model);
  const fallbackOrder = ['openrouter', 'openai', 'anthropic', 'google', 'xai', 'deepseek', 'groq', 'zai', 'agentrouter', 'moonshot'];

  for (const fb of fallbackOrder) {
    if (fb === primaryProvider) continue;
    const keys = keysFor(fb);
    if (!keys.length) continue;
    const fbModel = FALLBACK_MODELS[fb] || fb;
    for (const key of keys) {
      chain.push({
        id: fb, key, model: fbModel,
        baseUrl: PROVIDER_URLS[fb] || undefined,
      });
    }
  }

  return chain;
}

// ==========================================
// Detect repo via content script + GitHub API fallback
// ==========================================
async function requestRepoDetection() {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      url: ['https://lovable.dev/*', 'https://*.lovable.dev/*']
    });

    if (!tab) {
      return await tryGitHubAPIFallback();
    }

    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
    } catch (e) {}

    await new Promise(r => setTimeout(r, 800));

    try {
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'github.repo.request'
      });
      if (response?.repo) {
        await chrome.storage.local.set({ detected_github_repo: response.repo });
        return { repo: response.repo };
      }
    } catch (e) {}

    const stored = await chrome.storage.local.get('detected_github_repo');
    if (stored.detected_github_repo) {
      return { repo: stored.detected_github_repo };
    }

    const apiFallback = await tryGitHubAPIFallback();
    if (apiFallback.repo) return apiFallback;

    return { error: 'Repo não detectado. Configure manualmente.' };
  } catch (e) {
    return { error: e.message };
  }
}

async function tryGitHubAPIFallback() {
  try {
    const response = await new Promise((resolve) => {
      const timeout = setTimeout(() => resolve({ repo: null }), 10000);
      chrome.runtime.sendMessage({ type: 'v7.detect_repo_github_api' }, (res) => {
        clearTimeout(timeout);
        resolve(res || { repo: null });
      });
    });
    if (response?.repo) {
      return { repo: response.repo };
    }
  } catch {}
  return { error: 'Repo não detectado via GitHub API.' };
}

// ==========================================
// Legacy appendMessage — delegates to iframe
// ==========================================
function appendMessage(role, text, extra) {
  postToChat('chat:ai_message', { content: text, richData: extra?.richData, planData: extra?.planData });
}

function escapeHtml(str) {
  const el = document.createElement('span');
  el.textContent = str || '';
  return el.innerHTML;
}

// ==========================================
// Direct fetch to edge functions (for streaming)
// ==========================================
async function buildDirectHeaders() {
  const config = await chrome.storage.local.get([
    'github_token', 'lovable_auth_token', 'licenseSessionToken',
  ]);
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'apikey': SUPABASE_ANON_KEY,
  };
  if (config.github_token) headers['x-github-token'] = config.github_token;
  if (config.lovable_auth_token) headers['x-lovable-token'] = config.lovable_auth_token;
  if (config.licenseSessionToken) headers['x-session-token'] = config.licenseSessionToken;
  return headers;
}

// ==========================================
// SSE Parser utility
// ==========================================
function parseSSELines(text) {
  const events = [];
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  let currentEvent = 'message';
  let dataLines = [];

  const flushEvent = () => {
    if (!dataLines.length) return;
    events.push({ event: currentEvent || 'message', data: dataLines.join('\n') });
    currentEvent = 'message';
    dataLines = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, '');

    if (!line.trim()) {
      flushEvent();
      continue;
    }

    if (line.startsWith(':')) continue;

    if (line.startsWith('event:')) {
      currentEvent = line.slice(6).trim() || 'message';
      continue;
    }

    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart());
    }
  }

  flushEvent();
  return events;
}

// Global AbortController for cancellation
let activeAbortController = null;

function cancelActiveRequest() {
  if (activeAbortController) {
    activeAbortController.abort();
    activeAbortController = null;
    return true;
  }
  return false;
}

// ==========================================
// BYOK mode with SSE streaming progress
// ==========================================
async function sendByokStreaming(message, onProgress, mode = 'auto') {
  const config = await chrome.storage.local.get(['github_token', 'detected_github_repo', 'lovable_auth_token', 'lovable_project_id', 'cached_repo_paths', 'cached_repo_paths_at', 'licenseKey_v7']);
  if (!config.github_token) return { ok: false, error: 'Configure seu GitHub Token nas configurações.' };
  if (!config.detected_github_repo) {
    const detection = await requestRepoDetection();
    if (detection.error) return { ok: false, error: detection.error };
  }

  const providerChain = await getProviderChain();
  if (!providerChain.length) return { ok: false, error: 'Configure uma chave de IA nas configurações.' };

  const headers = await buildDirectHeaders();
  const cacheAge = Date.now() - (config.cached_repo_paths_at || 0);
  const cachedPaths = (cacheAge < 120000 && config.cached_repo_paths?.length) ? config.cached_repo_paths : undefined;

  activeAbortController = new AbortController();
  const signal = activeAbortController.signal;

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/byok`, {
      method: 'POST',
      headers,
      signal,
      body: JSON.stringify({
        message,
        projectId: config.lovable_project_id || 'unknown',
        githubRepo: config.detected_github_repo || '',
        lovableToken: config.lovable_auth_token || '',
        currentPage: '/',
        providerChain,
        conversationHistory,
        cachedPaths,
        stream: mode !== 'plan',
        mode,
        license_key: config.licenseKey_v7 || '',
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        if (res.status === 429 && json.wait_seconds) {
          return { ok: false, error: `⏳ Aguarde ${json.wait_seconds} segundo(s) antes de enviar outra mensagem.` };
        }
        return { ok: false, error: json.error || `HTTP ${res.status}` };
      } catch {
        return { ok: false, error: `HTTP ${res.status}` };
      }
    }

    const contentType = res.headers.get('content-type') || '';

    // Plan mode returns JSON directly
    if (mode === 'plan') {
      return await res.json();
    }

    if (contentType.includes('text/event-stream')) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let result = null;

      const handleEvent = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          if (evt.event === 'progress' && onProgress) {
            onProgress(data);
          } else if (evt.event === 'diff_stats' && onProgress) {
            // Show diff application stats
            const { files, totalApplied, totalSkipped } = data;
            const details = files.filter(f => f.failed > 0).map(f => `${f.path.split('/').pop()}: ${f.applied}/${f.total}`).join(', ');
            onProgress({
              step: 'diff_stats',
              icon: 'file-diff',
              message: `Diffs: ${totalApplied} arquivo(s) modificado(s)${totalSkipped ? `, ${totalSkipped} sem alteração` : ''}${details ? ` [${details}]` : ''}`
            });
          } else if (evt.event === 'warning' && onProgress) {
            onProgress({ step: 'warning', icon: 'alert-triangle', message: data.message });
          } else if (evt.event === 'result') {
            result = data;
            if (result?.applied) {
              chrome.storage.local.remove(['cached_repo_paths', 'cached_repo_paths_at']);
            } else if (result?.repoPaths?.length) {
              chrome.storage.local.set({ cached_repo_paths: result.repoPaths, cached_repo_paths_at: Date.now() });
            }
          } else if (evt.event === 'error') {
            return { ok: false, error: data.error };
          }
        } catch {
          return null;
        }
        return null;
      };

      while (true) {
        const { done, value } = await reader.read();
        buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });

        const normalizedBuffer = buffer.replace(/\r\n/g, '\n');
        const separatorIndex = normalizedBuffer.lastIndexOf('\n\n');

        if (separatorIndex !== -1) {
          const complete = normalizedBuffer.slice(0, separatorIndex);
          buffer = normalizedBuffer.slice(separatorIndex + 2);

          const events = parseSSELines(complete);
          for (const evt of events) {
            const handled = handleEvent(evt);
            if (handled) return handled;
          }
        } else {
          buffer = normalizedBuffer;
        }

        if (done) {
          if (buffer.trim()) {
            const events = parseSSELines(buffer.trim());
            for (const evt of events) {
              const handled = handleEvent(evt);
              if (handled) return handled;
            }
          }
          break;
        }
      }

      return result || { ok: false, error: 'Sem resultado do servidor.' };
    } else {
      const json = await res.json();
    if (json?.applied) {
        chrome.storage.local.remove(['cached_repo_paths', 'cached_repo_paths_at']);
      } else if (json?.repoPaths?.length) {
        chrome.storage.local.set({ cached_repo_paths: json.repoPaths, cached_repo_paths_at: Date.now() });
      }
      return json;
    }
  } catch (e) {
    activeAbortController = null;
    if (e.name === 'AbortError') return { ok: false, error: 'Cancelado pelo usuário.', cancelled: true };
    return { ok: false, error: e.message };
  } finally {
    activeAbortController = null;
  }
}

// ==========================================
// Propose mode (non-streaming, via background)
// ==========================================
async function sendPropose(prompt) {
  const config = await chrome.storage.local.get(['github_token', 'detected_github_repo']);
  if (!config.github_token) return { ok: false, error: 'Configure seu GitHub Token.' };
  if (!config.detected_github_repo) {
    const detection = await requestRepoDetection();
    if (detection.error) return { ok: false, error: detection.error };
  }

  const providerChain = await getProviderChain();
  if (!providerChain.length) return { ok: false, error: 'Configure uma chave de IA.' };

  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve({ ok: false, error: 'Timeout: 120s.' }), 120000);
    chrome.runtime.sendMessage({
      type: 'bubbly.propose',
      payload: { prompt, providerChain, conversationHistory },
    }, (response) => {
      clearTimeout(timeout);
      resolve(response || { ok: false, error: 'Sem resposta do background.' });
    });
  });
}

// Old commitPendingProposal, executePendingPlan, handleByokResult replaced by bridge versions above

// ==========================================
// Chat mode with streaming
// ==========================================
async function sendChatStreaming(userMessage, onDelta, onMeta) {
  const providerChain = await getProviderChain();
  if (!providerChain.length) throw new Error('Configure uma chave de IA.');

  const headers = await buildDirectHeaders();

  activeAbortController = new AbortController();
  const signal = activeAbortController.signal;

  const config = await chrome.storage.local.get(['licenseKey_v7']);
  const licenseKeyForRL = config.licenseKey_v7 || '';

  const res = await fetch(`${SUPABASE_URL}/functions/v1/chat`, {
    method: 'POST',
    headers,
    signal,
    body: JSON.stringify({
      userMessage,
      providerChain,
      conversationHistory,
      stream: true,
      license_key: licenseKeyForRL,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      if (res.status === 429 && json.wait_seconds) {
        throw new Error(`⏳ Aguarde ${json.wait_seconds} segundo(s) antes de enviar outra mensagem.`);
      }
      throw new Error(json.error || `HTTP ${res.status}`);
    } catch (e) {
      if (e.message.includes('HTTP') || e.message.includes('Aguarde')) throw e;
      throw new Error(`HTTP ${res.status}`);
    }
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('text/event-stream')) {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newlineIdx;
      while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
        let line = buffer.slice(0, newlineIdx);
        buffer = buffer.slice(newlineIdx + 1);
        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (line.startsWith(':') || line.trim() === '') continue;

        if (line.startsWith('event: ')) {
          const eventName = line.slice(7).trim();
          const nextNewline = buffer.indexOf('\n');
          if (nextNewline !== -1) {
            let dataLine = buffer.slice(0, nextNewline);
            buffer = buffer.slice(nextNewline + 1);
            if (dataLine.startsWith('data: ')) {
              const jsonStr = dataLine.slice(6).trim();
              try {
                const data = JSON.parse(jsonStr);
                if (eventName === 'meta' && onMeta) onMeta(data);
              } catch {}
            }
          }
          continue;
        }

        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') return;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content && onDelta) onDelta(content);
        } catch {
          buffer = line + '\n' + buffer;
          break;
        }
      }
    }
  } else {
    const json = await res.json();
    if (json.ok && json.answer && onDelta) {
      onDelta(json.answer);
    } else if (!json.ok) {
      throw new Error(json.error || 'Erro desconhecido');
    }
  }
}

// ==========================================
// Chat iframe bridge
// ==========================================
function getChatIframe() {
  return document.getElementById('chat-iframe');
}

function postToChat(type, payload = {}) {
  const iframe = getChatIframe();
  if (iframe?.contentWindow) {
    iframe.contentWindow.postMessage({ type, payload }, '*');
  }
}

// Listen for messages from chat iframe
window.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};
  if (!type) return;

  if (type === 'chat:user_send') {
    handleSendFromIframe(payload.message);
  } else if (type === 'chat:cancel') {
    const cancelled = cancelActiveRequest();
    if (cancelled) {
      postToChat('chat:stream_end', { cancelled: true });
    }
  } else if (type === 'chat:action') {
    handleChatAction(payload.action);
  } else if (type === 'chat:ready') {
    updateChatPlaceholder();
  }
});

function updateChatPlaceholder() {
  // The iframe handles its own placeholder
}

// ==========================================
// Main send handler (triggered by iframe)
// ==========================================
async function handleSendFromIframe(message) {
  if (!message) return;
  addToHistory('user', message);

  if (currentMode === 'chat') {
    postToChat('chat:stream_start');
    let fullText = '';
    let meta = {};

    try {
      await sendChatStreaming(
        message,
        (delta) => {
          fullText += delta;
          postToChat('chat:stream_delta', { delta });
        },
        (m) => { meta = m; }
      );
      postToChat('chat:stream_end', { meta: { provider: meta.usedProvider, model: meta.usedModel } });
      addToHistory('assistant', fullText.substring(0, 200));
    } catch (e) {
      if (e.name === 'AbortError') {
        postToChat('chat:stream_end', { cancelled: true });
        if (fullText) addToHistory('assistant', fullText.substring(0, 200));
      } else {
        postToChat('chat:stream_error', { error: e.message });
      }
    }

  } else if (currentMode === 'propose') {
    postToChat('chat:typing', { show: true });
    const result = await sendPropose(message);
    postToChat('chat:typing', { show: false });

    if (result?.ok && result.proposal) {
      pendingProposal = result.proposal;
      const richData = {
        summary: result.proposal.summary || result.proposal.commitMessage,
        changesDescription: result.proposal.changesDescription || result.proposal.changes.map(c => ({ path: c.path, description: 'Modificado' })),
        provider: result.usedProvider,
        model: result.usedModel,
      };
      postToChat('chat:ai_message', { content: '', richData, showCommitBtn: true, meta: { provider: result.usedProvider, model: result.usedModel } });
      addToHistory('assistant', richData.summary || 'Proposta gerada', {
        filesChanged: result.proposal.changes?.map(c => c.path) || [],
      });
    } else {
      postToChat('chat:ai_message', { content: `Erro: ${result?.error || 'Desconhecido'}` });
    }

  } else if (currentMode === 'plan') {
    postToChat('chat:typing', { show: true });
    const result = await sendByokStreaming(message, null, 'plan');
    postToChat('chat:typing', { show: false });

    if (result?.ok && result.plan) {
      pendingPlan = { ...result.plan, originalMessage: message };
      postToChat('chat:ai_message', { content: '', planData: result.plan, showPlanBtns: true });
      addToHistory('assistant', `Plano: ${result.plan.plan || 'Plano gerado'}`);
    } else {
      postToChat('chat:ai_message', { content: `Erro: ${result?.error || 'Desconhecido'}` });
    }

  } else {
    // BYOK with SSE progress
    postToChat('chat:stream_start');
    const result = await sendByokStreaming(message, (progress) => {
      postToChat('chat:progress', { message: progress.message, icon: progress.icon, step: progress.step });
    });

    postToChat('chat:progress_end');
    if (result?.cancelled) {
      postToChat('chat:stream_end', { cancelled: true });
    } else {
      postToChat('chat:stream_end');
      handleByokResultBridge(result);
    }
  }
}

function handleByokResultBridge(result) {
  if (result?.ok) {
    if (result.applied && result.commit) {
      const filesChanged = result.changesDescription?.map(c => c.path) || [];
      const commitSha = result.commit?.sha || '';
      const richData = {
        summary: result.summary || 'Código modificado e commitado',
        changesDescription: result.changesDescription || [],
        commitUrl: result.commit?.url,
        provider: result.usedProvider,
        model: result.usedModel,
      };
      postToChat('chat:ai_message', { content: '', richData, meta: { provider: result.usedProvider, model: result.usedModel } });
      addToHistory('assistant', richData.summary, { filesChanged, commitSha });
    } else if (result.answer) {
      postToChat('chat:ai_message', { content: result.answer });
      addToHistory('assistant', (result.answer || '').substring(0, 200));
    } else {
      postToChat('chat:ai_message', { content: 'Processado (sem alterações de código).' });
      addToHistory('assistant', 'Processado sem alterações');
    }
  } else {
    postToChat('chat:ai_message', { content: `Erro: ${result?.error || 'Desconhecido'}` });
  }
}

// Handle actions from iframe (commit, discard, execute plan)
async function handleChatAction(action) {
  if (action === 'commit_proposal') {
    await commitPendingProposal();
  } else if (action === 'discard_proposal') {
    pendingProposal = null;
    postToChat('chat:action_dismissed');
    postToChat('chat:ai_message', { content: 'Proposta descartada.' });
  } else if (action === 'execute_plan') {
    await executePendingPlanBridge();
  } else if (action === 'discard_plan') {
    pendingPlan = null;
    postToChat('chat:action_dismissed');
    postToChat('chat:ai_message', { content: 'Plano descartado.' });
  }
}

async function commitPendingProposal() {
  if (!pendingProposal) return;
  postToChat('chat:typing', { show: true });

  const result = await new Promise((resolve) => {
    chrome.runtime.sendMessage({
      type: 'bubbly.commit',
      payload: {
        commitMessage: pendingProposal.commitMessage,
        changes: pendingProposal.changes,
      },
    }, resolve);
  });

  postToChat('chat:typing', { show: false });
  postToChat('chat:action_dismissed');

  if (result?.ok) {
    const commitUrl = result.result?.url || '';
    const filesChanged = pendingProposal.changes?.map(c => c.path) || [];
    const commitSha = result.result?.sha || '';
    postToChat('chat:ai_message', {
      content: '',
      richData: {
        summary: 'Commit realizado!',
        commitUrl,
        changesDescription: filesChanged.map(p => ({ path: p, description: 'Commitado' })),
      },
    });
    addToHistory('assistant', `Commit realizado: ${pendingProposal.commitMessage}`, { filesChanged, commitSha });
  } else {
    postToChat('chat:ai_message', { content: `Erro: ${result?.error || 'Desconhecido'}` });
  }
  pendingProposal = null;
}

async function executePendingPlanBridge() {
  if (!pendingPlan) return;
  const planMessage = pendingPlan.originalMessage;
  pendingPlan = null;
  postToChat('chat:action_dismissed');

  const result = await sendByokStreaming(planMessage, (progress) => {
    postToChat('chat:progress', { message: progress.message, icon: progress.icon, step: progress.step });
  }, 'auto');

  postToChat('chat:progress_end');
  handleByokResultBridge(result);
}

// ==========================================
// Listen for live updates from background
// ==========================================
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'github.repo.updated') {
    loadAndDisplayConfig();
    loadConversationHistory();
  }
});

setInterval(() => loadAndDisplayConfig(), 10000);

// ==========================================
// Initialize
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  // ===== LICENSE GATE =====
  const gate = document.getElementById('license-gate');
  const mainApp = document.getElementById('main-app');
  const gateKey = document.getElementById('gate-key');
  const gateStatus = document.getElementById('gate-status');
  const gateBtn = document.getElementById('gate-activate');

  async function validateLicenseKey(key) {
    try {
      const deviceInfo = {
        screen: `${screen.width}x${screen.height}`,
        color_depth: screen.colorDepth,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        platform: navigator.platform,
        cores: navigator.hardwareConcurrency || 0,
      };
      const res = await fetch(`${SUPABASE_URL}/functions/v1/validate-license`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ license_key: key, device_info: deviceInfo }),
      });
      return await res.json();
    } catch (e) {
      return { status: 'error', message: 'Erro de conexão' };
    }
  }

  async function checkLicenseGate() {
    const stored = await chrome.storage.local.get(['licenseKey_v7', 'licenseSessionToken']);
    if (stored.licenseSessionToken && stored.licenseKey_v7) {
      // Re-validate
      const result = await validateLicenseKey(stored.licenseKey_v7);
      if (result.status === 'valid') {
        if (result.session_token) {
          await chrome.storage.local.set({ licenseSessionToken: result.session_token });
        }
        unlockApp();
        return;
      }
      // Invalid — clear and show gate
      await chrome.storage.local.remove(['licenseSessionToken']);
    }
    // Show gate
    gate.classList.remove('hidden');
    mainApp.style.display = 'none';

    if (stored.licenseKey_v7) {
      gateKey.value = stored.licenseKey_v7;
    }
  }

  async function unlockApp() {
    gate.classList.add('hidden');
    mainApp.style.display = 'flex';
    // Only show onboarding after license is validated
    await initOnboarding();
  }

  gateBtn.addEventListener('click', async () => {
    const key = gateKey.value.trim().toUpperCase();
    if (!key) {
      gateStatus.textContent = 'Digite uma chave de licença';
      gateStatus.className = 'gate-status error';
      return;
    }
    gateBtn.disabled = true;
    gateBtn.textContent = 'Validando...';
    gateStatus.textContent = '';
    gateStatus.className = 'gate-status';

    const result = await validateLicenseKey(key);

    if (result.status === 'valid') {
      await chrome.storage.local.set({
        licenseKey_v7: key,
        licenseSessionToken: result.session_token || '',
        sessionToken: result.session_token || '',
      });
      gateStatus.textContent = 'Licença ativada!';
      gateStatus.className = 'gate-status success';
      setTimeout(() => unlockApp(), 600);
    } else {
      gateBtn.disabled = false;
      gateBtn.textContent = 'Ativar';
      const msgs = {
        not_found: 'Chave não encontrada',
        expired: 'Licença expirada',
        revoked: 'Licença revogada',
        device_mismatch: 'Licença em uso em outro dispositivo',
        error: result.message || 'Erro ao validar',
      };
      gateStatus.textContent = msgs[result.status] || result.message || 'Erro desconhecido';
      gateStatus.className = 'gate-status error';
    }
  });

  gateKey.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') gateBtn.click();
  });

  await checkLicenseGate();

  // ===== REST OF INIT =====
  await loadAndDisplayConfig();
  await loadConversationHistory();
  requestRepoDetection().then(() => loadAndDisplayConfig());

  // ===== LOGOUT BUTTON =====
  document.getElementById('logout-btn').addEventListener('click', async () => {
    if (!confirm('Deseja sair e voltar à tela de licença?\nSua licença será desconectada deste dispositivo.')) return;
    await chrome.storage.local.remove(['licenseKey_v7', 'licenseSessionToken', 'sessionToken']);
    mainApp.style.display = 'none';
    gate.classList.remove('hidden');
    gateKey.value = '';
    gateStatus.textContent = '';
    gateStatus.className = 'gate-status';
    gateBtn.disabled = false;
    gateBtn.textContent = 'Ativar';
  });

  // ===== REDO TUTORIAL BUTTON =====
  document.getElementById('btn-redo-tutorial').addEventListener('click', async () => {
    await chrome.storage.local.remove(['onboarding_completed']);
    // Close config overlay
    document.getElementById('config-overlay').classList.remove('open');
    document.getElementById('gear-btn').classList.remove('active');
    // Reset wizard state
    obCurrentStep = 1;
    obSelectedProvider = null;
    obSelectedModel = null;
    setObStep(1);
    // Re-run onboarding (force open)
    document.getElementById('onboarding-overlay').classList.add('open');
    // Pre-fill existing values
    const config = await chrome.storage.local.get(['github_token', 'detected_github_repo', ...ALL_KEY_IDS.map(id => STORAGE_KEY_PREFIX + id), ...ALL_KEY_IDS.map(id => STORAGE_KEYS_PREFIX + id)]);
    if (config.github_token) document.getElementById('ob-github-token').value = config.github_token;
    if (config.detected_github_repo) {
      document.getElementById('ob-github-repo').value = config.detected_github_repo;
      const autoBadge = document.getElementById('ob-auto-badge');
      const manualHint = document.getElementById('ob-repo-manual-hint');
      if (autoBadge) autoBadge.style.display = 'inline-block';
      if (manualHint) manualHint.style.display = 'none';
    }
  });

  const overlay = document.getElementById('config-overlay');
  const gearBtn = document.getElementById('gear-btn');

  gearBtn.addEventListener('click', () => {
    const isOpen = overlay.classList.contains('open');
    overlay.classList.toggle('open');
    gearBtn.classList.toggle('active');
  });

  document.getElementById('config-close').addEventListener('click', () => {
    overlay.classList.remove('open');
    gearBtn.classList.remove('active');
  });

  document.querySelectorAll('.cfg-section-header, .provider-profile-header').forEach(header => {
    header.addEventListener('click', () => {
      const target = document.getElementById(header.dataset.target);
      if (target) {
        target.classList.toggle('open');
        if (header.dataset.target === 'sec-openrouter' && target.classList.contains('open')) {
          loadOpenRouterModels();
        }
      }
    });
  });

  const orSearch = document.getElementById('openrouter-search');
  if (orSearch) {
    let searchTimeout;
    orSearch.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        if (openrouterModelsCache) {
          renderOpenRouterModels(openrouterModelsCache, orSearch.value);
        }
      }, 200);
    });
  }

  // Auto-save on config input changes
  const autoSaveInputIds = ['github-token', 'github-branch', 'detected-repo', 'openai-model',
    ...ALL_KEY_IDS.map(id => `key-${id}`)];
  autoSaveInputIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', scheduleAutoSave);
  });

  document.querySelectorAll('.model-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.model-option').forEach(el => el.classList.remove('selected'));
      opt.classList.add('selected');
      const customInput = document.getElementById('openai-model');
      if (customInput) customInput.value = '';
      const bar = document.getElementById('selected-model-name');
      if (bar) bar.textContent = opt.dataset.model;
      scheduleAutoSave();
    });
  });

  const customModelInput = document.getElementById('openai-model');
  if (customModelInput) {
    customModelInput.addEventListener('input', () => {
      if (customModelInput.value.trim()) {
        document.querySelectorAll('.model-option').forEach(el => el.classList.remove('selected'));
        const bar = document.getElementById('selected-model-name');
        if (bar) bar.textContent = customModelInput.value.trim();
      }
    });
  }

  // Mode tabs — switch mode + notify iframe for per-mode history
  document.querySelectorAll('.mode-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const newMode = btn.dataset.mode;
      if (newMode === currentMode) return;
      currentMode = newMode;
      document.querySelectorAll('.mode-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      // Notify iframe to switch message history
      postToChat('chat:mode_change', { mode: newMode });
    });
  });

  document.getElementById('btn-detect').addEventListener('click', async () => {
    setStatus('status-repo', 'Detectando...', 'warn');
    const result = await requestRepoDetection();
    if (result.error) setStatus('status-repo', result.error, 'err');
    await loadAndDisplayConfig();
  });

  document.getElementById('btn-clear-cache').addEventListener('click', async () => {
    await chrome.storage.local.remove(['cached_repo_paths', 'cached_repo_paths_at', 'cached_resp_map', 'cached_resp_map_hash']);
    await clearConversationHistory();
    postToChat('chat:clear');
    postToChat('chat:ai_message', { content: '🔄 Cache e histórico limpos!' });
  });

  document.getElementById('btn-save-config').addEventListener('click', async () => {
    await saveConfig();
    overlay.classList.remove('open');
    gearBtn.classList.remove('active');
  });

  updateGearBadge();
});

// ==========================================
// Onboarding Wizard Logic
// ==========================================
const OB_PROVIDER_INFO = {
  openrouter: {
    label: 'Key OpenRouter', placeholder: 'sk-or-xxx (opcional para modelos free)',
    hint: 'Modelos FREE não precisam de key. Com key: acesso premium + maiores limites.',
    helpHtml: '<div class="key-help-title">Passo a passo</div><ol><li>Acesse <a href="https://openrouter.ai/workspaces/default/keys" target="_blank">openrouter.ai/keys</a></li><li>Faça login (ou crie conta grátis)</li><li>Clique em <strong>"Create Key"</strong></li><li>Copie a chave (começa com <code>sk-or-</code>)</li></ol>',
    models: [
      { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', desc: 'Rápido e gratuito — ótimo para começar' },
      { id: 'google/gemini-2.5-pro-preview-06-05', name: 'Gemini 2.5 Pro', desc: 'Mais inteligente — bom para código complexo' },
      { id: 'deepseek/deepseek-chat-v3-0324:free', name: 'DeepSeek V3 (free)', desc: 'Gratuito — bom custo-benefício' },
      { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', desc: 'Premium — excelente para edição de código' },
    ]
  },
  groq: {
    label: 'Key Groq', placeholder: 'gsk_xxx',
    hint: 'Tier gratuito generoso! Perfeito para testes rápidos.',
    helpHtml: '<div class="key-help-title">Passo a passo</div><ol><li>Acesse <a href="https://console.groq.com/keys" target="_blank">console.groq.com/keys</a></li><li>Faça login ou crie conta gratuita</li><li>Clique em <strong>"Create API Key"</strong></li><li>Copie a chave (começa com <code>gsk_</code>)</li></ol>',
    models: [
      { id: 'direct:groq:llama-3.3-70b-versatile', name: 'Llama 3.3 70B', desc: 'Potente e rápido — melhor opção gratuita' },
      { id: 'direct:groq:llama-3.1-8b-instant', name: 'Llama 3.1 8B', desc: 'Ultrarrápido — respostas instantâneas' },
      { id: 'direct:groq:meta-llama/llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout', desc: 'Último modelo Meta — boa qualidade' },
      { id: 'direct:groq:openai/gpt-oss-120b', name: 'GPT-OSS 120B', desc: 'Grande — ótimo para tarefas complexas' },
    ]
  },
  google: {
    label: 'Key Google AI', placeholder: 'AIzaSyxxx',
    hint: 'Gratuita para uso limitado. Para uso intenso, habilite billing.',
    helpHtml: '<div class="key-help-title">Passo a passo</div><ol><li>Acesse <a href="https://aistudio.google.com/api-keys" target="_blank">aistudio.google.com/api-keys</a></li><li>Faça login com sua conta Google</li><li>Clique em <strong>"Create API Key"</strong></li><li>Selecione ou crie projeto</li><li>Copie a chave (começa com <code>AIza</code>)</li></ol>',
    models: [
      { id: 'direct:google:gemini-2.5-flash', name: 'Gemini 2.5 Flash', desc: 'Rápido e econômico — melhor para começar' },
      { id: 'direct:google:gemini-2.5-pro', name: 'Gemini 2.5 Pro', desc: 'Mais inteligente — contexto longo' },
      { id: 'direct:google:gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', desc: 'Última geração — reasoning avançado' },
    ]
  },
  anthropic: {
    label: 'Key Anthropic', placeholder: 'sk-ant-xxx',
    hint: 'Exige saldo pré-pago. Adicione créditos antes de usar.',
    helpHtml: '<div class="key-help-title">Passo a passo</div><ol><li>Acesse <a href="https://console.anthropic.com/settings/keys" target="_blank">console.anthropic.com/settings/keys</a></li><li>Faça login</li><li>Clique em <strong>"Create Key"</strong></li><li>Copie a chave (começa com <code>sk-ant-</code>)</li></ol>',
    models: [
      { id: 'direct:anthropic:claude-sonnet-4-20250514', name: 'Claude Sonnet 4', desc: 'Melhor para código — rápido e preciso' },
      { id: 'direct:anthropic:claude-opus-4-20250514', name: 'Claude Opus 4', desc: 'Mais potente — raciocínio profundo' },
      { id: 'direct:anthropic:claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', desc: 'Mais barato e rápido' },
    ]
  },
  openai: {
    label: 'Key OpenAI', placeholder: 'sk-xxx',
    hint: 'Exige saldo pré-pago. Adicione créditos em Billing.',
    helpHtml: '<div class="key-help-title">Passo a passo</div><ol><li>Acesse <a href="https://platform.openai.com/api-keys" target="_blank">platform.openai.com/api-keys</a></li><li>Faça login</li><li>Clique em <strong>"Create new secret key"</strong></li><li>Copie a chave (começa com <code>sk-</code>)</li></ol>',
    models: [
      { id: 'direct:openai:gpt-4.1', name: 'GPT-4.1', desc: 'Ótimo para código — equilíbrio perfeito' },
      { id: 'direct:openai:gpt-4.1-mini', name: 'GPT-4.1 Mini', desc: 'Mais barato — bom para tarefas simples' },
      { id: 'direct:openai:o3', name: 'o3', desc: 'Reasoning avançado — melhor para lógica' },
    ]
  },
  xai: {
    label: 'Key xAI', placeholder: 'xai-xxx',
    hint: 'Créditos grátis para novos usuários. Depois, precisa billing.',
    helpHtml: '<div class="key-help-title">Passo a passo</div><ol><li>Acesse <a href="https://console.x.ai/" target="_blank">console.x.ai</a></li><li>Faça login</li><li>Vá em <strong>"API Keys"</strong></li><li>Clique em <strong>"Create API Key"</strong></li><li>Copie (começa com <code>xai-</code>)</li></ol>',
    models: [
      { id: 'direct:xai:grok-3-fast', name: 'Grok 3 Fast', desc: 'Rápido e eficiente' },
      { id: 'direct:xai:grok-3', name: 'Grok 3', desc: 'Mais potente — raciocínio completo' },
      { id: 'direct:xai:grok-3-mini-fast', name: 'Grok 3 Mini Fast', desc: 'Mais barato e rápido' },
    ]
  },
  deepseek: {
    label: 'Key DeepSeek', placeholder: 'sk-xxx',
    hint: 'Créditos grátis para novos usuários. Preços muito acessíveis.',
    helpHtml: '<div class="key-help-title">Passo a passo</div><ol><li>Acesse <a href="https://platform.deepseek.com/api_keys" target="_blank">platform.deepseek.com/api_keys</a></li><li>Faça login ou crie conta</li><li>Clique em <strong>"Create API Key"</strong></li><li>Copie a chave gerada</li></ol>',
    models: [
      { id: 'direct:deepseek:deepseek-chat', name: 'DeepSeek V3', desc: 'Melhor custo-benefício do mercado' },
      { id: 'direct:deepseek:deepseek-reasoner', name: 'DeepSeek R1', desc: 'Reasoning — mais lento mas preciso' },
    ]
  },
  agentrouter: {
    label: 'Key Agent Router', placeholder: 'sk-xxx',
    hint: 'Proxy multi-IA — roteia entre vários modelos automaticamente.',
    helpHtml: '<div class="key-help-title">Passo a passo</div><ol><li>Acesse <a href="https://agentrouter.org/console/token" target="_blank">agentrouter.org/console/token</a></li><li>Faça login ou crie conta</li><li>Clique em <strong>"Generate New API Key"</strong></li><li>Copie a chave (começa com <code>sk-</code>)</li></ol>',
    models: [
      { id: 'direct:agentrouter:deepseek-v3.1', name: 'DeepSeek V3.1', desc: 'Equilíbrio custo/qualidade' },
      { id: 'direct:agentrouter:deepseek-r1-0528', name: 'DeepSeek R1', desc: 'Reasoning avançado' },
      { id: 'direct:agentrouter:glm-4.5', name: 'GLM-4.5', desc: 'Zhipu — alternativa interessante' },
    ]
  },
};

let obCurrentStep = 1;
let obSelectedProvider = null;
let obSelectedModel = null;

async function initOnboarding() {
  // Check if user needs onboarding (no github token AND no provider key AND no model)
  const config = await chrome.storage.local.get(['github_token', 'selected_model', 'onboarding_completed',
    ...ALL_KEY_IDS.map(id => STORAGE_KEY_PREFIX + id),
    ...ALL_KEY_IDS.map(id => STORAGE_KEYS_PREFIX + id)]);

  const hasGithub = !!config.github_token;
  const hasKey = ALL_KEY_IDS.some(id => {
    const keys = getProviderKeys(config, id);
    return keys.length > 0;
  });
  const hasModel = !!config.selected_model;
  const completed = !!config.onboarding_completed;

  if (completed || (hasGithub && hasKey && hasModel)) return;

  // Show onboarding
  document.getElementById('onboarding-overlay').classList.add('open');

  // Pre-fill if partial config exists
  if (hasGithub) {
    document.getElementById('ob-github-token').value = config.github_token;
  }
  // Always try to auto-fill repo from detected_github_repo
  const repoConfig = await chrome.storage.local.get(['detected_github_repo']);
  if (repoConfig.detected_github_repo) {
    document.getElementById('ob-github-repo').value = repoConfig.detected_github_repo;
    const autoBadge = document.getElementById('ob-auto-badge');
    const manualHint = document.getElementById('ob-repo-manual-hint');
    if (autoBadge) autoBadge.style.display = 'inline-block';
    if (manualHint) manualHint.style.display = 'none';
  }

  // Provider card clicks
  document.querySelectorAll('.ob-provider-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.ob-provider-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      obSelectedProvider = card.dataset.obProvider;
      showProviderKeySection(obSelectedProvider);
      updateObNextBtn();
    });
  });

  // Input listeners for validation
  document.getElementById('ob-github-token').addEventListener('input', updateObNextBtn);
  document.getElementById('ob-provider-key').addEventListener('input', updateObNextBtn);

  // Buttons
  document.getElementById('ob-btn-next').addEventListener('click', handleObNext);
  document.getElementById('ob-btn-back').addEventListener('click', handleObBack);
  document.getElementById('ob-btn-skip').addEventListener('click', handleObSkip);
}

function showProviderKeySection(providerId) {
  const info = OB_PROVIDER_INFO[providerId];
  if (!info) return;
  const section = document.getElementById('ob-key-section');
  section.style.display = 'block';
  document.getElementById('ob-key-label').textContent = info.label;
  document.getElementById('ob-provider-key').placeholder = info.placeholder;
  document.getElementById('ob-key-hint').textContent = info.hint;
  document.getElementById('ob-key-help').innerHTML = info.helpHtml;

  // Add pulse animation to draw attention to key input
  section.classList.remove('ob-key-pulse');
  void section.offsetWidth; // force reflow
  section.classList.add('ob-key-pulse');

  // Focus the key input after a small delay
  setTimeout(() => {
    document.getElementById('ob-provider-key').focus();
  }, 300);
}

async function renderObModels(providerId) {
  const info = OB_PROVIDER_INFO[providerId];
  if (!info) return;
  const list = document.getElementById('ob-model-list');
  const searchInput = document.getElementById('ob-model-search');

  // For OpenRouter, load dynamic models
  if (providerId === 'openrouter') {
    document.getElementById('ob-model-desc').textContent = 'Carregando modelos do OpenRouter...';
    searchInput.style.display = 'block';
    list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);">⏳ Carregando...</div>';

    try {
      // Reuse existing cache logic
      if (!openrouterModelsCache) {
        openrouterModelsLoaded = false;
        await loadOpenRouterModels();
      }
      const models = openrouterModelsCache || [];
      document.getElementById('ob-model-desc').textContent = `${models.length} modelos disponíveis no OpenRouter. Escolha o mais adequado.`;
      renderObOpenRouterModels(models);

      // Search filter
      searchInput.value = '';
      searchInput.oninput = () => {
        const q = searchInput.value.toLowerCase();
        renderObOpenRouterModels(openrouterModelsCache || [], q);
      };
    } catch (e) {
      list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--error);">❌ Erro ao carregar modelos</div>';
    }
    return;
  }

  // For other providers, use static models
  searchInput.style.display = 'none';
  document.getElementById('ob-model-desc').textContent = `Modelos disponíveis para ${info.label.replace('Key ', '')}. Escolha o mais adequado para seu uso.`;

  list.innerHTML = info.models.map(m => `
    <div class="ob-model-card" data-ob-model="${m.id}">
      <span class="ob-model-radio"></span>
      <div>
        <div class="ob-model-name">${m.name}</div>
        <div class="ob-model-desc">${m.desc}</div>
      </div>
    </div>
  `).join('');

  bindObModelCards(list);
}

function renderObOpenRouterModels(models, filter = '') {
  const list = document.getElementById('ob-model-list');
  const q = filter.toLowerCase();
  const filtered = q ? models.filter(m => m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q)) : models;

  let html = '';
  let lastFree = null;

  for (const m of filtered) {
    if (lastFree === true && !m.free) {
      html += '<div style="border-top:1px solid var(--border);margin:4px 0;"></div>';
    }
    lastFree = m.free;

    const badge = m.free
      ? '<span style="font-size:9px;padding:2px 6px;border-radius:6px;background:rgba(52,211,153,0.15);color:#34d399;font-weight:600;margin-left:auto;flex-shrink:0;">FREE</span>'
      : `<span style="font-size:8px;padding:2px 6px;border-radius:6px;background:var(--primary-dim);color:var(--primary);margin-left:auto;flex-shrink:0;">${m.cost || 'PAGO'}</span>`;

    html += `
      <div class="ob-model-card" data-ob-model="${m.id}" style="flex-direction:row;align-items:center;gap:10px;padding:10px 12px;">
        <span class="ob-model-radio"></span>
        <div style="flex:1;min-width:0;">
          <div class="ob-model-name" style="font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.name}</div>
          <div class="ob-model-desc" style="font-size:10px;opacity:0.5;">${m.id}</div>
        </div>
        ${badge}
      </div>`;
  }

  if (!filtered.length) {
    html = '<div style="text-align:center;padding:16px;color:var(--text-muted);font-size:12px;">Nenhum modelo encontrado</div>';
  }

  list.innerHTML = html;
  bindObModelCards(list);
}

function bindObModelCards(list) {
  list.querySelectorAll('.ob-model-card').forEach(card => {
    card.addEventListener('click', () => {
      list.querySelectorAll('.ob-model-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      obSelectedModel = card.dataset.obModel;
      updateObNextBtn();
    });
  });
}

function updateObNextBtn() {
  const btn = document.getElementById('ob-btn-next');
  if (obCurrentStep === 1) {
    const token = document.getElementById('ob-github-token').value.trim();
    btn.disabled = !token;
    btn.textContent = 'Próximo →';
  } else if (obCurrentStep === 2) {
    btn.disabled = !obSelectedProvider;
    btn.textContent = 'Próximo →';
  } else if (obCurrentStep === 3) {
    btn.disabled = !obSelectedModel;
    btn.textContent = '🚀 Concluir';
  }
}

function setObStep(step) {
  obCurrentStep = step;

  // Update stepper indicators
  for (let i = 1; i <= 3; i++) {
    const ind = document.getElementById(`ob-ind-${i}`);
    ind.classList.remove('active', 'done');
    if (i < step) ind.classList.add('done');
    else if (i === step) ind.classList.add('active');
  }
  for (let i = 1; i <= 2; i++) {
    const line = document.getElementById(`ob-line-${i}`);
    line.classList.toggle('done', i < step);
  }

  // Show/hide step content
  document.querySelectorAll('.ob-step-content').forEach(el => el.classList.remove('active'));
  const target = step <= 3 ? `ob-step-${step}` : 'ob-step-done';
  document.getElementById(target).classList.add('active');

  // Back button
  document.getElementById('ob-btn-back').style.display = step > 1 && step <= 3 ? '' : 'none';
  document.getElementById('ob-btn-skip').style.display = step <= 3 ? '' : 'none';

  if (step > 3) {
    document.getElementById('ob-btn-next').textContent = 'Começar a usar';
  }

  updateObNextBtn();
}

async function handleObNext() {
  if (obCurrentStep === 1) {
    const token = document.getElementById('ob-github-token').value.trim();
    const repo = document.getElementById('ob-github-repo').value.trim();
    if (!token) return;

    // Validate GitHub token before proceeding
    const btn = document.getElementById('ob-btn-next');
    const validationEl = document.getElementById('ob-github-validation');
    btn.disabled = true;
    btn.textContent = '⏳ Validando...';
    validationEl.style.display = 'block';
    validationEl.style.background = 'rgba(139,92,246,0.08)';
    validationEl.style.border = '1px solid rgba(139,92,246,0.2)';
    validationEl.style.color = 'var(--text-secondary)';
    validationEl.textContent = '🔄 Verificando token no GitHub...';

    try {
      const res = await fetch('https://api.github.com/user', {
        headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' }
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        validationEl.style.background = 'rgba(248,113,113,0.1)';
        validationEl.style.border = '1px solid rgba(248,113,113,0.3)';
        validationEl.style.color = 'var(--error)';
        validationEl.innerHTML = res.status === 401
          ? '❌ <strong>Token inválido!</strong> Verifique se copiou corretamente ou gere um novo.'
          : `❌ <strong>Erro ${res.status}:</strong> ${errorData.message || 'Não foi possível validar o token.'}`;
        btn.disabled = false;
        btn.textContent = 'Próximo →';
        return;
      }
      const user = await res.json();
      validationEl.style.background = 'rgba(52,211,153,0.1)';
      validationEl.style.border = '1px solid rgba(52,211,153,0.3)';
      validationEl.style.color = 'var(--success)';
      validationEl.innerHTML = `✅ Conectado como <strong>${user.login}</strong>`;
    } catch (e) {
      validationEl.style.background = 'rgba(251,191,36,0.1)';
      validationEl.style.border = '1px solid rgba(251,191,36,0.3)';
      validationEl.style.color = 'var(--warning)';
      validationEl.innerHTML = 'Não foi possível verificar (sem internet?). Continuando...';
    }

    // Save to main config inputs AND to chrome.storage immediately
    document.getElementById('github-token').value = token;
    if (repo) document.getElementById('detected-repo').value = repo;
    const step1Data = { github_token: token };
    if (repo) step1Data.detected_github_repo = repo;
    await chrome.storage.local.set(step1Data);

    // Small delay so user sees the success/warning message
    await new Promise(r => setTimeout(r, 800));
    btn.disabled = false;
    setObStep(2);
  } else if (obCurrentStep === 2) {
    if (!obSelectedProvider) return;

    const key = document.getElementById('ob-provider-key').value.trim();
    if (!key) {
      // Some providers may not need a key, proceed
      await renderObModels(obSelectedProvider);
      setObStep(3);
      return;
    }

    // Validate AI provider key before proceeding
    const btn2 = document.getElementById('ob-btn-next');
    const valEl = document.getElementById('ob-provider-validation');
    btn2.disabled = true;
    btn2.textContent = 'Validando...';
    valEl.style.display = 'block';
    valEl.style.background = 'rgba(139,92,246,0.08)';
    valEl.style.border = '1px solid rgba(139,92,246,0.2)';
    valEl.style.color = 'var(--text-secondary)';
    valEl.textContent = 'Verificando chave de API...';

    const result = await validateApiKey(obSelectedProvider, key);

    if (result.ok) {
      valEl.style.background = 'rgba(52,211,153,0.1)';
      valEl.style.border = '1px solid rgba(52,211,153,0.3)';
      valEl.style.color = 'var(--success)';
      valEl.innerHTML = 'Chave válida — conectado com sucesso';
    } else {
      valEl.style.background = 'rgba(248,113,113,0.1)';
      valEl.style.border = '1px solid rgba(248,113,113,0.3)';
      valEl.style.color = 'var(--error)';
      valEl.innerHTML = `<strong>Chave inválida!</strong> ${result.error || 'Verifique e tente novamente.'}`;
      btn2.disabled = false;
      btn2.textContent = 'Próximo →';
      return;
    }

    // Save key to DOM AND to chrome.storage immediately
    renderProviderKeys(obSelectedProvider, [key]);
    await chrome.storage.local.set({
      [STORAGE_KEYS_PREFIX + obSelectedProvider]: JSON.stringify([key]),
      [STORAGE_KEY_PREFIX + obSelectedProvider]: key,
    });

    // Small delay so user sees the success message
    await new Promise(r => setTimeout(r, 800));
    btn2.disabled = false;

    // Render models for selected provider
    await renderObModels(obSelectedProvider);
    setObStep(3);
  } else if (obCurrentStep === 3) {
    if (!obSelectedModel) return;

    // Save model
    const customInput = document.getElementById('openai-model');
    if (customInput) customInput.value = obSelectedModel;

    // Select matching model-option in main config
    document.querySelectorAll('.model-option').forEach(el => {
      el.classList.toggle('selected', el.dataset.model === obSelectedModel);
    });
    const bar = document.getElementById('selected-model-name');
    if (bar) bar.textContent = obSelectedModel;

    // Save everything
    await saveConfig();
    await chrome.storage.local.set({ onboarding_completed: true });

    setObStep(4); // success
  } else {
    // Close onboarding
    document.getElementById('onboarding-overlay').classList.remove('open');
    updateGearBadge();
  }
}

function handleObBack() {
  if (obCurrentStep > 1) setObStep(obCurrentStep - 1);
}

async function handleObSkip() {
  await chrome.storage.local.set({ onboarding_completed: true });
  document.getElementById('onboarding-overlay').classList.remove('open');
}

function updateGearBadge() {
  const badge = document.getElementById('gear-badge');
  const githubToken = document.getElementById('github-token')?.value;
  const hasAnyKey = ALL_KEY_IDS.some(id => document.getElementById(`key-${id}`)?.value?.trim());
  if (githubToken && hasAnyKey) {
    badge.classList.add('all-ok', 'hidden');
  } else {
    badge.classList.remove('all-ok', 'hidden');
  }

  const dotGithub = document.getElementById('dot-github');
  if (dotGithub) dotGithub.classList.toggle('on', !!githubToken);
}
