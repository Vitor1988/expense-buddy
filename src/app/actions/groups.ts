'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { ExpenseGroup, GroupMember, SharedExpense, ExpenseSplit, GroupBalance } from '@/types';

// ============ GROUP CRUD ============

export async function createGroup(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const name = formData.get('name') as string;
  const description = formData.get('description') as string;

  if (!name || name.trim().length === 0) {
    return { error: 'Group name is required' };
  }

  // Create the group
  const { data: group, error: groupError } = await supabase
    .from('expense_groups')
    .insert({
      name: name.trim(),
      description: description?.trim() || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (groupError) {
    return { error: groupError.message };
  }

  // Add creator as admin member
  const { error: memberError } = await supabase.from('group_members').insert({
    group_id: group.id,
    user_id: user.id,
    role: 'admin',
  });

  if (memberError) {
    // Rollback group creation
    await supabase.from('expense_groups').delete().eq('id', group.id);
    return { error: memberError.message };
  }

  revalidatePath('/groups');
  return { success: true, groupId: group.id };
}

export async function updateGroup(groupId: string, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  // Check if user is admin
  const { data: membership } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single();

  if (!membership || membership.role !== 'admin') {
    return { error: 'Only admins can update group details' };
  }

  const name = formData.get('name') as string;
  const description = formData.get('description') as string;

  if (!name || name.trim().length === 0) {
    return { error: 'Group name is required' };
  }

  const { error } = await supabase
    .from('expense_groups')
    .update({
      name: name.trim(),
      description: description?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', groupId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/groups');
  revalidatePath(`/groups/${groupId}`);
  return { success: true };
}

export async function deleteGroup(groupId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  // Check if user is admin
  const { data: membership } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single();

  if (!membership || membership.role !== 'admin') {
    return { error: 'Only admins can delete the group' };
  }

  const { error } = await supabase
    .from('expense_groups')
    .delete()
    .eq('id', groupId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/groups');
  return { success: true };
}

export async function getGroups(): Promise<{
  data: (ExpenseGroup & { member_count: number; your_balance: number })[] | null;
  error: string | null;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: 'Not authenticated' };
  }

  // Get all groups where user is a member
  const { data: memberships, error: membershipError } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', user.id);

  if (membershipError) {
    return { data: null, error: membershipError.message };
  }

  if (!memberships || memberships.length === 0) {
    return { data: [], error: null };
  }

  const groupIds = memberships.map((m) => m.group_id);

  // Get groups with member count
  const { data: groups, error: groupsError } = await supabase
    .from('expense_groups')
    .select('*, members:group_members(count)')
    .in('id', groupIds)
    .order('updated_at', { ascending: false });

  if (groupsError) {
    return { data: null, error: groupsError.message };
  }

  // Calculate balance for each group
  const groupsWithBalance = await Promise.all(
    (groups || []).map(async (group) => {
      const balance = await calculateUserBalanceInGroup(group.id, user.id);
      return {
        ...group,
        member_count: (group.members as unknown as { count: number }[])?.[0]?.count || 0,
        your_balance: balance,
      };
    })
  );

  return { data: groupsWithBalance, error: null };
}

export async function getGroupById(groupId: string): Promise<{
  data: (ExpenseGroup & { members: (GroupMember & { profile: { id: string; full_name: string | null; avatar_url: string | null } })[] }) | null;
  error: string | null;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: 'Not authenticated' };
  }

  // Check if user is a member
  const { data: membership } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    return { data: null, error: 'You are not a member of this group' };
  }

  // Get group with members
  const { data: group, error } = await supabase
    .from('expense_groups')
    .select('*, members:group_members(*, profile:profiles(id, full_name, avatar_url))')
    .eq('id', groupId)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: group as ExpenseGroup & { members: (GroupMember & { profile: { id: string; full_name: string | null; avatar_url: string | null } })[] }, error: null };
}

// ============ SHARED EXPENSES ============

