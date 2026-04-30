-- Adiciona colunas faltantes
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS temperatura text NOT NULL DEFAULT 'frio',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'novo',
  ADD COLUMN IF NOT EXISTS evento text NOT NULL DEFAULT 'FENASOJA 2026',
  ADD COLUMN IF NOT EXISTS ip text,
  ADD COLUMN IF NOT EXISTS notes text;

-- Constraints de domínio
DO $$ BEGIN
  ALTER TABLE public.leads
    ADD CONSTRAINT leads_temperatura_check
    CHECK (temperatura IN ('quente','morno','frio'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.leads
    ADD CONSTRAINT leads_status_check
    CHECK (status IN ('novo','contatado','qualificado','descartado'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Permitir UPDATE pelo time comercial autenticado (status / notes)
DROP POLICY IF EXISTS "Authenticated users can update leads" ON public.leads;
CREATE POLICY "Authenticated users can update leads"
  ON public.leads
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Índices úteis no /admin
CREATE INDEX IF NOT EXISTS leads_created_at_idx ON public.leads (created_at DESC);
CREATE INDEX IF NOT EXISTS leads_temperatura_idx ON public.leads (temperatura);
CREATE INDEX IF NOT EXISTS leads_status_idx ON public.leads (status);