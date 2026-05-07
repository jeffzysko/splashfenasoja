-- ─────────────────────────────────────────────────────────────────────────────
-- Catálogo de produtos Splash Piscinas
-- ─────────────────────────────────────────────────────────────────────────────

-- Tabela principal de produtos
CREATE TABLE IF NOT EXISTS public.produtos (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  nome        text        NOT NULL,
  descricao   text,
  -- Ex: [{"label":"3x2","comprimento":3,"largura":2,"profundidade":1.3,"capacidade":"7.800L"}]
  tamanhos    jsonb       NOT NULL DEFAULT '[]'::jsonb,
  -- Ex: {"porcelana_atlas": true, "acrilico": false}
  opcionais   jsonb       NOT NULL DEFAULT '{}'::jsonb,
  -- Ex: [{"url":"https://...","path":"produtos/uuid/foto.jpg","ordem":0}]
  fotos       jsonb       NOT NULL DEFAULT '[]'::jsonb,
  ativo       boolean     NOT NULL DEFAULT true,
  ordem       integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'produtos_updated_at'
  ) THEN
    CREATE TRIGGER produtos_updated_at
      BEFORE UPDATE ON public.produtos
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- RLS
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode ler (vendedores usam o catálogo)
CREATE POLICY "authenticated pode ler produtos"
  ON public.produtos FOR SELECT TO authenticated
  USING (true);

-- Somente masters podem criar/editar/deletar
CREATE POLICY "masters gerenciam produtos"
  ON public.produtos FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'master'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'master'
    )
  );

-- ── Storage bucket para fotos dos produtos ────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'produto-fotos',
  'produto-fotos',
  true,
  10485760, -- 10 MB por arquivo
  ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Leitura pública (URLs de imagem funcionam sem auth)
CREATE POLICY "Public pode ler produto-fotos"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'produto-fotos');

-- Upload só para masters
CREATE POLICY "Masters fazem upload de produto-fotos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'produto-fotos'
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'master'
    )
  );

-- Delete só para masters
CREATE POLICY "Masters deletam produto-fotos"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'produto-fotos'
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'master'
    )
  );
