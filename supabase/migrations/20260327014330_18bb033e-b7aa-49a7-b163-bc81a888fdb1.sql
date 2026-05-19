UPDATE system_config 
SET value = regexp_replace(
  regexp_replace(
    value,
    '\.input-actions \{ display: flex; align-items: center; gap: 4px; flex-shrink: 0; \}\n\.send-btn \{',
    '.input-actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
.attach-btn {
  width: 32px; height: 32px; border-radius: 50%;
  background: transparent; color: var(--text-secondary);
  border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: color 0.15s ease;
}
.attach-btn:hover { color: var(--accent); }
.file-preview {
  display: none; flex-wrap: wrap; gap: 6px;
  padding: 6px 14px 0;
}
.file-chip {
  display: flex; align-items: center; gap: 4px;
  padding: 3px 8px; border-radius: 8px;
  background: var(--accent-glow); border: 1px solid var(--border);
  font-size: 11px; color: var(--text-secondary);
}
.file-chip button {
  background: none; border: none; color: var(--text-muted);
  cursor: pointer; font-size: 14px; line-height: 1; padding: 0 2px;
}
.file-chip button:hover { color: var(--red); }
.send-btn {'
  ),
  '<div class="input-area">\n    <div class="input-wrapper">\n      <textarea id="message"',
  '<div class="input-area">
    <input type="file" id="fileInput" multiple style="display:none">
    <div id="filePreview" class="file-preview"></div>
    <div class="input-wrapper">
      <button class="attach-btn" id="attachBtn" title="Anexar arquivo">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.51a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
      </button>
      <textarea id="message"'
)
WHERE key = 'extension_front_html';