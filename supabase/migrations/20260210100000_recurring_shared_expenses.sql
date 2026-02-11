-- Add shared expense support to recurring_expenses
ALTER TABLE recurring_expenses ADD COLUMN is_shared boolean DEFAULT false;
ALTER TABLE recurring_expenses ADD COLUMN split_method text DEFAULT 'equal';
ALTER TABLE recurring_expenses ADD COLUMN participants jsonb;
ALTER TABLE recurring_expenses ADD COLUMN split_values jsonb;

ALTER TABLE recurring_expenses ADD CONSTRAINT recurring_expenses_split_method_check
  CHECK (split_method IN ('equal', 'exact', 'percentage', 'shares'));

-- Add recurring_id to shared_expenses for duplicate detection during processing
ALTER TABLE shared_expenses ADD COLUMN recurring_id uuid REFERENCES recurring_expenses(id) ON DELETE SET NULL;
