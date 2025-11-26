'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';
import type { CurrencyCode } from '@/types';

interface GroupBalance {
  id: string;
  name: string;
  your_balance: number;
}

interface GroupsBalanceWidgetProps {
  groups: GroupBalance[];
  currency: CurrencyCode;
}

export function GroupsBalanceWidget({ groups, currency }: GroupsBalanceWidgetProps) {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  });

  const totalOwed = groups.reduce((sum, g) => sum + (g.your_balance > 0 ? g.your_balance : 0), 0);
  const totalOwing = groups.reduce((sum, g) => sum + (g.your_balance < 0 ? Math.abs(g.your_balance) : 0), 0);
  const netBalance = totalOwed - totalOwing;

  if (groups.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              Group Balances
            </CardTitle>
            <Link href="/groups">
              <Button variant="ghost" size="sm">
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No groups yet. Create one to start splitting expenses!
          </p>
          <Link href="/groups">
            <Button variant="outline" size="sm" className="mt-3">
              Create Group
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            Group Balances
          </CardTitle>
          <Link href="/groups">
            <Button variant="ghost" size="sm">
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span className="text-xs text-emerald-700 dark:text-emerald-400">You are owed</span>
            </div>
            <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
              {formatter.format(totalOwed)}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-600" />
              <span className="text-xs text-red-700 dark:text-red-400">You owe</span>
            </div>
            <p className="text-lg font-semibold text-red-600 dark:text-red-400 mt-1">
              {formatter.format(totalOwing)}
            </p>
          </div>
        </div>

        {/* Net Balance */}
        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Net Balance</span>
            <span className={`text-lg font-bold ${
              netBalance > 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : netBalance < 0
                ? 'text-red-600 dark:text-red-400'
                : 'text-gray-600'
            }`}>
              {netBalance > 0 ? '+' : ''}{formatter.format(netBalance)}
            </span>
          </div>
        </div>

        {/* Group List */}
        <div className="space-y-2">
          {groups.slice(0, 3).map((group) => (
            <Link
              key={group.id}
              href={`/groups/${group.id}`}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <span className="text-sm font-medium truncate">{group.name}</span>
              <span className={`text-sm font-semibold ${
                group.your_balance > 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : group.your_balance < 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-500'
              }`}>
                {group.your_balance > 0 && '+'}
                {formatter.format(group.your_balance)}
              </span>
            </Link>
          ))}
          {groups.length > 3 && (
            <p className="text-xs text-gray-500 text-center pt-1">
              +{groups.length - 3} more groups
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
