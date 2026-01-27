-- Migration: Contact Requests System
-- Allows users to send contact requests that must be accepted before sharing expenses

-- Create contact_requests table
CREATE TABLE IF NOT EXISTS contact_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  to_email TEXT NOT NULL,
  to_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  UNIQUE(from_user_id, to_email)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_contact_requests_from_user ON contact_requests(from_user_id);
CREATE INDEX IF NOT EXISTS idx_contact_requests_to_user ON contact_requests(to_user_id) WHERE to_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contact_requests_to_email ON contact_requests(to_email);
CREATE INDEX IF NOT EXISTS idx_contact_requests_status ON contact_requests(status) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view requests they sent or received
CREATE POLICY "Users can view their contact requests"
  ON contact_requests FOR SELECT
  USING (
    auth.uid() = from_user_id
    OR auth.uid() = to_user_id
  );

-- Users can create requests (as sender)
CREATE POLICY "Users can send contact requests"
  ON contact_requests FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);

-- Sender can cancel, recipient can accept/reject
CREATE POLICY "Users can update their contact requests"
  ON contact_requests FOR UPDATE
  USING (
    -- Sender can cancel their own pending requests
    (auth.uid() = from_user_id AND status = 'pending')
    -- Recipient can accept/reject pending requests
    OR (auth.uid() = to_user_id AND status = 'pending')
  );

-- Function to auto-fill to_user_id when user registers
CREATE OR REPLACE FUNCTION link_pending_contact_requests()
RETURNS TRIGGER AS $$
BEGIN
  -- Update any pending requests sent to this user's email
  UPDATE contact_requests
  SET to_user_id = NEW.id
  WHERE to_email = (SELECT email FROM auth.users WHERE id = NEW.id)
    AND to_user_id IS NULL
    AND status = 'pending';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run after profile creation
DROP TRIGGER IF EXISTS on_profile_created_link_requests ON profiles;
CREATE TRIGGER on_profile_created_link_requests
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION link_pending_contact_requests();

-- Add is_approved field to contacts table to track mutual acceptance
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS request_id UUID REFERENCES contact_requests(id);

-- Update existing contacts to be approved (grandfathered in)
-- Actually, per the plan, we're NOT auto-approving existing contacts
-- Users will need to send new requests
