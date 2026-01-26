-- Migration: Fix expense_splits for manual contacts
-- Description: Allows expense_splits to reference contacts without a profile
-- Date: 2026-01-26

-- ============================================
-- 1. ADD CONTACT_ID TO EXPENSE_SPLITS
-- ============================================

-- Add contact_id column to support manual contacts (no profile)
ALTER TABLE expense_splits ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;

-- ============================================
-- 2. MAKE USER_ID NULLABLE
-- ============================================

-- user_id can be null when using contact_id for manual contacts
ALTER TABLE expense_splits ALTER COLUMN user_id DROP NOT NULL;

-- ============================================
-- 3. ADD CONSTRAINT
-- ============================================

-- Must have either user_id OR contact_id (or both for linked contacts)
ALTER TABLE expense_splits DROP CONSTRAINT IF EXISTS expense_splits_participant_check;
ALTER TABLE expense_splits ADD CONSTRAINT expense_splits_participant_check
  CHECK (user_id IS NOT NULL OR contact_id IS NOT NULL);

-- ============================================
-- 4. INDEX FOR CONTACT_ID
-- ============================================

CREATE INDEX IF NOT EXISTS idx_expense_splits_contact_id ON expense_splits(contact_id) WHERE contact_id IS NOT NULL;

-- ============================================
-- 5. UPDATE RLS POLICY FOR EXPENSE_SPLITS
-- ============================================

-- Update policy to include contact-based splits
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
        -- Allow viewing if the contact belongs to current user
        OR EXISTS (
          SELECT 1 FROM contacts c
          WHERE c.id = expense_splits.contact_id
          AND c.user_id = auth.uid()
        )
      )
    )
  );

-- ============================================
-- DONE
-- ============================================

COMMENT ON COLUMN expense_splits.contact_id IS 'Reference to contact for manual contacts without profile';
