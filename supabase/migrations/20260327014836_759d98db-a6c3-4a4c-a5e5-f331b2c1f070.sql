UPDATE system_config 
SET value = replace(
  value,
  'padding: 0; outline: none;
}',
  'padding: 0; outline: none;
  overflow-y: hidden;
  transition: height 0.1s ease;
}'
)
WHERE key = 'extension_front_html' AND value NOT LIKE '%overflow-y: hidden%';