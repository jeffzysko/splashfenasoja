-- Corrigir políticas da tabela 'leads' que estavam usando 'true'
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can update leads" ON public.leads;
DROP POLICY IF EXISTS "Only authenticated users can view leads" ON public.leads;

-- Política: Apenas usuários autenticados (ou administradores) podem ver leads
CREATE POLICY "Authenticated users can view leads"
ON public.leads FOR SELECT
USING (auth.role() = 'authenticated');

-- Política: Apenas usuários autenticados podem atualizar leads
CREATE POLICY "Authenticated users can update leads"
ON public.leads FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');
