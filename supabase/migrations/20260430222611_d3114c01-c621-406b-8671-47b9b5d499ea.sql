DROP POLICY IF EXISTS "Authenticated users can view leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can update leads" ON public.leads;

CREATE POLICY "Admins can view leads"
ON public.leads
FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['master'::public.app_role, 'admin'::public.app_role]));

CREATE POLICY "Admins can update leads"
ON public.leads
FOR UPDATE
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['master'::public.app_role, 'admin'::public.app_role]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['master'::public.app_role, 'admin'::public.app_role]));