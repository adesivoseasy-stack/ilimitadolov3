-- Tabela de Promoções
CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'custom', -- 'vitalicia' | 'pacote' | 'custom'
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  quantity INTEGER DEFAULT NULL, -- para pacotes (ex: 10 chaves)
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ, -- null = sem expiração
  is_active BOOLEAN NOT NULL DEFAULT true,
  highlight_color TEXT DEFAULT '#8B5CF6', -- cor do destaque
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

-- Admins e managers podem gerenciar
CREATE POLICY promotions_admin_all ON public.promotions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY promotions_manager_all ON public.promotions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'manager'::app_role));

-- Revendedores podem ver promoções ativas
CREATE POLICY promotions_reseller_view ON public.promotions
  FOR SELECT TO authenticated
  USING (
    is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND starts_at <= now()
  );
