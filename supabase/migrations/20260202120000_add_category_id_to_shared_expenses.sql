-- Add category_id to shared_expenses for better category filtering and display
ALTER TABLE shared_expenses
ADD COLUMN category_id UUID REFERENCES categories(id);

-- Create index for filtering
CREATE INDEX idx_shared_expenses_category_id ON shared_expenses(category_id);

-- Backfill existing data (match by name for same user)
UPDATE shared_expenses se
SET category_id = c.id
FROM categories c
WHERE se.category = c.name
  AND c.user_id = se.paid_by;
