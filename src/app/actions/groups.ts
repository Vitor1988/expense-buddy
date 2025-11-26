'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { ExpenseGroup, GroupMember, SharedExpense, ExpenseSplit, GroupBalance, SplitMethod } from '@/types';
import { calculateSplits, type SplitInput } from '@/lib/split-calculator';

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

  // Parse split values for non-equal methods
  let splitValues: SplitInput[] | undefined;
  const splitValuesJson = formData.get('split_values') as string;
  if (splitValuesJson && split_method !== 'equal') {
    try {
      splitValues = JSON.parse(splitValuesJson);
    } catch {
      return { error: 'Invalid split values data' };
    }
  }

  // Calculate splits using the split calculator
  const splitResult = calculateSplits(
    split_method as SplitMethod,
    amount,
    splitMembers,
    splitValues
  );

  if (splitResult.error) {
    return { error: splitResult.error };
  }

  if (splitResult.splits.length === 0) {
    return { error: 'No valid splits calculated' };
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

  // Prepare splits for database
  const splits = splitResult.splits.map((split) => ({
    shared_expense_id: expense.id,
    user_id: split.userId,
    amount: split.amount,
    shares: split.shares,
    percentage: split.percentage,
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

// ============ INVITATIONS ============

function generateInviteToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export async function sendInvitation(groupId: string, email: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  // Check if user is admin of the group
  const { data: membership } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single();

  if (!membership || membership.role !== 'admin') {
    return { error: 'Only admins can invite members' };
  }

  // Validate email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { error: 'Please enter a valid email address' };
  }

  // Check if email is already a member
  const { data: existingUser } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', (await supabase.from('auth.users').select('id').eq('email', email).single()).data?.id)
    .single();

  if (existingUser) {
    const { data: existingMember } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', existingUser.id)
      .single();

    if (existingMember) {
      return { error: 'This person is already a member of the group' };
    }
  }

  // Check if there's already a pending invitation
  const { data: existingInvite } = await supabase
    .from('group_invitations')
    .select('id')
    .eq('group_id', groupId)
    .eq('invited_email', email.toLowerCase())
    .eq('status', 'pending')
    .single();

  if (existingInvite) {
    return { error: 'An invitation has already been sent to this email' };
  }

  // Create invitation
  const token = generateInviteToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

  const { error } = await supabase.from('group_invitations').insert({
    group_id: groupId,
    invited_email: email.toLowerCase(),
    invited_by: user.id,
    token,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}`);
  return { success: true, token };
}

export async function getInvitationByToken(token: string): Promise<{
  data: {
    id: string;
    group_id: string;
    invited_email: string;
    status: string;
    expires_at: string;
    group: { name: string; description: string | null };
    inviter: { full_name: string | null };
  } | null;
  error: string | null;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('group_invitations')
    .select('id, group_id, invited_email, status, expires_at, group:expense_groups(name, description), inviter:profiles!group_invitations_invited_by_profiles_fkey(full_name)')
    .eq('token', token)
    .single();

  if (error || !data) {
    return { data: null, error: 'Invitation not found' };
  }

  // Check if expired
  if (new Date(data.expires_at) < new Date()) {
    return { data: null, error: 'This invitation has expired' };
  }

  if (data.status !== 'pending') {
    return { data: null, error: `This invitation has already been ${data.status}` };
  }

  // Handle Supabase join types (returns arrays for relations)
  const groupData = data.group as unknown as { name: string; description: string | null } | null;
  const inviterData = data.inviter as unknown as { full_name: string | null } | null;

  return {
    data: {
      id: data.id,
      group_id: data.group_id,
      invited_email: data.invited_email,
      status: data.status,
      expires_at: data.expires_at,
      group: groupData || { name: 'Unknown', description: null },
      inviter: inviterData || { full_name: null },
    },
    error: null,
  };
}

export async function acceptInvitation(token: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Please log in to accept this invitation', requiresAuth: true };
  }

  // Get invitation
  const { data: invitation, error: inviteError } = await supabase
    .from('group_invitations')
    .select('id, group_id, invited_email, status, expires_at')
    .eq('token', token)
    .single();

  if (inviteError || !invitation) {
    return { error: 'Invitation not found' };
  }

  // Check if expired
  if (new Date(invitation.expires_at) < new Date()) {
    await supabase
      .from('group_invitations')
      .update({ status: 'expired' })
      .eq('id', invitation.id);
    return { error: 'This invitation has expired' };
  }

  if (invitation.status !== 'pending') {
    return { error: `This invitation has already been ${invitation.status}` };
  }

  // Check if user is already a member
  const { data: existingMember } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', invitation.group_id)
    .eq('user_id', user.id)
    .single();

  if (existingMember) {
    // Update invitation status anyway
    await supabase
      .from('group_invitations')
      .update({ status: 'accepted' })
      .eq('id', invitation.id);
    return { success: true, groupId: invitation.group_id };
  }

  // Add user as member
  const { error: memberError } = await supabase.from('group_members').insert({
    group_id: invitation.group_id,
    user_id: user.id,
    role: 'member',
  });

  if (memberError) {
    return { error: memberError.message };
  }

  // Update invitation status
  await supabase
    .from('group_invitations')
    .update({ status: 'accepted' })
    .eq('id', invitation.id);

  revalidatePath('/groups');
  revalidatePath(`/groups/${invitation.group_id}`);
  return { success: true, groupId: invitation.group_id };
}

export async function declineInvitation(token: string) {
  const supabase = await createClient();

  const { data: invitation, error: inviteError } = await supabase
    .from('group_invitations')
    .select('id, status')
    .eq('token', token)
    .single();

  if (inviteError || !invitation) {
    return { error: 'Invitation not found' };
  }

  if (invitation.status !== 'pending') {
    return { error: `This invitation has already been ${invitation.status}` };
  }

  const { error } = await supabase
    .from('group_invitations')
    .update({ status: 'declined' })
    .eq('id', invitation.id);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function getPendingInvitations(groupId: string): Promise<{
  data: { id: string; invited_email: string; created_at: string; token: string }[] | null;
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
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    return { data: null, error: 'You are not a member of this group' };
  }

  const { data, error } = await supabase
    .from('group_invitations')
    .select('id, invited_email, created_at, token')
    .eq('group_id', groupId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function cancelInvitation(invitationId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  // Get invitation to check permissions
  const { data: invitation } = await supabase
    .from('group_invitations')
    .select('group_id, status')
    .eq('id', invitationId)
    .single();

  if (!invitation) {
    return { error: 'Invitation not found' };
  }

  if (invitation.status !== 'pending') {
    return { error: 'This invitation is no longer pending' };
  }

  // Check if user is admin
  const { data: membership } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', invitation.group_id)
    .eq('user_id', user.id)
    .single();

  if (!membership || membership.role !== 'admin') {
    return { error: 'Only admins can cancel invitations' };
  }

  const { error } = await supabase
    .from('group_invitations')
    .delete()
    .eq('id', invitationId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/groups/${invitation.group_id}`);
  return { success: true };
}

export async function getMyPendingInvitations(): Promise<{
  data: {
    id: string;
    token: string;
    group: { id: string; name: string };
    inviter: { full_name: string | null };
    created_at: string;
  }[] | null;
  error: string | null;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return { data: null, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('group_invitations')
    .select('id, token, created_at, group:expense_groups(id, name), inviter:profiles!group_invitations_invited_by_profiles_fkey(full_name)')
    .eq('invited_email', user.email.toLowerCase())
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  // Transform data to handle Supabase join types
  const transformedData = (data || []).map((item) => {
    const groupData = item.group as unknown as { id: string; name: string } | null;
    const inviterData = item.inviter as unknown as { full_name: string | null } | null;

    return {
      id: item.id,
      token: item.token,
      created_at: item.created_at,
      group: groupData || { id: '', name: 'Unknown' },
      inviter: inviterData || { full_name: null },
    };
  });

  return {
    data: transformedData,
    error: null,
  };
}

// ============ MEMBER MANAGEMENT ============

export async function removeMemberFromGroup(groupId: string, userId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  // Check if current user is admin
  const { data: membership } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single();

  if (!membership || membership.role !== 'admin') {
    return { error: 'Only admins can remove members' };
  }

  // Cannot remove yourself this way
  if (userId === user.id) {
    return { error: 'Use Leave Group to remove yourself' };
  }

  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}`);
  return { success: true };
}

export async function updateMemberRole(groupId: string, userId: string, role: 'admin' | 'member') {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  // Check if current user is admin
  const { data: membership } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single();

  if (!membership || membership.role !== 'admin') {
    return { error: 'Only admins can change roles' };
  }

  // Cannot change your own role
  if (userId === user.id) {
    return { error: 'You cannot change your own role' };
  }

  const { error } = await supabase
    .from('group_members')
    .update({ role })
    .eq('group_id', groupId)
    .eq('user_id', userId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}`);
  return { success: true };
}

export async function leaveGroup(groupId: string) {
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
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    return { error: 'You are not a member of this group' };
  }

  // If user is admin, check if they're the last admin
  if (membership.role === 'admin') {
    const { data: admins } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('role', 'admin');

    if (admins && admins.length <= 1) {
      return { error: 'You are the last admin. Please make someone else an admin before leaving or delete the group.' };
    }
  }

  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/groups');
  return { success: true };
}

// =============================================================================
// SETTLEMENTS
// =============================================================================

export async function recordSettlement(
  groupId: string,
  toUserId: string,
  amount: number,
  notes?: string
) {
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

  // Check if recipient is a member
  const { data: recipientMembership } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', toUserId)
    .single();

  if (!recipientMembership) {
    return { error: 'Recipient is not a member of this group' };
  }

  // Can't settle with yourself
  if (user.id === toUserId) {
    return { error: 'Cannot record a settlement to yourself' };
  }

  // Amount must be positive
  if (amount <= 0) {
    return { error: 'Amount must be greater than 0' };
  }

  const { data, error } = await supabase
    .from('settlements')
    .insert({
      group_id: groupId,
      from_user_id: user.id,
      to_user_id: toUserId,
      amount: Math.round(amount * 100) / 100,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/groups/${groupId}`);
  return { success: true, data };
}

export async function getGroupSettlements(groupId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated', data: null };
  }

  // Check if user is a member
  const { data: membership } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    return { error: 'You are not a member of this group', data: null };
  }

  const { data, error } = await supabase
    .from('settlements')
    .select(`
      *,
      from_user:profiles!settlements_from_user_id_profiles_fkey(id, full_name, avatar_url),
      to_user:profiles!settlements_to_user_id_profiles_fkey(id, full_name, avatar_url)
    `)
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });

  if (error) {
    return { error: error.message, data: null };
  }

  return { error: null, data };
}

export async function getSimplifiedDebts(groupId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated', data: null };
  }

  // Check if user is a member
  const { data: membership } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    return { error: 'You are not a member of this group', data: null };
  }

  // Get all shared expenses with splits
  const { data: expenses, error: expensesError } = await supabase
    .from('shared_expenses')
    .select(`
      id,
      paid_by,
      amount,
      splits:expense_splits(user_id, amount)
    `)
    .eq('group_id', groupId);

  if (expensesError) {
    return { error: expensesError.message, data: null };
  }

  // Get all settlements
  const { data: settlements, error: settlementsError } = await supabase
    .from('settlements')
    .select('from_user_id, to_user_id, amount')
    .eq('group_id', groupId);

  if (settlementsError) {
    return { error: settlementsError.message, data: null };
  }

  // Get all members for profile info
  const { data: members } = await supabase
    .from('group_members')
    .select('user_id, profile:profiles!inner(id, full_name, avatar_url)')
    .eq('group_id', groupId);

  // Calculate net balances from expenses
  const balanceMap = new Map<string, number>();

  expenses?.forEach((expense) => {
    // Payer is owed money
    const currentPayerBalance = balanceMap.get(expense.paid_by) || 0;
    balanceMap.set(expense.paid_by, currentPayerBalance + expense.amount);

    // Each split participant owes
    expense.splits?.forEach((split: { user_id: string; amount: number }) => {
      const currentBalance = balanceMap.get(split.user_id) || 0;
      balanceMap.set(split.user_id, currentBalance - split.amount);
    });
  });

  // Adjust balances for settlements
  settlements?.forEach((settlement) => {
    // fromUser paid, so they are owed less (or owe more)
    const fromBalance = balanceMap.get(settlement.from_user_id) || 0;
    balanceMap.set(settlement.from_user_id, fromBalance + settlement.amount);

    // toUser received, so they are owed more (or owe less)
    const toBalance = balanceMap.get(settlement.to_user_id) || 0;
    balanceMap.set(settlement.to_user_id, toBalance - settlement.amount);
  });

  // Import and use the simplification algorithm
  const { simplifyDebts } = await import('@/lib/debt-simplification');

  const balances = Array.from(balanceMap.entries()).map(([userId, amount]) => ({
    userId,
    amount: Math.round(amount * 100) / 100,
  }));

  const simplifiedDebts = simplifyDebts(balances);

  // Create member lookup for profile info - profile can be array or object depending on Supabase inference
  type ProfileInfo = { id: string; full_name: string | null; avatar_url: string | null };
  const memberLookup = new Map<string, ProfileInfo>();
  members?.forEach((m) => {
    const profile = Array.isArray(m.profile) ? m.profile[0] : m.profile;
    if (profile) {
      memberLookup.set(m.user_id, profile as ProfileInfo);
    }
  });

  // Add profile info to debts
  const debtsWithProfiles: Array<{
    from_user_id: string;
    to_user_id: string;
    amount: number;
    from_user: ProfileInfo | null;
    to_user: ProfileInfo | null;
  }> = simplifiedDebts.map((debt) => ({
    from_user_id: debt.fromUserId,
    to_user_id: debt.toUserId,
    amount: debt.amount,
    from_user: memberLookup.get(debt.fromUserId) || null,
    to_user: memberLookup.get(debt.toUserId) || null,
  }));

  return { error: null, data: debtsWithProfiles };
}

export async function deleteSettlement(settlementId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  // Get the settlement first
  const { data: settlement, error: fetchError } = await supabase
    .from('settlements')
    .select('group_id, from_user_id')
    .eq('id', settlementId)
    .single();

  if (fetchError || !settlement) {
    return { error: 'Settlement not found' };
  }

  // Only the person who created the settlement can delete it
  if (settlement.from_user_id !== user.id) {
    return { error: 'You can only delete settlements you created' };
  }

  const { error } = await supabase
    .from('settlements')
    .delete()
    .eq('id', settlementId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/groups/${settlement.group_id}`);
  return { success: true };
}
