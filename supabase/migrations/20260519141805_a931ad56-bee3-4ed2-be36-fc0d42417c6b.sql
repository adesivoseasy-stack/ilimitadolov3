UPDATE system_config SET value = replace(
  value,
  '<button class="tab-btn" id="tabTemplates" data-tab="templates">Templates</button>',
  ''
) WHERE key='extension_front_html';

UPDATE system_config SET value = replace(
  value,
  '<div class="templates-container" id="templatesPanel"></div>',
  ''
) WHERE key='extension_front_html';

UPDATE system_config SET value = replace(
  value,
  '<div class="input-actions">
        <button class="send-btn" id="sendBtn">',
  '<div class="input-actions">
        <button class="enhance-btn" id="enhanceBtn" title="Melhorar prompt com IA"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/></svg><span>Melhorar</span></button>
        <button class="send-btn" id="sendBtn">'
) WHERE key='extension_front_html';

UPDATE system_config SET value = replace(
  value,
  '.send-btn:disabled { background: var(--bg-tertiary); color: var(--text-muted); cursor: not-allowed; opacity: 0.4; box-shadow: none; transform: none; }',
  '.send-btn:disabled { background: var(--bg-tertiary); color: var(--text-muted); cursor: not-allowed; opacity: 0.4; box-shadow: none; transform: none; }
.enhance-btn { display: inline-flex; align-items: center; gap: 5px; height: 28px; padding: 0 10px; border-radius: 100px; background: linear-gradient(135deg, rgba(139,92,246,0.18), rgba(139,92,246,0.08)); color: var(--accent); border: 1px solid rgba(139,92,246,0.35); font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; flex-shrink: 0; }
.enhance-btn:hover { background: linear-gradient(135deg, rgba(139,92,246,0.32), rgba(139,92,246,0.18)); box-shadow: 0 2px 10px rgba(139,92,246,0.3); transform: translateY(-1px); }
.enhance-btn:disabled { opacity: 0.5; cursor: wait; transform: none; }
.enhance-btn.loading svg { animation: enhanceSpin 1s linear infinite; }
@keyframes enhanceSpin { to { transform: rotate(360deg); } }'
) WHERE key='extension_front_html';