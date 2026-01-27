-- Migration: Link existing contacts to profiles by email
-- This fixes bidirectional visibility for existing users who haven't logged in since the linkContactsByEmail feature was added

-- 1. Link contacts to profiles by matching email with auth.users
-- Note: In Supabase, user emails are stored in auth.users, not profiles
UPDATE contacts c
SET profile_id = au.id
FROM auth.users au
WHERE LOWER(c.email) = LOWER(au.email)
  AND c.profile_id IS NULL
  AND c.email IS NOT NULL;

-- 2. Update expense_splits to set user_id based on linked contacts
-- This makes shared expenses visible to the linked users
UPDATE expense_splits es
SET user_id = c.profile_id
FROM contacts c
WHERE es.contact_id = c.id
  AND es.user_id IS NULL
  AND c.profile_id IS NOT NULL;
