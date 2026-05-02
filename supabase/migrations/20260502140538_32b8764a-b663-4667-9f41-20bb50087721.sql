DO $$
DECLARE
  v_user_id uuid;
  v_email text := 'splashsantoangelo@splashpiscinas.com';
  v_password text := 'Splash123';
  v_name text := 'Splash Santo Ângelo';
BEGIN
  -- Check if user already exists
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token,
      is_sso_user,
      is_anonymous
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      v_email,
      crypt(v_password, gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', v_name),
      now(),
      now(),
      '',
      '',
      '',
      '',
      false,
      false
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      provider_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      v_user_id::text,
      jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
      'email',
      now(),
      now(),
      now()
    );
  ELSE
    UPDATE auth.users
       SET encrypted_password = crypt(v_password, gen_salt('bf')),
           email_confirmed_at = COALESCE(email_confirmed_at, now()),
           raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('full_name', v_name),
           updated_at = now()
     WHERE id = v_user_id;
  END IF;

  -- Ensure profile
  INSERT INTO public.profiles (id, full_name)
  VALUES (v_user_id, v_name)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, updated_at = now();

  -- Grant admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Also ensure base 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'user'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;