'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { HandCoins, Trash2, Loader2 } from 'lucide-react';
import { deleteSettlement } from '@/app/actions/groups';

interface SettlementCardProps {
  settlement: {
    id: string;
    amount: number;
    notes: string | null;
    created_at: string;
    from_user: { id: string; full_name: string | null; avatar_url: string | null } | null;
    to_user: { id: string; full_name: string | null; avatar_url: string | null } | null;
  };
  currency: string;
  currentUserId: string;
  onDeleted: () => void;
}

export function SettlementCard({
  settlement,
  currency,
  currentUserId,
  onDeleted,
}: SettlementCardProps) {
  const [deleting, setDeleting] = useState(false);

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  });

  const isMySettlement = settlement.from_user?.id === currentUserId;
  const fromName = settlement.from_user?.id === currentUserId ? 'You' : settlement.from_user?.full_name || 'Unknown';
  const toName = settlement.to_user?.id === currentUserId ? 'you' : settlement.to_user?.full_name || 'Unknown';

  const handleDelete = async () => {
    setDeleting(true);
    const result = await deleteSettlement(settlement.id);
    setDeleting(false);
    if (result.success) {
      onDeleted();
    }
  };

  return (
    <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
              <HandCoins className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {fromName} paid {toName}
              </p>
              <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                {formatter.format(settlement.amount)}
              </p>
              {settlement.notes && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {settlement.notes}
                </p>
              )}
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {new Date(settlement.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>

          {isMySettlement && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Settlement</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this settlement record? This will affect the group balances.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-red-500 hover:bg-red-600"
                    disabled={deleting}
                  >
                    {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
