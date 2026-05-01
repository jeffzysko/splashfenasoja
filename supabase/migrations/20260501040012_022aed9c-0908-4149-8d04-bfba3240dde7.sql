-- Drop existing policies if they exist
DROP POLICY IF EXISTS "anon_insert" ON public.leads;
DROP POLICY IF EXISTS "auth_select" ON public.leads;
DROP POLICY IF EXISTS "public_insert" ON public.leads;
DROP POLICY IF EXISTS "auth_select_all" ON public.leads;
DROP POLICY IF EXISTS "auth_update" ON public.leads;
DROP POLICY IF EXISTS "auth_delete" ON public.leads;

-- Enable RLS (just in case)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Form público insere
CREATE POLICY "public_insert" ON public.leads
  FOR INSERT TO anon WITH CHECK (true);

-- Time autenticado lê tudo
CREATE POLICY "auth_select_all" ON public.leads
  FOR SELECT TO authenticated USING (true);

-- Time autenticado atualiza status, notes
CREATE POLICY "auth_update" ON public.leads
  FOR UPDATE TO authenticated USING (true);

-- Só authenticated pode deletar
CREATE POLICY "auth_delete" ON public.leads
  FOR DELETE TO authenticated USING (true);
