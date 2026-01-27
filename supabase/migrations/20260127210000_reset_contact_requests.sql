-- Reset all contact requests and manual contacts to start fresh
-- Group contacts are NOT affected

-- First, find shared_expenses that use manual contacts and delete related splits
DELETE FROM expense_splits
WHERE contact_id IN (SELECT id FROM contacts WHERE source = 'manual');

-- Delete shared_expenses that have no splits left (inline splits only)
DELETE FROM shared_expenses se
WHERE se.group_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM expense_splits es WHERE es.shared_expense_id = se.id);

-- Now delete manual contacts
DELETE FROM contacts WHERE source = 'manual';

-- Then delete all contact requests
DELETE FROM contact_requests;
