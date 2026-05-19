// Remote UI runtime for blob-loaded extension UI
const bridge = {
  _pending: {},
  _counter: 0,

  _call(command, payload) {
    return new Promise((resolve, reject) => {
      const requestId = 'req_' + (++this._counter);
      this._pending[requestId] = { resolve, reject };
      window.parent.postMessage({ requestId, command, payload }, '*');
      // Download needs more time (up to 180s for large projects), other commands 15s
      const timeoutMs = command === 'lovable.downloadProject' ? 180000 : 15000;
      setTimeout(() => {
        if (this._pending[requestId]) {
          delete this._pending[requestId];
          reject(new Error('Bridge timeout: ' + command));
        }
      }, timeoutMs);
    });
  },

  _handleResponse(event) {
    const { requestId, ok, payload, error } = event.data || {};
    if (!requestId || !bridge._pending[requestId]) return;
    const { resolve, reject } = bridge._pending[requestId];
    delete bridge._pending[requestId];
    if (ok) resolve(payload);
    else reject(new Error(error || 'Bridge error'));
  },

  storage: {
    get: (keys) => bridge._call('storage.get', { keys }),
    set: (data) => bridge._call('storage.set', { data }),
  },
  auth: {
    getToken: () => bridge._call('auth.getToken'),
  },
  project: {
    getActive: () => bridge._call('project.getActive'),
  },
  license: {
    getInfo: () => bridge._call('license.getInfo'),
    revalidate: () => bridge._call('license.revalidate'),
    logout: () => bridge._call('license.logout'),
  },
  lovable: {
    sendMessage: (message, projectId, files) => bridge._call('lovable.sendMessage', { message, projectId, files }),
    publish: () => bridge._call('lovable.publish'),
    downloadProject: (projectId) => bridge._call('lovable.downloadProject', { projectId }),
  },
  templates: {
    getAll: () => bridge._call('templates.getAll'),
  },
  ai: {
    enhancePrompt: (prompt) => bridge._call('ai.enhancePrompt', { prompt }),
  },
  runtime: {
    openUrl: (url) => bridge._call('runtime.openUrl', { url }),
  },
};

window.addEventListener('message', (e) => {
  // Handle captured chat messages from content script
  const { command, payload } = e.data || {};
  if (command === 'chat.captured' && payload?.content) {
    addMessage('bot', '💬 ' + payload.content);
    return;
  }
  bridge._handleResponse(e);
});

let history = [];
let pendingFiles = [];
const historyEl = document.getElementById('history');
const messageEl = document.getElementById('message');
const sendBtn = document.getElementById('sendBtn');
const statusEl = document.getElementById('status');
const clearBtn = document.getElementById('clearBtn');
const publishBtn = document.getElementById('publishBtn');
const logoutBtn = document.getElementById('logoutBtn');
const licenseInfoEl = document.getElementById('licenseInfo');
const attachBtn = document.getElementById('attachBtn');
const fileInput = document.getElementById('fileInput');
const filePreview = document.getElementById('filePreview');

function updateStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

function addMessage(role, content) {
  history.push({ role, content, time: new Date().toLocaleTimeString() });
  if (history.length > 50) history.shift();
  bridge.storage.set({ history });
  renderHistory();
}

function renderHistory() {
  if (!historyEl) return;
  historyEl.innerHTML = '';
  if (history.length === 0) {
    historyEl.innerHTML = '<div class="empty-state"><h3>Pronto para começar</h3><p>Envie uma mensagem para interagir</p></div>';
    return;
  }
  history.forEach((m) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'message-wrapper ' + m.role;
    const bubble = document.createElement('div');
    bubble.className = 'bubble ' + m.role;
    bubble.textContent = m.content;
    wrapper.appendChild(bubble);
    historyEl.appendChild(wrapper);
  });
  historyEl.scrollTop = historyEl.scrollHeight;
}

