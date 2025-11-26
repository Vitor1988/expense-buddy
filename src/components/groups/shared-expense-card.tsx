'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MoreVertical, Trash2, Receipt, CheckCircle, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { deleteSharedExpense, updateSharedExpense } from '@/app/actions/groups';
import { formatDate } from '@/lib/utils';
import { SharedExpenseForm } from './shared-expense-form';
import { DeleteConfirmationDialog, IconBadge } from '@/components/shared';
import type { SharedExpense, ExpenseSplit, GroupMember } from '@/types';

interface SimplifiedDebt {
  from_user_id: string;
  to_user_id: string;
  amount: number;
}

type MemberWithProfile = GroupMember & {
  profile: { id: string; full_name: string | null; avatar_url: string | null };
};

interface SharedExpenseCardProps {
  expense: SharedExpense & {
    payer: { id: string; full_name: string | null; avatar_url: string | null };
    splits: ExpenseSplit[];
  };
  currency: string;
  currentUserId: string;
  onDeleted: () => void;
  simplifiedDebts?: SimplifiedDebt[];
  members?: MemberWithProfile[];
}

export function SharedExpenseCard({
  expense,
  currency,
  currentUserId,
  onDeleted,
  simplifiedDebts = [],
  members = [],
}: SharedExpenseCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const canEdit = expense.paid_by === currentUserId || members.some(
    (m) => m.user_id === currentUserId && m.role === 'admin'
  );

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  });

  const handleDelete = async () => {
    const result = await deleteSharedExpense(expense.id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success('Expense deleted');
    setShowDeleteDialog(false);
    onDeleted();
  };

  const payerInitials = expense.payer?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || '?';

  const isPayer = expense.paid_by === currentUserId;
  const userSplit = expense.splits?.find((s) => s.user_id === currentUserId);
  const userOwesOriginal = userSplit && !isPayer ? userSplit.amount : 0;
  const userIsOwed = isPayer ? expense.amount - (userSplit?.amount || 0) : 0;

  // Check if user still owes the payer (based on simplified debts)
  // If there's no debt from current user to payer, the expense is considered settled
  const stillOwesPayerDebt = simplifiedDebts.find(
    (d) => d.from_user_id === currentUserId && d.to_user_id === expense.paid_by
  );
  const isSettled = userOwesOriginal > 0 && !stillOwesPayerDebt;
  const userOwes = isSettled ? 0 : userOwesOriginal;

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <IconBadge icon={<Receipt />} color="blue" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white">
                  {expense.description}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Avatar className="w-5 h-5">
                    <AvatarFallback className="text-xs bg-gray-200 dark:bg-gray-700">
                      {payerInitials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {isPayer ? 'You' : expense.payer?.full_name || 'Unknown'} paid{' '}
                    {formatter.format(expense.amount)}
                  </span>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {formatDate(expense.date)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-right">
                {isSettled && (
                  <div className="flex flex-col items-end">
                    <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      Settled
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      (was {formatter.format(userOwesOriginal)})
                    </p>
                  </div>
                )}
                {!isSettled && userOwes > 0 && (
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">
                    You owe {formatter.format(userOwes)}
                  </p>
                )}
                {userIsOwed > 0 && (
                  <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    You get back {formatter.format(userIsOwed)}
                  </p>
                )}
                {!isSettled && userOwes === 0 && userIsOwed === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Not involved
                  </p>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canEdit && members.length > 0 && (
                    <>
                      <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-red-600 dark:text-red-400"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Split details */}
          {expense.splits && expense.splits.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Split between {expense.splits.length} people ({expense.split_method})
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <DeleteConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDelete}
        title="Delete Expense"
        description="Are you sure you want to delete this expense? This action cannot be undone."
      />

      {/* Edit Dialog */}
      {members.length > 0 && (
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] p-0">
            <DialogHeader className="px-6 pt-6 pb-0">
              <DialogTitle>Edit Expense</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[calc(90vh-80px)] px-6 pb-6">
              <SharedExpenseForm
                groupId={expense.group_id}
                members={members}
                currentUserId={currentUserId}
                currency={currency}
                expense={expense}
                action={async (formData) => {
                  const result = await updateSharedExpense(expense.id, formData);
                  if (result.error) {
                    return { error: result.error };
                  }
                  toast.success('Expense updated');
                  setShowEditDialog(false);
                  onDeleted(); // Refresh the list
                  return { success: true };
                }}
              />
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
