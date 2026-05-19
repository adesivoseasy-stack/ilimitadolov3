UPDATE system_config 
SET value = replace(
  replace(
    replace(
      replace(
        replace(
          replace(
            value,
            'padding: 14px 16px;',
            'padding: 10px 12px;'
          ),
          'background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
}
.header-logo { height: 14px; border-radius: 10px; object-fit: contain; margin-left: 8px; }
.header-right { display: flex; align-items: center; gap: 8px; }',
          'background: linear-gradient(180deg, rgba(139,92,246,0.08) 0%, var(--bg-secondary) 100%);
  border-bottom: 1px solid var(--border);
}
.header-left { display: flex; align-items: center; gap: 10px; }
.header-logo { height: 16px; border-radius: 10px; object-fit: contain; }
.header-right { display: flex; align-items: center; gap: 6px; }'
        ),
        'background: rgba(48,209,88,0.12);
  font-size: 11px; font-weight: 600; color: var(--green);
}
.license-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--green); }',
        'background: rgba(48,209,88,0.1);
  font-size: 10px; font-weight: 600; color: var(--green);
  border: 1px solid rgba(48,209,88,0.15);
}
.license-dot {
  width: 5px; height: 5px; border-radius: 50%; background: var(--green);
  box-shadow: 0 0 6px rgba(48,209,88,0.6);
  animation: pulse-dot 2s ease-in-out infinite;
}
@keyframes pulse-dot {
  0%, 100% { opacity: 1; box-shadow: 0 0 6px rgba(48,209,88,0.6); }
  50% { opacity: 0.6; box-shadow: 0 0 2px rgba(48,209,88,0.3); }
}'
      ),
      'padding: 6px 16px; border-radius: 100px;
  background: var(--accent); color: white;
  font-size: 13px; font-weight: 600;
  border: none; cursor: pointer;
  transition: opacity 0.15s ease;
}
.publish-btn:hover { opacity: 0.85; }',
      'padding: 5px 14px; border-radius: 100px;
  background: linear-gradient(135deg, var(--accent), #A78BFA);
  color: white;
  font-size: 11px; font-weight: 700; letter-spacing: 0.02em;
  border: none; cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(139,92,246,0.25);
}
.publish-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(139,92,246,0.35); }
.publish-btn:active { transform: translateY(0); }'
    ),
    'width: 32px; height: 32px; border-radius: 8px;
  background: transparent; border: none;',
    'width: 30px; height: 30px; border-radius: 8px;
  background: rgba(255,255,255,0.04); border: 1px solid transparent;'
  ),
  '.icon-btn:hover { background: var(--bg-tertiary); color: var(--text); }
.icon-btn.danger:hover { color: var(--red); }',
  '.icon-btn:hover { background: rgba(255,255,255,0.08); border-color: var(--border); color: var(--text); }
.icon-btn.danger:hover { color: var(--red); background: rgba(255,69,58,0.08); border-color: rgba(255,69,58,0.15); }'
)
WHERE key = 'extension_front_html';