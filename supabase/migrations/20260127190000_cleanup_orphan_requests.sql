-- Cleanup orphan contact requests that have status='accepted' but no associated contacts
-- This happens when contacts were deleted but requests weren't cleaned up

DELETE FROM contact_requests cr
WHERE cr.status = 'accepted'
  AND NOT EXISTS (
    SELECT 1 FROM contacts c
    WHERE c.request_id = cr.id
  );
