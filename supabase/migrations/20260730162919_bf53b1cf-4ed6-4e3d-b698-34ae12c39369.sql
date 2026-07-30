WITH bad AS (
  SELECT l.id, o.product_type
  FROM credit_orders o
  JOIN licenses l ON l.notes LIKE '%Pedido PIX #' || substr(o.id::text,1,8) || '%'
  WHERE o.status = 'paid'
    AND o.product_type IN ('gemini_pro','manus_credits','seedance_account','combo','combo_account','capcut_pro')
    AND l.status <> 'revoked'
), upd AS (
  UPDATE licenses l
  SET status = 'revoked',
      revoked_at = now(),
      notes = COALESCE(l.notes,'') || E'\n[Revogada: chave gerada indevidamente em compra de produto de conta/créditos]'
  FROM bad
  WHERE l.id = bad.id
  RETURNING l.id, bad.product_type
)
INSERT INTO license_logs (license_id, action, details)
SELECT id, 'revoked', jsonb_build_object('reason','indevida_produto_nao_chave','product_type',product_type)
FROM upd;