export async function createSharedExpense(groupId: string, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  // Check if user is a member
  const { data: membership } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    return { error: 'You are not a member of this group' };
  }

  const amount = parseFloat(formData.get('amount') as string);
  const description = formData.get('description') as string;
  const date = formData.get('date') as string;
  const paid_by = formData.get('paid_by') as string;
  const split_method = (formData.get('split_method') as string) || 'equal';
  const notes = formData.get('notes') as string;
  const splitMembersJson = formData.get('split_members') as string;

  if (!amount || isNaN(amount) || amount <= 0) {
    return { error: 'Please enter a valid amount' };
  }

  if (!description || description.trim().length === 0) {
    return { error: 'Description is required' };
  }

  // Parse split members
  let splitMembers: string[] = [];
  try {
    splitMembers = JSON.parse(splitMembersJson || '[]');
  } catch {
    return { error: 'Invalid split members data' };
  }

  if (splitMembers.length === 0) {
    return { error: 'Please select at least one member to split with' };
  }

  // Create the shared expense
  const { data: expense, error: expenseError } = await supabase
    .from('shared_expenses')
    .insert({
      group_id: groupId,
      paid_by: paid_by || user.id,
      amount,
      description: description.trim(),
      date: date || new Date().toISOString().split('T')[0],
      split_method,
      notes: notes?.trim() || null,
    })
    .select()
    .single();

  if (expenseError) {
    return { error: expenseError.message };
  }

  // Calculate splits (equal split for MVP)
  const splitAmount = Math.round((amount / splitMembers.length) * 100) / 100;
  const remainder = Math.round((amount - splitAmount * splitMembers.length) * 100) / 100;

  const splits = splitMembers.map((memberId, index) => ({
    shared_expense_id: expense.id,
    user_id: memberId,
    amount: index === 0 ? splitAmount + remainder : splitAmount,
    shares: 1,
    percentage: Math.round((100 / splitMembers.length) * 100) / 100,
    is_settled: false,
  }));

  const { error: splitsError } = await supabase.from('expense_splits').insert(splits);

  if (splitsError) {
    // Rollback expense creation
    await supabase.from('shared_expenses').delete().eq('id', expense.id);
    return { error: splitsError.message };
  }

  revalidatePath('/groups');
  revalidatePath(`/groups/${groupId}`);
  redirect(`/groups/${groupId}`);
}

export async function getGroupExpenses(groupId: string): Promise<{
  data: (SharedExpense & { payer: { id: string; full_name: string | null; avatar_url: string | null }; splits: ExpenseSplit[] })[] | null;
  error: string | null;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: 'Not authenticated' };
  }

  // Check if user is a member
  const { data: membership } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    return { data: null, error: 'You are not a member of this group' };
  }

  const { data, error } = await supabase
    .from('shared_expenses')
    .select('*, payer:profiles!shared_expenses_paid_by_fkey(id, full_name, avatar_url), splits:expense_splits(*, profile:profiles(id, full_name, avatar_url))')
    .eq('group_id', groupId)
    .order('date', { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as (SharedExpense & { payer: { id: string; full_name: string | null; avatar_url: string | null }; splits: ExpenseSplit[] })[], error: null };
}

export async function deleteSharedExpense(expenseId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  // Get the expense to check group membership
  const { data: expense } = await supabase
    .from('shared_expenses')
    .select('group_id, paid_by')
    .eq('id', expenseId)
    .single();

  if (!expense) {
    return { error: 'Expense not found' };
  }

  // Check if user is a member or the payer
  const { data: membership } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', expense.group_id)
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    return { error: 'You are not a member of this group' };
  }

  // Only payer or admin can delete
  if (expense.paid_by !== user.id && membership.role !== 'admin') {
    return { error: 'Only the payer or an admin can delete this expense' };
  }

  const { error } = await supabase
    .from('shared_expenses')
    .delete()
    .eq('id', expenseId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/groups');
  revalidatePath(`/groups/${expense.group_id}`);
  return { success: true };
}

// ============ BALANCES ============

