DO $$
DECLARE
  extra text := E'\n/* === Responsive fixes & image thumbnails === */\n.banner { max-height: 90px; }\n.banner img { max-height: 90px; width: 100%; object-fit: cover; object-position: center; display: block; }\n.bubble img, .bubble video, .message-wrapper img, .message-wrapper video { max-width: 160px !important; max-height: 160px !important; width: auto !important; height: auto !important; border-radius: 10px; display: block; margin: 4px 0; object-fit: cover; cursor: zoom-in; }\n.file-chip img { width: 32px !important; height: 32px !important; object-fit: cover; border-radius: 6px; }\n.file-preview img { max-width: 44px !important; max-height: 44px !important; object-fit: cover; border-radius: 6px; }\n@media (max-width: 380px) {\n  .header { padding: 8px 10px; }\n  .header-logo { height: 14px; }\n  .license-badge { font-size: 9px; padding: 3px 8px; }\n  .publish-btn { padding: 4px 10px; font-size: 10px; }\n  .icon-btn { width: 26px; height: 26px; }\n  .banner, .banner img { max-height: 70px; }\n  .bubble { font-size: 12.5px; padding: 9px 13px; }\n  .bubble img, .message-wrapper img { max-width: 130px !important; max-height: 130px !important; }\n  .empty-logo { width: 56px; height: 56px; }\n  .empty-state h3 { font-size: 14px; }\n  .empty-state p { font-size: 12px; }\n  .empty-suggestions button { font-size: 11px; padding: 5px 11px; }\n}\n@media (max-height: 600px) {\n  .banner, .banner img { max-height: 55px; }\n  .empty-logo { width: 48px; height: 48px; margin-bottom: 8px; }\n}\n';
BEGIN
  UPDATE public.system_config
  SET value = replace(value, '</style>', extra || '</style>'),
      updated_at = now()
  WHERE key = 'extension_front_html'
    AND position('Responsive fixes & image thumbnails' in value) = 0;
END $$;