// === File attachment logic ===
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function renderFilePreview() {
  if (!filePreview) return;
  if (pendingFiles.length === 0) {
    filePreview.style.display = 'none';
    filePreview.innerHTML = '';
    return;
  }
  filePreview.style.display = 'flex';
  filePreview.innerHTML = '';
  pendingFiles.forEach((f, i) => {
    const chip = document.createElement('div');
    chip.className = 'file-chip';
    const name = document.createElement('span');
    name.textContent = f.name.length > 20 ? f.name.slice(0, 17) + '...' : f.name;
    const removeBtn = document.createElement('button');
    removeBtn.textContent = '×';
    removeBtn.onclick = () => { pendingFiles.splice(i, 1); renderFilePreview(); };
    chip.appendChild(name);
    chip.appendChild(removeBtn);
    filePreview.appendChild(chip);
  });
}

function addFiles(files) {
  const MAX_FILES = 5;
  const MAX_SIZE = 50 * 1024 * 1024; // 50MB
  for (const file of files) {
    if (pendingFiles.length >= MAX_FILES) break;
    if (file.size > MAX_SIZE) {
      addMessage('bot', '❌ Arquivo "' + file.name + '" excede 50MB');
      continue;
    }
    pendingFiles.push(file);
  }
  renderFilePreview();
}

attachBtn?.addEventListener('click', () => fileInput?.click());
fileInput?.addEventListener('change', (e) => {
  if (e.target.files?.length) {
    addFiles(e.target.files);
    fileInput.value = '';
  }
});

// Drag & drop on message area
messageEl?.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); });
messageEl?.addEventListener('drop', (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
});

// Paste files (Ctrl+V)
messageEl?.addEventListener('paste', (e) => {
  const items = e.clipboardData?.items;
  if (!items) return;
  const files = [];
  for (const item of items) {
    if (item.kind === 'file') {
      const f = item.getAsFile();
      if (f) files.push(f);
    }
  }
  if (files.length) addFiles(files);
});

async function handleSend() {
  const text = messageEl?.value.trim();
  if (!text && pendingFiles.length === 0) return;
  if (!messageEl || !sendBtn) return;

  // Build message content description
  let displayText = text || '';
  if (pendingFiles.length > 0) {
    const fileNames = pendingFiles.map(f => f.name).join(', ');
    displayText += (displayText ? '\n' : '') + '📎 ' + fileNames;
  }
  addMessage('user', displayText);
  messageEl.value = '';
  sendBtn.disabled = true;
  updateStatus('📤 Enviando...');

  try {
    // Convert files to base64
    let filesData = [];
    if (pendingFiles.length > 0) {
      updateStatus('📤 Processando arquivos...');
      filesData = await Promise.all(
        pendingFiles.map(async (f) => ({
          name: f.name,
          type: f.type,
          size: f.size,
          data: await fileToBase64(f),
        }))
      );
      pendingFiles = [];
      renderFilePreview();
    }

    const { projectId } = await bridge.project.getActive();

    let result;
    if (filesData.length > 0) {
      result = await bridge.lovable.sendMessage(text || '', projectId, filesData);
    } else {
      result = await bridge.lovable.sendMessage(text, projectId);
    }

    if (result?.reply) addMessage('bot', result.reply);
    else if (result?.output) addMessage('bot', result.output);
    else if (result?.message) addMessage('bot', result.message);
    else addMessage('bot', '✅ Comando processado!');
    updateStatus('✅ Pronto');
  } catch (err) {
    addMessage('bot', '❌ ' + (err?.message || 'Erro ao enviar'));
    updateStatus('❌ Erro');
  } finally {
    sendBtn.disabled = false;
  }
}

sendBtn?.addEventListener('click', handleSend);
messageEl?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});
messageEl?.addEventListener('input', () => {
  if (!messageEl) return;
  messageEl.style.height = 'auto';
  messageEl.style.height = Math.min(messageEl.scrollHeight, 200) + 'px';
});

