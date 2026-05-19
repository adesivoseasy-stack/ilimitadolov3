// Background service worker - Opens side panel on extension icon click

chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ tabId: tab.id });
});

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

chrome.webRequest.onSendHeaders.addListener(
  (details) => {
    if (!details.requestHeaders) return;

    let apiToken = null;
    let gitSha = null;

    for (const header of details.requestHeaders) {
      const name = header.name.toLowerCase();
      if (name === 'authorization' && header.value) apiToken = header.value;
      if (name === 'x-client-git-sha' && header.value) gitSha = header.value;
    }

    if (apiToken) {
      const dataToStore = { lovable_api_token: apiToken, lovable_api_token_ts: Date.now() };
      if (gitSha) dataToStore.lovable_git_sha = gitSha;
      chrome.storage.local.set(dataToStore);
      console.log('[Background] 🔑 Captured Lovable API token via webRequest');
    }
  },
  { urls: ['https://api.lovable.dev/*'] },
  ['requestHeaders']
);

// Listen for messages from content scripts, side panel, and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openUrl' && message.url) {
    chrome.tabs.create({ url: message.url });
    sendResponse({ success: true });
    return true;
  }

  // Relay captured chat messages from content script to sidepanel
  if (message.action === 'chatCaptured') {
    chrome.runtime.sendMessage({
      action: 'chatCapturedRelay',
      content: message.content,
      source: message.source || 'dom',
      timestamp: message.timestamp
    }).catch(() => {});
    sendResponse({ ok: true });
    return true;
  }

  if (message.action === 'tokenCaptured') {
    chrome.runtime.sendMessage({
      action: 'tokenCapturedRelay',
      token: message.token,
      gitSha: message.gitSha
    }).catch(() => {});
    sendResponse({ ok: true });
    return true;
  }

  if (message.action === 'suggestionsCaptured') {
    chrome.runtime.sendMessage({
      action: 'suggestionsCapturedRelay',
      items: message.items || []
    }).catch(() => {});
    sendResponse({ ok: true });
    return true;
  }

  // Download project source-code (CORS-free from background)
  if (message.action === 'downloadSourceCode') {
    const { projectId, token } = message;
    console.log('[Background] 📦 Fetching source-code for project:', projectId);

    fetch(`https://lovable-api.com/projects/${projectId}/source-code`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    })
    .then(response => {
      console.log('[Background] source-code status:', response.status);
      if (!response.ok) throw new Error(`API returned ${response.status}`);
      return response.json();
    })
    .then(data => {
      const files = Array.isArray(data) ? data : (data.files || data.data || []);
      console.log('[Background] ✅ Got', files.length, 'files');
      sendResponse({ success: true, files });
    })
    .catch(error => {
      console.error('[Background] ❌ Source-code fetch failed:', error);
      sendResponse({ success: false, error: error.message });
    });

    return true; // Keep channel open for async
  }

  // Fetch a single raw file (for binary/image assets)
  if (message.action === 'fetchRawFile') {
    const { projectId, filePath, token } = message;

    fetch(`https://api.lovable.dev/projects/${projectId}/files/raw?path=${encodeURIComponent(filePath)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': '*/*'
      }
    })
    .then(async (response) => {
      if (!response.ok) {
        sendResponse({ success: false, error: `HTTP ${response.status}` });
        return;
      }
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text') || contentType.includes('json') || contentType.includes('javascript') || contentType.includes('xml') || contentType.includes('svg')) {
        const text = await response.text();
        sendResponse({ success: true, data: text, type: 'text' });
      } else {
        // Convert ArrayBuffer to base64 for message passing
        const buffer = await response.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        sendResponse({ success: true, data: base64, type: 'binary' });
      }
    })
    .catch(error => {
      sendResponse({ success: false, error: error.message });
    });

    return true;
  }
});
