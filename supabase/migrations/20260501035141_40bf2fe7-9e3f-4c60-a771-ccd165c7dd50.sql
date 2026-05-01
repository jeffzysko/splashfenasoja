ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'novo',
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Update RLS for roles created previously if they exist
-- Ensure leads are accessible for authenticated users with role checks in code
CREATE POLICY "Authenticated users can update leads" 
ON public.leads 
FOR UPDATE 
TO authenticated 
USING (true);
