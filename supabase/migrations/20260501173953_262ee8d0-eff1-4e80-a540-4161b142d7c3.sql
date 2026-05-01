DROP POLICY IF EXISTS public_insert ON public.leads;

CREATE POLICY public_insert ON public.leads
FOR INSERT
TO anon, authenticated
WITH CHECK (true);