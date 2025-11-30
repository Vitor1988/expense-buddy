'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Users } from 'lucide-react';
import { GroupCard } from '@/components/groups/group-card';
import { GroupForm } from '@/components/groups/group-form';
import { PendingInvitationsBanner } from '@/components/groups/pending-invitations-banner';
import { createGroup, updateGroup } from '@/app/actions/groups';
import type { ExpenseGroup } from '@/types';

type GroupWithMeta = ExpenseGroup & { member_count: number; your_balance: number };

interface GroupsPageClientProps {
  groups: GroupWithMeta[];
  currency: string;
}

export function GroupsPageClient({ groups, currency }: GroupsPageClientProps) {
  const router = useRouter();
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ExpenseGroup | null>(null);

  const handleCreate = async (formData: FormData) => {
    const result = await createGroup(formData);
    if (result.success) {
      setShowNewDialog(false);
      router.refresh();
    }
    return result;
  };

  const handleUpdate = async (formData: FormData) => {
    if (!editingGroup) return { error: 'No group selected' };
    const result = await updateGroup(editingGroup.id, formData);
    if (result.success) {
      setEditingGroup(null);
      router.refresh();
    }
    return result;
  };

  const handleDeleted = () => {
    router.refresh();
  };

  // Calculate totals
  const totalOwed = groups.reduce((sum, g) => sum + Math.max(0, g.your_balance), 0);
  const totalOwing = groups.reduce((sum, g) => sum + Math.max(0, -g.your_balance), 0);
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Groups</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Split expenses with friends and family
          </p>
        </div>
        <Button
          className="bg-emerald-500 hover:bg-emerald-600"
          onClick={() => setShowNewDialog(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Group
        </Button>
      </div>

      {/* Pending Invitations */}
      <PendingInvitationsBanner />

      {/* Summary Card */}
      {groups.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Groups
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {groups.length}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  You Are Owed
                </p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatter.format(totalOwed)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  You Owe
                </p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {formatter.format(totalOwing)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Group Cards */}
      {groups.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              currency={currency}
              onEdit={() => setEditingGroup(group)}
              onDeleted={handleDeleted}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-center">No groups yet</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Create a group to start splitting expenses with friends and family
            </p>
            <Button
              className="bg-emerald-500 hover:bg-emerald-600"
              onClick={() => setShowNewDialog(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Group
            </Button>
          </CardContent>
        </Card>
      )}

      {/* New Group Dialog */}
      <GroupForm
        action={handleCreate}
        open={showNewDialog}
        onOpenChange={setShowNewDialog}
      />

      {/* Edit Group Dialog */}
      <GroupForm
        group={editingGroup}
        action={handleUpdate}
        open={!!editingGroup}
        onOpenChange={(open) => !open && setEditingGroup(null)}
      />
    </div>
  );
}
