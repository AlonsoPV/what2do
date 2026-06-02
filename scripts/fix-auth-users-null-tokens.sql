-- =============================================================================
-- Corrige login "Database error querying schema" en usuarios creados por SQL
-- directo en auth.users (confirmation_token y columnas relacionadas en NULL).
--
-- IMPORTANTE: En proyectos hosted el SQL Editor suele fallar con:
--   ERROR 42501: must be owner of table users
-- En ese caso usa la Admin API (no requiere ser owner):
--   node scripts/fix-auth-users-via-admin.mjs jorgegonzalez@emx.mx
--
-- Este SQL solo funciona con rol postgres (CLI local, connection string directa).
-- =============================================================================

BEGIN;

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

ALTER TABLE auth.users
  ALTER COLUMN confirmation_token SET DEFAULT '',
  ALTER COLUMN recovery_token SET DEFAULT '',
  ALTER COLUMN email_change SET DEFAULT '',
  ALTER COLUMN email_change_token_new SET DEFAULT '';

COMMIT;

-- Verificar usuario concreto (opcional):
-- SELECT id, email, confirmation_token, recovery_token
-- FROM auth.users
-- WHERE lower(trim(email)) = 'jorgegonzalez@emx.mx';
