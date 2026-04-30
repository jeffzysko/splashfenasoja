-- Tighten RLS on leads: SELECT only for authenticated users (block anon)
DROP POLICY IF EXISTS "Authenticated users can view leads" ON public.leads;

CREATE POLICY "Only authenticated users can view leads"
ON public.leads
FOR SELECT
TO authenticated
USING (true);

-- INSERT continues open to anon (booth lead capture)
-- No UPDATE/DELETE policies — blocked for everyone except service_role