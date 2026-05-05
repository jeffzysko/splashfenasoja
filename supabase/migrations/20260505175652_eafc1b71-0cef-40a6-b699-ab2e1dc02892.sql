-- Create the audit function if it doesn't exist
CREATE OR REPLACE FUNCTION public.process_lead_audit()
RETURNS TRIGGER AS $$
DECLARE
    v_user_email TEXT;
    v_user_id UUID;
BEGIN
    -- Try to get current user info from auth.users via auth.uid()
    v_user_id := auth.uid();
    
    -- If we have a user ID, try to get their email
    IF v_user_id IS NOT NULL THEN
        SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
    ELSE
        v_user_email := 'system/anonymous';
    END IF;

    -- Only log if specific fields changed or it's a new record
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.admin_audit_log (
            user_id,
            email,
            full_name,
            role,
            source,
            notes
        ) VALUES (
            v_user_id,
            v_user_email,
            'Sistema',
            'admin', -- Defaulting to admin for system logs
            'leads',
            'Novo lead criado: ' || NEW.nome || ' (' || NEW.whatsapp || ')'
        );
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.status IS DISTINCT FROM NEW.status OR 
            OLD.temperatura IS DISTINCT FROM NEW.temperatura OR
            OLD.notes IS DISTINCT FROM NEW.notes) THEN
            
            INSERT INTO public.admin_audit_log (
                user_id,
                email,
                full_name,
                role,
                source,
                notes
            ) VALUES (
                v_user_id,
                v_user_email,
                'Administrador', -- Generic placeholder as we don't have full_name easily here without joining profiles
                'admin',
                'leads',
                'Lead ' || NEW.nome || ' atualizado. Alterações: ' || 
                CASE WHEN OLD.status IS DISTINCT FROM NEW.status THEN 'Status: ' || OLD.status || ' -> ' || NEW.status || '. ' ELSE '' END ||
                CASE WHEN OLD.temperatura IS DISTINCT FROM NEW.temperatura THEN 'Temperatura: ' || OLD.temperatura || ' -> ' || NEW.temperatura || '. ' ELSE '' END ||
                CASE WHEN OLD.notes IS DISTINCT FROM NEW.notes THEN 'Notas atualizadas.' ELSE '' END
            );
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO public.admin_audit_log (
            user_id,
            email,
            full_name,
            role,
            source,
            notes
        ) VALUES (
            v_user_id,
            v_user_email,
            'Sistema',
            'admin',
            'leads',
            'Lead removido: ' || OLD.nome
        );
    END IF;
    
    RETURN NULL; -- result is ignored since this is an AFTER trigger
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS lead_audit_trigger ON public.leads;
CREATE TRIGGER lead_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.process_lead_audit();