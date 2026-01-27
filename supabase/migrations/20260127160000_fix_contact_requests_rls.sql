-- Fix: Contact Requests UPDATE RLS Policy
-- The original policy only had USING without WITH CHECK, causing the new row
-- (with status='accepted') to fail the status='pending' check

DROP POLICY IF EXISTS "Users can update their contact requests" ON contact_requests;

CREATE POLICY "Users can update their contact requests"
  ON contact_requests FOR UPDATE
  USING (
    -- Can see/edit if sender or recipient of pending request
    (auth.uid() = from_user_id AND status = 'pending')
    OR (auth.uid() = to_user_id AND status = 'pending')
  )
  WITH CHECK (
    -- Sender can only change to 'cancelled'
    (auth.uid() = from_user_id AND status = 'cancelled')
    -- Recipient can change to 'accepted' or 'rejected'
    OR (auth.uid() = to_user_id AND status IN ('accepted', 'rejected'))
  );
