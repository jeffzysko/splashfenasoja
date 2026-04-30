-- Garantir que o usuário master tenha a role correta
DO $$ 
DECLARE
    user_id_val UUID;
BEGIN
    SELECT id INTO user_id_val FROM auth.users WHERE email = 'jefferson@mindsc.com.br';
    
    IF user_id_val IS NOT NULL THEN
        INSERT INTO public.profiles (id, full_name, role)
        VALUES (user_id_val, 'Jeff Zysko', 'master')
        ON CONFLICT (id) DO UPDATE 
        SET role = 'master', full_name = 'Jeff Zysko';
    END IF;
END $$;

-- Ajustar políticas de RLS para a tabela profiles
-- Remover políticas existentes para evitar conflitos (se houver nomes conhecidos)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- Criar política que permite usuários autenticados verem seu próprio perfil
-- Isso é essencial para a verificação de role no frontend
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Garantir que RLS está habilitado
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
