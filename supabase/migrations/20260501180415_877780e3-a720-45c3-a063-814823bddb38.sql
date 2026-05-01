-- Tabela de auditoria
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text,
  full_name text,
  role public.app_role NOT NULL,
  source text NOT NULL DEFAULT 'unknown',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_user_id ON public.admin_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON public.admin_audit_log(created_at DESC);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Masters can view audit log" ON public.admin_audit_log;
CREATE POLICY "Masters can view audit log"
ON public.admin_audit_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'master'::public.app_role));

DROP POLICY IF EXISTS "Masters can insert audit log" ON public.admin_audit_log;
CREATE POLICY "Masters can insert audit log"
ON public.admin_audit_log
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'master'::public.app_role));

-- Função/trigger que registra novos admins/masters automaticamente
CREATE OR REPLACE FUNCTION public.log_admin_role_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_name text;
BEGIN
  IF NEW.role IN ('admin'::public.app_role, 'master'::public.app_role) THEN
    SELECT u.email INTO v_email FROM auth.users u WHERE u.id = NEW.user_id;
    SELECT p.full_name INTO v_name FROM public.profiles p WHERE p.id = NEW.user_id;

    INSERT INTO public.admin_audit_log (user_id, email, full_name, role, source, notes)
    VALUES (
      NEW.user_id,
      v_email,
      v_name,
      NEW.role,
      'role_assignment',
      'Role concedida via INSERT em user_roles'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_admin_role_assignment ON public.user_roles;
CREATE TRIGGER trg_log_admin_role_assignment
AFTER INSERT ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.log_admin_role_assignment();

-- Backfill retroativo dos admins/masters existentes
INSERT INTO public.admin_audit_log (user_id, email, full_name, role, source, notes, created_at)
SELECT
  ur.user_id,
  u.email,
  p.full_name,
  ur.role,
  'migration_legacy',
  'Registro retroativo gerado pela migração de auditoria',
  COALESCE(ur.created_at, now())
FROM public.user_roles ur
LEFT JOIN auth.users u ON u.id = ur.user_id
LEFT JOIN public.profiles p ON p.id = ur.user_id
WHERE ur.role IN ('admin'::public.app_role, 'master'::public.app_role)
  AND NOT EXISTS (
    SELECT 1 FROM public.admin_audit_log a
    WHERE a.user_id = ur.user_id AND a.role = ur.role
  );