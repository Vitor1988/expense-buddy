'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Receipt, Loader2 } from 'lucide-react';
import { GroupHeader } from '@/components/groups/group-header';
import { GroupForm } from '@/components/groups/group-form';
import { SharedExpenseCard } from '@/components/groups/shared-expense-card';
import { BalanceSummary } from '@/components/groups/balance-summary';
import { BalanceCard } from '@/components/groups/balance-card';
import { MemberList } from '@/components/groups/member-list';
import {
  getGroupById,
  getGroupExpenses,
  getGroupBalances,
  getDebts,
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

export default function GroupDetailPage() {
  const params = useParams();
  const groupId = params.id as string;

  const [group, setGroup] = useState<GroupWithMembers | null>(null);
  const [expenses, setExpenses] = useState<ExpenseWithDetails[]>([]);
  const [balances, setBalances] = useState<GroupBalance[]>([]);
  const [debts, setDebts] = useState<{ from_user: { id: string; full_name: string | null }; to_user: { id: string; full_name: string | null }; amount: number }[]>([]);
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

    // Get group details
    const { data: groupData, error: groupError } = await getGroupById(groupId);
    if (groupError) {
      console.error('Error loading group:', groupError);
    } else {
      setGroup(groupData);
    }

    // Get expenses
    const { data: expensesData } = await getGroupExpenses(groupId);
    setExpenses(expensesData || []);

    // Get balances
    const { data: balancesData } = await getGroupBalances(groupId);
    setBalances(balancesData || []);

    // Get debts
    const { data: debtsData } = await getDebts(groupId);
    setDebts(debtsData || []);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
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
      <GroupHeader group={group} onEdit={() => setShowEditDialog(true)} />

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

          {expenses.length > 0 ? (
            <div className="space-y-3">
              {expenses.map((expense) => (
                <SharedExpenseCard
                  key={expense.id}
                  expense={expense}
                  currency={currency}
                  currentUserId={currentUserId}
                  onDeleted={loadData}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-center">No expenses yet</CardTitle>
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
          {balances.length > 0 && (
            <>
              <BalanceSummary
                balances={balances}
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
