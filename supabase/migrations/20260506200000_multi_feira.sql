-- ============================================================
-- MIGRAÇÃO: Sistema Multi-Feira
-- Cria tabelas feiras e feira_users, vincula leads existentes
-- ============================================================

-- 1. Tabela feiras
CREATE TABLE public.feiras (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome        TEXT        NOT NULL,
  slug        TEXT        NOT NULL,
  ativo       BOOLEAN     NOT NULL DEFAULT true,
  created_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT feiras_slug_unique UNIQUE (slug),
  CONSTRAINT feiras_slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$')
);

COMMENT ON TABLE  public.feiras        IS 'Cadastro de feiras/eventos onde a Splash expõe';
COMMENT ON COLUMN public.feiras.slug   IS 'Fragmento de URL: feira.quintalideal.com.br/{slug}';
COMMENT ON COLUMN public.feiras.ativo  IS 'false = formulário público desativado (feira encerrada)';

-- 2. Tabela feira_users (N:N — usuários responsáveis por cada feira)
CREATE TABLE public.feira_users (
  id         UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feira_id   UUID        NOT NULL REFERENCES public.feiras(id)  ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id)     ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT feira_users_unique UNIQUE (feira_id, user_id)
);

COMMENT ON TABLE public.feira_users IS 'Usuários (vendedores/admins) responsáveis por cada feira';

CREATE INDEX idx_feira_users_feira_id ON public.feira_users (feira_id);
CREATE INDEX idx_feira_users_user_id  ON public.feira_users (user_id);

-- 3. Adicionar feira_id à tabela leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS feira_id UUID REFERENCES public.feiras(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leads_feira_id ON public.leads (feira_id);

-- 4. Trigger updated_at para feiras
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER feiras_updated_at
  BEFORE UPDATE ON public.feiras
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- RLS — feiras
-- ============================================================
ALTER TABLE public.feiras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feiras_select_public"
  ON public.feiras FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "feiras_insert_master"
  ON public.feiras FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'master'::public.app_role));

CREATE POLICY "feiras_update_master"
  ON public.feiras FOR UPDATE TO authenticated
  USING  (public.has_role(auth.uid(), 'master'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'master'::public.app_role));

CREATE POLICY "feiras_delete_master"
  ON public.feiras FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'master'::public.app_role));

-- ============================================================
-- RLS — feira_users
-- ============================================================
ALTER TABLE public.feira_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feira_users_select"
  ON public.feira_users FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'master'::public.app_role)
    OR user_id = auth.uid()
  );

CREATE POLICY "feira_users_insert_master"
  ON public.feira_users FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'master'::public.app_role));

CREATE POLICY "feira_users_delete_master"
  ON public.feira_users FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'master'::public.app_role));

-- ============================================================
-- RLS — leads (atualizar para filtrar por feira)
-- ============================================================
DROP POLICY IF EXISTS "Leads viewable by admin or master"  ON public.leads;
DROP POLICY IF EXISTS "Leads updatable by admin or master" ON public.leads;

CREATE POLICY "leads_select_by_feira"
  ON public.leads FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'master'::public.app_role)
    OR (
      public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role, 'user'::public.app_role])
      AND feira_id IN (
        SELECT feira_id FROM public.feira_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "leads_update_by_feira"
  ON public.leads FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'master'::public.app_role)
    OR (
      public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role, 'user'::public.app_role])
      AND feira_id IN (
        SELECT feira_id FROM public.feira_users WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'master'::public.app_role)
    OR (
      public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role, 'user'::public.app_role])
      AND feira_id IN (
        SELECT feira_id FROM public.feira_users WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================================
-- MIGRAÇÃO DE DADOS: criar FENASOJA 2026 e vincular leads
-- ============================================================
DO $$
DECLARE
  v_feira_id UUID;
BEGIN
  INSERT INTO public.feiras (nome, slug, ativo)
  VALUES ('FENASOJA 2026', 'fenasoja2026', false)
  ON CONFLICT (slug) DO NOTHING;

  SELECT id INTO v_feira_id FROM public.feiras WHERE slug = 'fenasoja2026';

  UPDATE public.leads SET feira_id = v_feira_id WHERE feira_id IS NULL;

  RAISE NOTICE 'FENASOJA 2026 id: %. Leads vinculados.', v_feira_id;
END $$;

-- Grants
GRANT SELECT ON public.feiras              TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.feiras      TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.feira_users TO authenticated;
