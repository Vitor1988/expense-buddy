'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HandCoins, Trash2 } from 'lucide-react';
import { deleteSettlement } from '@/app/actions/groups';
import { DeleteConfirmationDialog, IconBadge } from '@/components/shared';

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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const formatter = useMemo(() => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }), [currency]);

  const isMySettlement = settlement.from_user?.id === currentUserId;
  const fromName = settlement.from_user?.id === currentUserId ? 'You' : settlement.from_user?.full_name || 'Unknown';
  const toName = settlement.to_user?.id === currentUserId ? 'you' : settlement.to_user?.full_name || 'Unknown';

  const handleDelete = async () => {
    const result = await deleteSettlement(settlement.id);
    if (result.success) {
      setShowDeleteDialog(false);
      onDeleted();
    }
  };

  return (
    <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <IconBadge icon={<HandCoins />} color="emerald" />
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
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-red-500"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardContent>

      <DeleteConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDelete}
        title="Delete Settlement"
        description="Are you sure you want to delete this settlement record? This will affect the group balances."
      />
    </Card>
  );
}
