-- Add missing indexes for query performance
CREATE INDEX IF NOT EXISTS idx_shared_expenses_paid_by ON shared_expenses(paid_by);
CREATE INDEX IF NOT EXISTS idx_shared_expenses_group_id ON shared_expenses(group_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_shared_expense_id ON expense_splits(shared_expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_user_id ON expense_splits(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_settlements_group_id ON settlements(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_user ON group_members(group_id, user_id);
