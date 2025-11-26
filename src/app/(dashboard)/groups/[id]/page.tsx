'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Receipt } from 'lucide-react';
import { GroupHeader } from '@/components/groups/group-header';
import { GroupDetailSkeleton } from '@/components/groups/group-detail-skeleton';
import { GroupForm } from '@/components/groups/group-form';
import { SharedExpenseCard } from '@/components/groups/shared-expense-card';
import { SettlementCard } from '@/components/groups/settlement-card';
import { BalanceSummary } from '@/components/groups/balance-summary';
import { BalanceCard } from '@/components/groups/balance-card';
import { MemberList } from '@/components/groups/member-list';
import { SettleUpDialog } from '@/components/groups/settle-up-dialog';
import { PaymentHistory } from '@/components/groups/payment-history';
import {
  getGroupById,
  getGroupExpenses,
  getGroupBalances,
  getDebts,
  getSimplifiedDebts,
  getGroupSettlements,
  updateGroup,
} from '@/app/actions/groups';
import { createClient } from '@/lib/supabase/client';
import type { ExpenseGroup, GroupMember, SharedExpense, ExpenseSplit, GroupBalance } from '@/types';

type GroupWithMembers = ExpenseGroup & {
  members: (GroupMember & { profile: { id: string; full_name: string | null; avatar_url: string | null } })[];
};

type ExpenseWithDetails = SharedExpense & {
  payer: { id: string; full_name: string | null; avatar_url: string | null };
  splits: ExpenseSplit[];
};

type SettlementWithDetails = {
  id: string;
  amount: number;
  notes: string | null;
  created_at: string;
  from_user: { id: string; full_name: string | null; avatar_url: string | null } | null;
  to_user: { id: string; full_name: string | null; avatar_url: string | null } | null;
};

type ActivityItem =
  | { type: 'expense'; data: ExpenseWithDetails; date: string }
  | { type: 'settlement'; data: SettlementWithDetails; date: string };

