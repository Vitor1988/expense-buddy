-- Migration: Fix shared_expenses RLS for inline splits
-- Problem: Users with a split in expense_splits cannot view the shared_expense if they're not the payer
-- Solution: Add condition to allow viewing if user has a split

-- Drop existing policy
DROP POLICY IF EXISTS "Users can view shared expenses they paid" ON shared_expenses;

-- Create new policy with additional condition for users with splits
CREATE POLICY "Users can view shared expenses they are involved in"
  ON shared_expenses FOR SELECT
  USING (
    -- User is the payer
    auth.uid() = paid_by
    -- OR user is a member of the group (for group expenses)
    OR (group_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = shared_expenses.group_id
      AND group_members.user_id = auth.uid()
    ))
    -- OR user has a split in this expense (for inline splits)
    OR EXISTS (
      SELECT 1 FROM expense_splits
      WHERE expense_splits.shared_expense_id = shared_expenses.id
      AND expense_splits.user_id = auth.uid()
    )
  );
