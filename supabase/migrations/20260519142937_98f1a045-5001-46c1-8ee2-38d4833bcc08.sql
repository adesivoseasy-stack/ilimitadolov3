UPDATE system_config
SET value = replace(replace(value, '<span>Melhorar</span>', '<span>Otimizar com IA</span>'), 'title="Melhorar prompt com IA"', 'title="Otimizar com IA"')
WHERE key = 'extension_front_html';