-- Replaces auth.admin.listUsers() with a targeted single-user lookup
-- SECURITY DEFINER allows access to auth.users without exposing the full table

CREATE OR REPLACE FUNCTION find_user_id_by_email(search_email text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id FROM auth.users WHERE email = lower(search_email) LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION find_user_id_by_email(text) TO authenticated;
