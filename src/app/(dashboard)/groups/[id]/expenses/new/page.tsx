'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { SharedExpenseForm } from '@/components/groups/shared-expense-form';
import { getGroupById, createSharedExpense } from '@/app/actions/groups';
import { createClient } from '@/lib/supabase/client';
import type { ExpenseGroup, GroupMember } from '@/types';

type GroupWithMembers = ExpenseGroup & {
  members: (GroupMember & { profile: { id: string; full_name: string | null; avatar_url: string | null } })[];
};

export default function NewSharedExpensePage() {
  const params = useParams();
  const groupId = params.id as string;

  const [group, setGroup] = useState<GroupWithMembers | null>(null);
  const [loading, setLoading] = useState(true);
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
    const { data: groupData } = await getGroupById(groupId);
    if (groupData) {
      setGroup(groupData);
    }

    setLoading(false);
  }, [groupId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async (formData: FormData) => {
    return await createSharedExpense(groupId, formData);
  };

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
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/groups/${groupId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Add Expense
          </h1>
          <p className="text-gray-600 dark:text-gray-400">{group.name}</p>
        </div>
      </div>

      {/* Form */}
      <SharedExpenseForm
        groupId={groupId}
        members={group.members}
        currentUserId={currentUserId}
        currency={currency}
        action={handleCreate}
      />
    </div>
  );
}
