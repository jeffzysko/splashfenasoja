CREATE OR REPLACE FUNCTION public.process_lead_audit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_user_email TEXT;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();

    -- Skip audit for anonymous actions (e.g. public lead form inserts).
    IF v_user_id IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.admin_audit_log (user_id, email, full_name, role, source, notes)
        VALUES (v_user_id, v_user_email, 'Sistema', 'admin', 'leads',
            'Novo lead criado: ' || NEW.nome || ' (' || NEW.whatsapp || ')');
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.status IS DISTINCT FROM NEW.status OR
            OLD.temperatura IS DISTINCT FROM NEW.temperatura OR
            OLD.notes IS DISTINCT FROM NEW.notes) THEN
            INSERT INTO public.admin_audit_log (user_id, email, full_name, role, source, notes)
            VALUES (v_user_id, v_user_email, 'Administrador', 'admin', 'leads',
                'Lead ' || NEW.nome || ' atualizado. Alterações: ' ||
                CASE WHEN OLD.status IS DISTINCT FROM NEW.status THEN 'Status: ' || OLD.status || ' -> ' || NEW.status || '. ' ELSE '' END ||
                CASE WHEN OLD.temperatura IS DISTINCT FROM NEW.temperatura THEN 'Temperatura: ' || OLD.temperatura || ' -> ' || NEW.temperatura || '. ' ELSE '' END ||
                CASE WHEN OLD.notes IS DISTINCT FROM NEW.notes THEN 'Notas atualizadas.' ELSE '' END);
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO public.admin_audit_log (user_id, email, full_name, role, source, notes)
        VALUES (v_user_id, v_user_email, 'Sistema', 'admin', 'leads',
            'Lead removido: ' || OLD.nome);
    END IF;

    RETURN NULL;
END;
$function$;