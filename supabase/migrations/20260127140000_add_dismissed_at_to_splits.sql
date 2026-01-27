-- Migration: Add dismissed_at to expense_splits
-- Allows debtors to hide settled expenses from their view without affecting the payer's records

ALTER TABLE expense_splits ADD COLUMN IF NOT EXISTS dismissed_at TIMESTAMPTZ DEFAULT NULL;

-- Add index for filtering non-dismissed splits
CREATE INDEX IF NOT EXISTS idx_expense_splits_dismissed_at ON expense_splits(dismissed_at) WHERE dismissed_at IS NULL;
