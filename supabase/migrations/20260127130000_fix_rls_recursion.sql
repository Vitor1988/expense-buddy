-- Migration: Fix RLS infinite recursion
-- Problem: shared_expenses policy checks expense_splits, which checks shared_expenses
-- Solution: Use a SECURITY DEFINER function to avoid RLS check on expense_splits

-- Create helper function that bypasses RLS to check if user has a split
CREATE OR REPLACE FUNCTION public.user_has_expense_split(expense_id UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.expense_splits
    WHERE shared_expense_id = expense_id
    AND user_id = user_uuid
  );
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.user_has_expense_split(UUID, UUID) TO authenticated;

-- Drop the policy that causes recursion
DROP POLICY IF EXISTS "Users can view shared expenses they are involved in" ON shared_expenses;

-- Create new policy using the helper function
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
    -- OR user has a split in this expense (for inline splits) - using helper function
    OR public.user_has_expense_split(id, auth.uid())
  );
