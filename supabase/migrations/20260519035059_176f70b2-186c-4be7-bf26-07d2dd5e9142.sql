UPDATE system_config
SET value = replace(
  replace(
    value,
    'flex: 1; min-height: 22px; max-height: 120px;',
    'flex: 1; min-height: 60px; max-height: 200px;'
  ),
  E'padding: 0; outline: none;\n  overflow-y: hidden;',
  E'padding: 0; outline: none;\n  overflow-y: auto;\n  white-space: pre-wrap;\n  word-break: break-word;'
)
WHERE key = 'extension_front_html';