// Remove Watermark quick action
const removeWatermarkBtn = document.getElementById('removeWatermarkBtn');
removeWatermarkBtn?.addEventListener('click', () => {
  if (!messageEl) return;
  messageEl.value = `Adicione esse código no final do código do index.css:\n\n#lovable-badge {\n  display: none !important;\n}`;
  handleSend();
});
clearBtn?.addEventListener('click', () => {
  history = [];
  bridge.storage.set({ history: [] });
  renderHistory();
});
logoutBtn?.addEventListener('click', () => bridge.license.logout());

// === Enhance prompt with AI ===
const enhanceBtn = document.getElementById('enhanceBtn');
enhanceBtn?.addEventListener('click', async () => {
  if (!messageEl) return;
  const original = messageEl.value.trim();
  if (!original) {
    updateStatus('⚠️ Digite algo para melhorar');
    return;
  }
  enhanceBtn.disabled = true;
  enhanceBtn.classList.add('loading');
  const label = enhanceBtn.querySelector('span');
  const prevLabel = label?.textContent;
  if (label) label.textContent = 'Otimizando...';
  updateStatus('✨ Melhorando prompt...');
  try {
    const result = await bridge.ai.enhancePrompt(original);
    if (result?.improved) {
      messageEl.value = result.improved;
      messageEl.style.height = 'auto';
      messageEl.style.height = Math.min(messageEl.scrollHeight, 200) + 'px';
      messageEl.focus();
      updateStatus('✅ Prompt otimizado');
    } else {
      throw new Error(result?.error || 'Resposta vazia');
    }
  } catch (err) {
    addMessage('bot', '❌ ' + (err?.message || 'Erro ao melhorar prompt'));
    updateStatus('❌ Erro');
  } finally {
    enhanceBtn.disabled = false;
    enhanceBtn.classList.remove('loading');
    if (label && prevLabel) label.textContent = prevLabel;
  }
});

const downloadBtn = document.getElementById('downloadBtn');
downloadBtn?.addEventListener('click', async () => {
  downloadBtn.disabled = true;
  downloadBtn.style.opacity = '0.5';
  updateStatus('⬇️ Preparando download...');
  try {
    const { projectId } = await bridge.project.getActive();
    if (!projectId) throw new Error('Nenhum projeto ativo');
    const result = await bridge.lovable.downloadProject(projectId);
    if (result?.success) {
      addMessage('bot', '✅ Download iniciado!');
      updateStatus('✅ Download iniciado');
    } else {
      throw new Error(result?.error || 'Erro ao baixar');
    }
  } catch (err) {
    addMessage('bot', '❌ ' + (err?.message || 'Erro ao baixar projeto'));
    updateStatus('❌ Erro no download');
  } finally {
    downloadBtn.disabled = false;
    downloadBtn.style.opacity = '1';
  }
});

publishBtn?.addEventListener('click', async () => {
  publishBtn.disabled = true;
  try {
    const result = await bridge.lovable.publish();
    if (result?.success) addMessage('bot', '✅ Projeto publicado! 🚀');
    else addMessage('bot', '❌ ' + (result?.error || 'Erro ao publicar'));
  } catch (err) {
    addMessage('bot', '❌ ' + (err?.message || 'Erro ao publicar'));
  } finally {
    publishBtn.disabled = false;
  }
});

// === Tab switching & Templates ===
const tabChat = document.getElementById('tabChat');
const tabTemplates = document.getElementById('tabTemplates');
const chatPanel = document.getElementById('chatPanel');
const templatesPanel = document.getElementById('templatesPanel');
const templatesLoading = document.getElementById('templatesLoading');
let templatesLoaded = false;
let cachedTemplates = [];

function switchTab(tab) {
  if (tab === 'chat') {
    tabChat?.classList.add('active');
    tabTemplates?.classList.remove('active');
    if (chatPanel) chatPanel.classList.remove('hidden');
    if (templatesPanel) templatesPanel.classList.remove('visible');
  } else {
    tabTemplates?.classList.add('active');
    tabChat?.classList.remove('active');
    if (chatPanel) chatPanel.classList.add('hidden');
    if (templatesPanel) templatesPanel.classList.add('visible');
    if (!templatesLoaded) loadTemplates();
  }
}

