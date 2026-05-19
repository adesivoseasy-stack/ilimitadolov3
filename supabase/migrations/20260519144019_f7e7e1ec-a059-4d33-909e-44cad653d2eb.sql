UPDATE system_config
SET value = replace(
  replace(
    value,
    '<div id="filePreview" class="file-preview"></div>',
    '<div id="filePreview" class="file-preview"></div>' || E'\n' ||
    '    <div id="quickSuggestions" class="quick-suggestions"></div>'
  ),
  '@keyframes enhanceSpin { to { transform: rotate(360deg); } }',
  '@keyframes enhanceSpin { to { transform: rotate(360deg); } }' || E'\n\n' ||
  '/* Quick suggestions (captured from Lovable) */' || E'\n' ||
  '.quick-suggestions { display: none; flex-wrap: nowrap; gap: 6px; padding: 8px 12px 0; overflow-x: auto; scrollbar-width: none; }' || E'\n' ||
  '.quick-suggestions::-webkit-scrollbar { display: none; }' || E'\n' ||
  '.qs-chip { flex-shrink: 0; white-space: nowrap; padding: 6px 12px; height: 28px; border-radius: 100px; background: rgba(139,92,246,0.10); color: var(--text-primary); border: 1px solid rgba(139,92,246,0.30); font-size: 11.5px; font-weight: 500; cursor: pointer; transition: all 0.18s ease; }' || E'\n' ||
  '.qs-chip:hover { background: rgba(139,92,246,0.22); border-color: rgba(139,92,246,0.55); transform: translateY(-1px); }'
)
WHERE key = 'extension_front_html';