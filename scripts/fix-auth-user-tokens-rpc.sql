-- Pegar en Supabase Dashboard → SQL Editor (una sola vez).
-- Luego en PowerShell: npm run auth:fix-users -- --all-emx-batch

-- Reparar tokens NULL en auth.users sin requerir ser owner de auth.users en el SQL Editor.
-- Ejecutable vía supabase.rpc desde scripts con service_role.

CREATE OR REPLACE FUNCTION public.fix_auth_user_tokens_by_email(p_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  UPDATE auth.users
  SET
    confirmation_token = COALESCE(confirmation_token, ''),
    recovery_token = COALESCE(recovery_token, ''),
    email_change = COALESCE(email_change, ''),
    email_change_token_new = COALESCE(email_change_token_new, '')
  WHERE lower(trim(email)) = lower(trim(p_email))
  RETURNING id INTO v_user_id;

  RETURN v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.fix_auth_user_tokens_by_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fix_auth_user_tokens_by_email(text) TO service_role;

COMMENT ON FUNCTION public.fix_auth_user_tokens_by_email(text) IS
  'Corrige tokens NULL en auth.users para un correo. Devuelve user_id o NULL si no existe.';

CREATE OR REPLACE FUNCTION public.fix_auth_users_null_tokens_all()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE auth.users
  SET
    confirmation_token = COALESCE(confirmation_token, ''),
    recovery_token = COALESCE(recovery_token, ''),
    email_change = COALESCE(email_change, ''),
    email_change_token_new = COALESCE(email_change_token_new, '')
  WHERE
    confirmation_token IS NULL
    OR recovery_token IS NULL
    OR email_change IS NULL
    OR email_change_token_new IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.fix_auth_users_null_tokens_all() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fix_auth_users_null_tokens_all() TO service_role;

-- Opcional: corregir todos de una vez desde SQL Editor:
-- SELECT public.fix_auth_users_null_tokens_all();
