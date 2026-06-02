-- Usuarios insertados manualmente en auth.users pueden dejar tokens en NULL;
-- GoTrue falla al login con "Database error querying schema".

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
