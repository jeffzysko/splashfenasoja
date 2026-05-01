ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_status_check;

ALTER TABLE public.leads
ADD CONSTRAINT leads_status_check
CHECK (status IN ('novo', 'contatado', 'qualificado', 'descartado', 'vendido', 'perdido'));