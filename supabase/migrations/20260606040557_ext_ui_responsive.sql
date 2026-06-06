-- Add responsive CSS and image thumbnail constraints to extension UI
DO $$
DECLARE
  extra text := E'\n/* === Responsive fixes & image thumbnails === */\n.banner { max-height: 110px; }\n.banner img { max-height: 110px; object-fit: cover; }\n.bubble img, .bubble video { max-width: 180px; max-height: 180px; border-radius: 10px; display: block; margin: 4px 0; object-fit: cover; cursor: zoom-in; }\n.file-chip img { width: 36px; height: 36px; object-fit: cover; border-radius: 6px; }\n.file-preview img { max-width: 48px; max-height: 48px; object-fit: cover; border-radius: 6px; }\n@media (max-width: 380px) {\n  .header { padding: 8px 10px; }\n  .header-logo { height: 14px; }\n  .license-badge { font-size: 9px; padding: 3px 8px; }\n  .publish-btn { padding: 4px 10px; font-size: 10px; }\n  .icon-btn { width: 26px; height: 26px; }\n  .banner, .banner img { max-height: 80px; }\n  .bubble { font-size: 12.5px; padding: 9px 13px; }\n  .empty-logo { width: 56px; height: 56px; }\n  .empty-state h3 { font-size: 14px; }\n  .empty-state p { font-size: 12px; }\n  .empty-suggestions button { font-size: 11px; padding: 5px 11px; }\n  .input-area { padding: 8px 10px 12px; }\n  .input-wrapper textarea { font-size: 13px; min-height: 44px; }\n}\n@media (max-height: 600px) {\n  .banner, .banner img { max-height: 60px; }\n  .empty-logo { width: 48px; height: 48px; margin-bottom: 8px; }\n  .input-wrapper textarea { min-height: 40px; }\n}\n';
BEGIN
  UPDATE public.system_config
  SET value = replace(value, '</style>', extra || '</style>'),
      updated_at = now()
  WHERE key = 'extension_front_html'
    AND position('=== Responsive fixes & image thumbnails ===' in value) = 0;
END $$;
