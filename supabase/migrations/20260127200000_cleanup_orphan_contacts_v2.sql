-- Cleanup orphan manual contacts (contacts without mutual pair)
-- Only affects manual contacts, NOT group_member contacts

DELETE FROM contacts c1
WHERE c1.source = 'manual'
  AND c1.profile_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM contacts c2
    WHERE c2.user_id = c1.profile_id
      AND c2.profile_id = c1.user_id
  );
