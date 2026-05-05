-- Fix search path and permissions for the audit function
ALTER FUNCTION public.process_lead_audit() SET search_path = public;

-- Revoke execute from public and anon, grant only to authenticated and postgres
REVOKE EXECUTE ON FUNCTION public.process_lead_audit() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_lead_audit() TO authenticated, service_role;