async function calculateUserBalanceInGroup(groupId: string, userId: string): Promise<number> {
  const supabase = await createClient();

  // Get all expenses user paid for
  const { data: paidExpenses } = await supabase
    .from('shared_expenses')
    .select('amount')
    .eq('group_id', groupId)
    .eq('paid_by', userId);

  const totalPaid = (paidExpenses || []).reduce((sum, e) => sum + Number(e.amount), 0);

  // Get all splits where user owes money
  const { data: splits } = await supabase
    .from('expense_splits')
    .select('amount, shared_expense_id, shared_expenses!inner(group_id)')
    .eq('user_id', userId)
    .eq('shared_expenses.group_id', groupId);

  const totalOwed = (splits || []).reduce((sum, s) => sum + Number(s.amount), 0);

  // Get settlements where user paid
  const { data: paidSettlements } = await supabase
    .from('settlements')
    .select('amount')
    .eq('group_id', groupId)
    .eq('from_user_id', userId);

  const totalSettledPaid = (paidSettlements || []).reduce((sum, s) => sum + Number(s.amount), 0);

  // Get settlements where user received
  const { data: receivedSettlements } = await supabase
    .from('settlements')
    .select('amount')
    .eq('group_id', groupId)
    .eq('to_user_id', userId);

  const totalSettledReceived = (receivedSettlements || []).reduce((sum, s) => sum + Number(s.amount), 0);

  // Balance: positive = others owe you, negative = you owe others
  return totalPaid - totalOwed + totalSettledPaid - totalSettledReceived;
}

export async function getGroupBalances(groupId: string): Promise<{
  data: GroupBalance[] | null;
  error: string | null;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: 'Not authenticated' };
  }

  // Check if user is a member
  const { data: membership } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    return { data: null, error: 'You are not a member of this group' };
  }

  // Get all members
  const { data: members, error: membersError } = await supabase
    .from('group_members')
    .select('user_id, profile:profiles(id, full_name, avatar_url)')
    .eq('group_id', groupId);

  if (membersError) {
    return { data: null, error: membersError.message };
  }

  // Calculate balance for each member
  const balances: GroupBalance[] = await Promise.all(
    (members || []).map(async (member) => {
      const balance = await calculateUserBalanceInGroup(groupId, member.user_id);

      // Get total paid by this member
      const { data: paidExpenses } = await supabase
        .from('shared_expenses')
        .select('amount')
        .eq('group_id', groupId)
        .eq('paid_by', member.user_id);

      const totalPaid = (paidExpenses || []).reduce((sum, e) => sum + Number(e.amount), 0);

      // Get total this member owes
      const { data: splits } = await supabase
        .from('expense_splits')
        .select('amount, shared_expenses!inner(group_id)')
        .eq('user_id', member.user_id)
        .eq('shared_expenses.group_id', groupId);

      const totalOwed = (splits || []).reduce((sum, s) => sum + Number(s.amount), 0);

      // Handle Supabase's join result type
      const profileData = member.profile as unknown as { id: string; full_name: string | null; avatar_url: string | null } | null;

      return {
        user_id: member.user_id,
        profile: profileData || undefined,
        total_paid: totalPaid,
        total_owed: totalOwed,
        net_balance: balance,
      };
    })
  );

  return { data: balances, error: null };
}

// Get who owes whom (simple version without simplification)
export async function getDebts(groupId: string): Promise<{
  data: { from_user: { id: string; full_name: string | null }; to_user: { id: string; full_name: string | null }; amount: number }[] | null;
  error: string | null;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: 'Not authenticated' };
  }

  // Get balances
  const { data: balances, error } = await getGroupBalances(groupId);

  if (error || !balances) {
    return { data: null, error };
  }

  // Simple debt calculation: people with negative balance owe people with positive balance
  const debtors = balances.filter((b) => b.net_balance < 0).sort((a, b) => a.net_balance - b.net_balance);
  const creditors = balances.filter((b) => b.net_balance > 0).sort((a, b) => b.net_balance - a.net_balance);

  const debts: { from_user: { id: string; full_name: string | null }; to_user: { id: string; full_name: string | null }; amount: number }[] = [];

  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const debtAmount = Math.abs(debtor.net_balance);
    const creditAmount = creditor.net_balance;

    const settleAmount = Math.min(debtAmount, creditAmount);

    if (settleAmount > 0.01) {
      debts.push({
        from_user: { id: debtor.user_id, full_name: debtor.profile?.full_name || null },
        to_user: { id: creditor.user_id, full_name: creditor.profile?.full_name || null },
        amount: Math.round(settleAmount * 100) / 100,
      });
    }

    debtor.net_balance += settleAmount;
    creditor.net_balance -= settleAmount;

    if (Math.abs(debtor.net_balance) < 0.01) i++;
    if (creditor.net_balance < 0.01) j++;
  }

  return { data: debts, error: null };
}
