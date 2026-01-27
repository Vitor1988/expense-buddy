-- Cleanup orphan contacts where the mutual contact was deleted
-- An orphan is a contact where profile_id points to a user who doesn't have us as a contact

DELETE FROM contacts c1
WHERE c1.profile_id IS NOT NULL
  AND c1.is_approved = true
  AND NOT EXISTS (
    SELECT 1 FROM contacts c2
    WHERE c2.user_id = c1.profile_id
      AND c2.profile_id = c1.user_id
  );