export default function GroupDetailPage() {
  const params = useParams();
  const groupId = params.id as string;

  const [group, setGroup] = useState<GroupWithMembers | null>(null);
  const [expenses, setExpenses] = useState<ExpenseWithDetails[]>([]);
  const [settlements, setSettlements] = useState<SettlementWithDetails[]>([]);
  const [balances, setBalances] = useState<GroupBalance[]>([]);
  const [debts, setDebts] = useState<{ from_user: { id: string; full_name: string | null }; to_user: { id: string; full_name: string | null }; amount: number }[]>([]);
  const [simplifiedDebts, setSimplifiedDebts] = useState<{ from_user_id: string; to_user_id: string; amount: number; from_user: { id: string; full_name: string | null; avatar_url: string | null } | null; to_user: { id: string; full_name: string | null; avatar_url: string | null } | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [currency, setCurrency] = useState('USD');
  const [currentUserId, setCurrentUserId] = useState<string>('');

  const loadData = useCallback(async () => {
    setLoading(true);

    // Get user's currency and ID
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
      const { data: profile } = await supabase
        .from('profiles')
        .select('currency')
        .eq('id', user.id)
        .single();
      if (profile?.currency) {
        setCurrency(profile.currency);
      }
    }

    // Fetch all group data in parallel for better performance
    const [
      groupResult,
      expensesResult,
      settlementsResult,
      balancesResult,
      debtsResult,
      simplifiedDebtsResult,
    ] = await Promise.all([
      getGroupById(groupId),
      getGroupExpenses(groupId),
      getGroupSettlements(groupId),
      getGroupBalances(groupId),
      getDebts(groupId),
      getSimplifiedDebts(groupId),
    ]);

    // Extract data from results
    const { data: groupData, error: groupError } = groupResult;
    if (groupError) {
      console.error('Error loading group:', groupError);
    } else {
      setGroup(groupData);
    }

    setExpenses(expensesResult.data || []);
    setSettlements(settlementsResult.data || []);
    setBalances(balancesResult.data || []);
    setDebts(debtsResult.data || []);
    setSimplifiedDebts(simplifiedDebtsResult.data || []);

    setLoading(false);
  }, [groupId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpdate = async (formData: FormData) => {
    const result = await updateGroup(groupId, formData);
    if (result.success) {
      loadData();
      setShowEditDialog(false);
    }
    return result;
  };

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  });

  // Combine expenses and settlements into a sorted activity feed
  const activityItems: ActivityItem[] = [
    ...expenses.map((e) => ({ type: 'expense' as const, data: e, date: e.created_at })),
    ...settlements.map((s) => ({ type: 'settlement' as const, data: s, date: s.created_at })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (loading) {
    return <GroupDetailSkeleton />;
  }

  if (!group) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-gray-500 dark:text-gray-400">Group not found</p>
        <Link href="/groups">
          <Button variant="link">Back to Groups</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <GroupHeader group={group} currentUserId={currentUserId} onEdit={() => setShowEditDialog(true)} />

      {/* Tabs */}
      <Tabs defaultValue="activity" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="balances">Balances</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
        </TabsList>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <div className="flex justify-end">
            <Link href={`/groups/${groupId}/expenses/new`}>
              <Button className="bg-emerald-500 hover:bg-emerald-600">
                <Plus className="w-4 h-4 mr-2" />
                Add Expense
              </Button>
            </Link>
          </div>

          {activityItems.length > 0 ? (
            <div className="space-y-3">
              {activityItems.map((item) =>
                item.type === 'expense' ? (
                  <SharedExpenseCard
                    key={`expense-${item.data.id}`}
                    expense={item.data}
                    currency={currency}
                    currentUserId={currentUserId}
                    onDeleted={loadData}
                    simplifiedDebts={simplifiedDebts}
                    members={group?.members}
                  />
                ) : (
                  <SettlementCard
                    key={`settlement-${item.data.id}`}
                    settlement={item.data}
                    currency={currency}
                    currentUserId={currentUserId}
                    onDeleted={loadData}
                  />
                )
              )}
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-center">No activity yet</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <Receipt className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Add your first shared expense to start tracking
                </p>
                <Link href={`/groups/${groupId}/expenses/new`}>
                  <Button className="bg-emerald-500 hover:bg-emerald-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Expense
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Balances Tab */}
        <TabsContent value="balances" className="space-y-4">
          {/* Settle Up Button */}
          {group && (
            <div className="flex justify-end">
              <SettleUpDialog
                groupId={groupId}
                currentUserId={currentUserId}
                members={group.members.map((m) => ({
                  user_id: m.user_id,
                  profile: m.profile,
                }))}
                debts={simplifiedDebts}
                currency={currency}
                onSettled={loadData}
              />
            </div>
          )}

          {balances.length > 0 && (
            <>
              <BalanceSummary
                balances={balances}
                currentUserId={currentUserId}
                currency={currency}
              />

              {/* Payment History */}
              <PaymentHistory
                settlements={settlements}
                currentUserId={currentUserId}
                currency={currency}
              />

              {/* Debts Section */}
              {debts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Who Owes Whom</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {debts.map((debt, index) => {
                      const isYouOwe = debt.from_user.id === currentUserId;
                      const isYouOwed = debt.to_user.id === currentUserId;

                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                        >
                          <span className="text-gray-700 dark:text-gray-300">
                            {isYouOwe ? 'You' : debt.from_user.full_name || 'Unknown'} owes{' '}
                            {isYouOwed ? 'you' : debt.to_user.full_name || 'Unknown'}
                          </span>
                          <span
                            className={`font-semibold ${
                              isYouOwe
                                ? 'text-red-600 dark:text-red-400'
                                : isYouOwed
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {formatter.format(debt.amount)}
                          </span>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}

              {/* Individual Balances */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Individual Balances
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {balances.map((balance) => (
                    <BalanceCard
                      key={balance.user_id}
                      balance={balance}
                      currency={currency}
                      isCurrentUser={balance.user_id === currentUserId}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {balances.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-gray-500 dark:text-gray-400">
                  Add expenses to see balances
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-4">
          <MemberList
            groupId={groupId}
            members={group.members}
            currentUserId={currentUserId}
          />
        </TabsContent>
      </Tabs>

      {/* Edit Group Dialog */}
      <GroupForm
        group={group}
        action={handleUpdate}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
      />
    </div>
  );
}
