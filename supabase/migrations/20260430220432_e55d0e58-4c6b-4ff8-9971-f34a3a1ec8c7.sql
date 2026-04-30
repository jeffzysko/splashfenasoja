-- 1. Ajustar a função de criação automática de perfil
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'admin' -- Role padrão para novos usuários (ou 'user' se preferir mais restrito)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 2. Criar o trigger na tabela auth.users (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- 3. Revogar permissão de execução pública para funções SECURITY DEFINER (Segurança)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;

-- 4. Ajustar RLS da tabela profiles para ser mais criterioso
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem (para garantir limpeza)
DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Política: Usuários podem ver seu próprio perfil
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- Política: Apenas Master pode ver todos os perfis
CREATE POLICY "Master can view all profiles"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'master'
  )
);

-- Política: Usuários podem atualizar apenas seus campos básicos (nome)
CREATE POLICY "Users can update own basic info"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND 
  (CASE WHEN (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'master' THEN true ELSE role = (SELECT role FROM public.profiles WHERE id = auth.uid()) END)
);

-- 5. Garantir que usuários existentes tenham perfil
INSERT INTO public.profiles (id, full_name, role)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', email), 'admin'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 6. Garantir que o Jefferson seja Master
UPDATE public.profiles 
SET role = 'master' 
WHERE id IN (SELECT id FROM auth.users WHERE email = 'jefferson@mindsc.com.br');
