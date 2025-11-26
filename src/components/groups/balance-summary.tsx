'use client';

import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';
import type { GroupBalance } from '@/types';

interface BalanceSummaryProps {
  balances: GroupBalance[];
  currentUserId: string;
  currency: string;
}

export function BalanceSummary({ balances, currentUserId, currency }: BalanceSummaryProps) {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  });

  const userBalance = balances.find((b) => b.user_id === currentUserId);
  const totalSpent = balances.reduce((sum, b) => sum + b.total_paid, 0);
  const yourBalance = userBalance?.net_balance || 0;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Total Group Spending
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatter.format(totalSpent)}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Your Balance
            </p>
            <p
              className={`text-2xl font-bold ${
                yourBalance > 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : yourBalance < 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {yourBalance > 0 ? '+' : ''}
              {formatter.format(yourBalance)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              {yourBalance > 0 ? (
                'Others owe you'
              ) : yourBalance < 0 ? (
                'You owe others'
              ) : (
                <>
                  <CheckCircle className="w-3 h-3 text-emerald-500" />
                  All settled up
                </>
              )}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