tabChat?.addEventListener('click', () => switchTab('chat'));
tabTemplates?.addEventListener('click', () => switchTab('templates'));

async function loadTemplates() {
  if (templatesLoading) templatesLoading.style.display = 'flex';
  try {
    const result = await bridge.templates.getAll();
    cachedTemplates = result?.templates || [];
    templatesLoaded = true;
    renderTemplates();
  } catch (err) {
    console.error('Error loading templates:', err);
    if (templatesPanel) {
      templatesPanel.innerHTML = '<div class="templates-empty"><p>❌ Erro ao carregar templates</p></div>';
    }
  }
}

function renderTemplates() {
  if (!templatesPanel) return;
  templatesPanel.innerHTML = '';

  if (cachedTemplates.length === 0) {
    templatesPanel.innerHTML = '<div class="templates-empty"><p>Nenhum template disponível</p></div>';
    return;
  }

  // Group by category
  const grouped = {};
  cachedTemplates.forEach(t => {
    const cat = t.category || 'Geral';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(t);
  });

  Object.keys(grouped).sort().forEach(cat => {
    const label = document.createElement('div');
    label.className = 'template-category';
    label.textContent = cat;
    templatesPanel.appendChild(label);

    grouped[cat].forEach(t => {
      const card = document.createElement('div');
      card.className = 'template-card';

      const thumb = document.createElement('div');
      thumb.className = 'template-thumb';
      if (t.video_url) {
        const vid = document.createElement('video');
        vid.src = t.video_url;
        vid.autoplay = true;
        vid.loop = true;
        vid.muted = true;
        vid.playsInline = true;
        thumb.appendChild(vid);
      } else if (t.image_url) {
        const img = document.createElement('img');
        img.src = t.image_url;
        img.alt = t.name;
        img.loading = 'lazy';
        thumb.appendChild(img);
      } else {
        thumb.textContent = '📄';
      }
      card.appendChild(thumb);

      const bottom = document.createElement('div');
      bottom.className = 'template-bottom';

      const info = document.createElement('div');
      info.className = 'template-info';
      const name = document.createElement('div');
      name.className = 'template-name';
      name.textContent = t.name;
      info.appendChild(name);
      if (t.description) {
        const desc = document.createElement('div');
        desc.className = 'template-desc';
        desc.textContent = t.description;
        info.appendChild(desc);
      }

      const useBtn = document.createElement('button');
      useBtn.className = 'template-use';
      useBtn.textContent = 'Usar';
      useBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        useTemplate(t);
      });

      bottom.appendChild(info);
      bottom.appendChild(useBtn);
      card.appendChild(bottom);
      card.addEventListener('click', () => useTemplate(t));
      templatesPanel.appendChild(card);
    });
  });
}

function useTemplate(template) {
  switchTab('chat');
  if (messageEl) {
    messageEl.value = template.code;
    messageEl.focus();
    messageEl.style.height = 'auto';
    messageEl.style.height = Math.min(messageEl.scrollHeight, 120) + 'px';
  }
}

(async () => {
  try {
    const stored = await bridge.storage.get(['history']);
    if (stored?.history) {
      history = stored.history;
      renderHistory();
    }

    const info = await bridge.license.getInfo();
    if (info?.licenseInfo && licenseInfoEl) {
      const li = info.licenseInfo;
      if (li.hours_remaining && li.hours_remaining < 24) licenseInfoEl.textContent = li.hours_remaining + 'h';
      else if (li.days_remaining) licenseInfoEl.textContent = li.days_remaining + ' dias';
      else licenseInfoEl.textContent = 'Ativo';
    }

    const { projectId } = await bridge.project.getActive();
    if (projectId) updateStatus('✅ Projeto: ' + projectId.slice(0, 8) + '...');
    else updateStatus('⚠️ Abra um projeto no Lovable.dev');
  } catch (err) {
    updateStatus('⚠️ Inicializando...');
    console.warn('Init error:', err);
  }
})();
