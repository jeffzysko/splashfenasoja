-- Fix search path for security functions
ALTER FUNCTION public.handle_updated_at() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public, auth;

-- Revoke public execute from security definer function to fix linter warning
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

-- Link existing master user to profiles table
INSERT INTO public.profiles (id, full_name, role)
SELECT id, 'Jeff Zysko', 'master'
FROM auth.users
WHERE email = 'jefferson@mindsc.com.br'
ON CONFLICT (id) DO UPDATE 
SET role = 'master', full_name = 'Jeff Zysko';
