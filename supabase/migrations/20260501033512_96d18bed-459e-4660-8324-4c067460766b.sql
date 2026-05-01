-- Atualiza o papel do usuário diretamente sem depender de restrições de conflito
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'jefferson@mindsc.com.br';
  
  IF v_user_id IS NOT NULL THEN
    -- Remove registros antigos para evitar duplicidade manual
    DELETE FROM public.user_roles WHERE user_id = v_user_id;
    
    -- Insere o novo papel master
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'master');
  END IF;
END $$;