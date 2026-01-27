-- Fix: Create missing contacts for already-accepted requests
-- Due to previous bug, contacts weren't created when requests were accepted

-- Create contact for recipient (who accepted) -> gets contact of sender
INSERT INTO contacts (user_id, name, profile_id, source, is_approved, request_id)
SELECT
  cr.to_user_id,
  COALESCE(p.full_name, 'Unknown'),
  cr.from_user_id,
  'manual',
  true,
  cr.id
FROM contact_requests cr
JOIN profiles p ON p.id = cr.from_user_id
WHERE cr.status = 'accepted'
  AND cr.to_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM contacts c
    WHERE c.user_id = cr.to_user_id
    AND c.profile_id = cr.from_user_id
  );

-- Create contact for sender -> gets contact of recipient (who accepted)
INSERT INTO contacts (user_id, name, profile_id, source, is_approved, request_id)
SELECT
  cr.from_user_id,
  COALESCE(p.full_name, 'Unknown'),
  cr.to_user_id,
  'manual',
  true,
  cr.id
FROM contact_requests cr
JOIN profiles p ON p.id = cr.to_user_id
WHERE cr.status = 'accepted'
  AND cr.to_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM contacts c
    WHERE c.user_id = cr.from_user_id
    AND c.profile_id = cr.to_user_id
  );
