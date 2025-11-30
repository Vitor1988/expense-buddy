'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { GroupBalance } from '@/types';

interface BalanceCardProps {
  balance: GroupBalance;
  currency: string;
  isCurrentUser: boolean;
}

export function BalanceCard({ balance, currency, isCurrentUser }: BalanceCardProps) {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  });

  const initials = balance.profile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || '?';

  const name = isCurrentUser ? 'You' : balance.profile?.full_name || 'Unknown';

  return (
    <Card className={isCurrentUser ? 'ring-2 ring-emerald-500' : ''}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarFallback
                className={
                  isCurrentUser
                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400'
                    : 'bg-gray-200 dark:bg-gray-700'
                }
              >
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Paid {formatter.format(balance.total_paid)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p
              className={`font-semibold whitespace-nowrap ${
                balance.net_balance > 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : balance.net_balance < 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-500'
              }`}
            >
              {balance.net_balance > 0 ? '+' : ''}
              {formatter.format(balance.net_balance)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {balance.net_balance > 0
                ? 'gets back'
                : balance.net_balance < 0
                ? 'owes'
                : 'settled'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
