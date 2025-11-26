'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HandCoins } from 'lucide-react';

interface Settlement {
  id: string;
  amount: number;
  notes: string | null;
  created_at: string;
  from_user: { id: string; full_name: string | null; avatar_url: string | null } | null;
  to_user: { id: string; full_name: string | null; avatar_url: string | null } | null;
}

interface PaymentHistoryProps {
  settlements: Settlement[];
  currentUserId: string;
  currency: string;
}

export function PaymentHistory({ settlements, currentUserId, currency }: PaymentHistoryProps) {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  });

  if (settlements.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Payment History</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {settlements.map((settlement) => {
          const isFromMe = settlement.from_user?.id === currentUserId;
          const isToMe = settlement.to_user?.id === currentUserId;
          const fromName = isFromMe ? 'You' : settlement.from_user?.full_name || 'Unknown';
          const toName = isToMe ? 'you' : settlement.to_user?.full_name || 'Unknown';

          return (
            <div
              key={settlement.id}
              className="flex items-start gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center flex-shrink-0">
                <HandCoins className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 dark:text-white">
                  <span className="font-medium">{fromName}</span> paid{' '}
                  <span className="font-medium">{toName}</span>{' '}
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatter.format(settlement.amount)}
                  </span>
                </p>
                {settlement.notes && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
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
          );
        })}
      </CardContent>
    </Card>
  );
}
