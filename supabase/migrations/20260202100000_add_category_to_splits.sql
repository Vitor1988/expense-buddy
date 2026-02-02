-- Add category_id to expense_splits for categorizing settled expenses
-- This allows users to choose their own category when marking shared expenses as paid

ALTER TABLE expense_splits
ADD COLUMN category_id UUID REFERENCES categories(id);

-- Indexes for performance
CREATE INDEX idx_expense_splits_category_id ON expense_splits(category_id);
CREATE INDEX idx_expense_splits_settled ON expense_splits(user_id, is_settled) WHERE is_settled = true;
