-- Ajustar a política de inserção para não ser "Always True" usando os nomes de coluna em PT-BR
DROP POLICY IF EXISTS "Anyone can insert leads" ON public.leads;

CREATE POLICY "Anyone can insert leads"
ON public.leads FOR INSERT
WITH CHECK (
  nome IS NOT NULL AND 
  email IS NOT NULL
);
