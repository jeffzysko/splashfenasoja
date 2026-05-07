CREATE TABLE IF NOT EXISTS public.produtos (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  nome        text        NOT NULL,
  descricao   text,
  tamanhos    jsonb       NOT NULL DEFAULT '[]'::jsonb,
  opcionais   jsonb       NOT NULL DEFAULT '{}'::jsonb,
  fotos       jsonb       NOT NULL DEFAULT '[]'::jsonb,
  ativo       boolean     NOT NULL DEFAULT true,
  ordem       integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated pode ler produtos"
  ON public.produtos FOR SELECT TO authenticated USING (true);

CREATE POLICY "masters gerenciam produtos"
  ON public.produtos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'master'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'master'));

CREATE TRIGGER produtos_updated_at
  BEFORE UPDATE ON public.produtos
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('produto-fotos', 'produto-fotos', true, 10485760, ARRAY['image/jpeg','image/jpg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public pode ler produto-fotos" ON storage.objects FOR SELECT TO public USING (bucket_id = 'produto-fotos');
CREATE POLICY "Masters fazem upload de produto-fotos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'produto-fotos' AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'master'));
CREATE POLICY "Masters deletam produto-fotos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'produto-fotos' AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'master'));