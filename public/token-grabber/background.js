chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    const headers = details.requestHeaders || [];
    let authHeader = null;

    for (const header of headers) {
      if (header.name?.toLowerCase() === 'authorization' && header.value?.startsWith('Bearer ')) {
        authHeader = header.value.replace(/^Bearer\s+/i, '');
        break;
      }
    }

    if (authHeader) {
      chrome.storage.local.set({
        lovable_api_token: authHeader,
        lovable_api_token_ts: Date.now(),
      });
    }
  },
  {
    urls: [
      'https://api.lovable.dev/*',
      'https://lovable-api.com/*',
    ],
  },
  ['requestHeaders']
);