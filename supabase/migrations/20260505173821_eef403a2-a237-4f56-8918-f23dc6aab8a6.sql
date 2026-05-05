-- Remover políticas permissivas da tabela leads
DROP POLICY IF EXISTS "auth_select_all" ON public.leads;
DROP POLICY IF EXISTS "auth_update" ON public.leads;
DROP POLICY IF EXISTS "auth_delete" ON public.leads;
DROP POLICY IF EXISTS "public_insert" ON public.leads;

-- Criar novas políticas restritivas para leads

-- 1. Visualização: Admins ou Masters
CREATE POLICY "Leads viewable by admin or master" 
ON public.leads 
FOR SELECT 
TO authenticated
USING (
    has_any_role(auth.uid(), ARRAY['master'::app_role, 'admin'::app_role])
);

-- 2. Atualização: Admins ou Masters
CREATE POLICY "Leads updatable by admin or master" 
ON public.leads 
FOR UPDATE 
TO authenticated
USING (
    has_any_role(auth.uid(), ARRAY['master'::app_role, 'admin'::app_role])
)
WITH CHECK (
    has_any_role(auth.uid(), ARRAY['master'::app_role, 'admin'::app_role])
);

-- 3. Deleção: Apenas Masters
CREATE POLICY "Leads deletable only by masters" 
ON public.leads 
FOR DELETE 
TO authenticated
USING (
    has_role(auth.uid(), 'master'::app_role)
);

-- 4. Inserção: Público (para captação) e Autenticado
CREATE POLICY "Leads insertable by public and authenticated" 
ON public.leads 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);
