-- Add indexes for common search fields in leads table
CREATE INDEX IF NOT EXISTS leads_whatsapp_idx ON public.leads (whatsapp);
CREATE INDEX IF NOT EXISTS leads_email_idx ON public.leads (email);