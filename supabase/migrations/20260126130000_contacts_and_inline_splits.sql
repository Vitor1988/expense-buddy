-- Migration: Contacts and Inline Splits
-- Description: Adds contacts table and allows shared_expenses without a group
-- Date: 2025-01-26

-- ============================================
-- 1. CREATE CONTACTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'group_member')),
  source_group_id UUID REFERENCES expense_groups(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Unique constraint: one contact per profile per user (for registered users)
CREATE UNIQUE INDEX idx_contacts_user_profile
  ON contacts(user_id, profile_id)
  WHERE profile_id IS NOT NULL;

-- Unique constraint: one contact per name per user (for manual contacts without profile)
CREATE UNIQUE INDEX idx_contacts_user_name
  ON contacts(user_id, name)
  WHERE profile_id IS NULL;

-- Index for fast lookups
CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_contacts_profile_id ON contacts(profile_id) WHERE profile_id IS NOT NULL;

-- ============================================
-- 2. ALLOW SHARED_EXPENSES WITHOUT GROUP
-- ============================================

-- Make group_id nullable to allow inline/ad-hoc splits
ALTER TABLE shared_expenses ALTER COLUMN group_id DROP NOT NULL;

-- Index for shared expenses without a group (inline splits)
CREATE INDEX idx_shared_expenses_no_group
  ON shared_expenses(paid_by)
  WHERE group_id IS NULL;

-- ============================================
-- 3. ROW LEVEL SECURITY FOR CONTACTS
-- ============================================

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Users can only see their own contacts
CREATE POLICY "Users can view own contacts"
  ON contacts FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own contacts
CREATE POLICY "Users can create own contacts"
  ON contacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own contacts
CREATE POLICY "Users can update own contacts"
  ON contacts FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own contacts
CREATE POLICY "Users can delete own contacts"
  ON contacts FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 4. UPDATE RLS FOR SHARED_EXPENSES (inline splits)
-- ============================================

-- Drop existing policies if they don't cover inline splits
-- (This is safe - policies are idempotent)

-- Allow users to view shared expenses they paid for (even without group)
DROP POLICY IF EXISTS "Users can view shared expenses they paid" ON shared_expenses;
CREATE POLICY "Users can view shared expenses they paid"
  ON shared_expenses FOR SELECT
  USING (
    auth.uid() = paid_by
    OR (group_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = shared_expenses.group_id
      AND group_members.user_id = auth.uid()
    ))
  );

-- Allow users to create inline shared expenses
DROP POLICY IF EXISTS "Users can create shared expenses" ON shared_expenses;
CREATE POLICY "Users can create shared expenses"
  ON shared_expenses FOR INSERT
  WITH CHECK (
    auth.uid() = paid_by
    AND (
      group_id IS NULL
      OR EXISTS (
        SELECT 1 FROM group_members
        WHERE group_members.group_id = shared_expenses.group_id
        AND group_members.user_id = auth.uid()
      )
    )
  );

-- Allow users to update their own inline shared expenses
DROP POLICY IF EXISTS "Users can update own shared expenses" ON shared_expenses;
CREATE POLICY "Users can update own shared expenses"
  ON shared_expenses FOR UPDATE
  USING (auth.uid() = paid_by);

-- Allow users to delete their own inline shared expenses
DROP POLICY IF EXISTS "Users can delete own shared expenses" ON shared_expenses;
CREATE POLICY "Users can delete own shared expenses"
  ON shared_expenses FOR DELETE
  USING (auth.uid() = paid_by);

-- ============================================
-- 5. UPDATE RLS FOR EXPENSE_SPLITS (inline splits)
-- ============================================

-- Allow viewing splits for expenses user is involved in
DROP POLICY IF EXISTS "Users can view expense splits" ON expense_splits;
CREATE POLICY "Users can view expense splits"
  ON expense_splits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shared_expenses se
      WHERE se.id = expense_splits.shared_expense_id
      AND (
        se.paid_by = auth.uid()
        OR expense_splits.user_id = auth.uid()
        OR (se.group_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM group_members gm
          WHERE gm.group_id = se.group_id
          AND gm.user_id = auth.uid()
        ))
      )
    )
  );

-- Allow creating splits for expenses user paid
DROP POLICY IF EXISTS "Users can create expense splits" ON expense_splits;
CREATE POLICY "Users can create expense splits"
  ON expense_splits FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shared_expenses se
      WHERE se.id = expense_splits.shared_expense_id
      AND se.paid_by = auth.uid()
    )
  );

-- ============================================
-- DONE
-- ============================================

COMMENT ON TABLE contacts IS 'User contacts for sharing expenses (synced from groups or manual)';
COMMENT ON COLUMN contacts.source IS 'Where this contact came from: manual or group_member';
COMMENT ON COLUMN contacts.source_group_id IS 'If from group_member, which group';
COMMENT ON COLUMN contacts.profile_id IS 'If contact is a registered user, their profile ID';
