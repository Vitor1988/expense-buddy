import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, User, Mail, ArrowUpRight, ArrowDownLeft, Check, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { getContactBalance } from '@/app/actions/contacts';
import { getProfile } from '@/app/actions/settings';
import { formatDate } from '@/lib/utils';
import type { CurrencyCode } from '@/types';

interface ContactDetailPageProps {
  params: { id: string };
}

export default async function ContactDetailPage({ params }: ContactDetailPageProps) {
  const [{ data: balance }, { data: profile }] = await Promise.all([
    getContactBalance(params.id),
    getProfile(),
  ]);

  if (!balance) {
    notFound();
  }

  const currency = (profile?.currency || 'EUR') as CurrencyCode;
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  });

  const hasNoExpenses =
    balance.userPaidExpenses.length === 0 &&
    balance.contactPaidExpenses.length === 0;

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Link
          href="/contacts"
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            {balance.contactAvatarUrl ? (
              <img
                src={balance.contactAvatarUrl}
                alt={balance.contactName}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <User className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {balance.contactName}
            </h1>
            {balance.contactEmail && (
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Mail className="w-3 h-3" />
                {balance.contactEmail}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Net Balance Card */}
      <Card
        className={`${
          balance.netBalance > 0
            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
            : balance.netBalance < 0
            ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
            : 'bg-gray-50 dark:bg-gray-800/50'
        }`}
      >
        <CardContent className="pt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Net Balance</p>
          <p
            className={`text-3xl font-bold ${
              balance.netBalance > 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : balance.netBalance < 0
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            {balance.netBalance > 0 ? '+' : ''}
            {formatter.format(balance.netBalance)}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {balance.netBalance > 0
              ? `${balance.contactName} owes you`
              : balance.netBalance < 0
              ? `You owe ${balance.contactName}`
              : 'All settled up'}
          </p>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* You paid */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <ArrowUpRight className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                You paid
              </span>
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {formatter.format(balance.userPaidGrandTotal)}
            </p>
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              {formatter.format(balance.userPaidTotal + balance.userPaidSettled)} their share
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {balance.userPaidExpenses.length} expense{balance.userPaidExpenses.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        {/* They paid */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <ArrowDownLeft className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                They paid
              </span>
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {formatter.format(balance.contactPaidGrandTotal)}
            </p>
            <p className="text-sm text-amber-600 dark:text-amber-400">
              {formatter.format(balance.contactPaidTotal + balance.contactPaidSettled)} your share
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {balance.contactPaidExpenses.length} expense{balance.contactPaidExpenses.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
      </div>

      {hasNoExpenses && (
        <Card>
          <CardContent className="py-12 text-center">
            <User className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 dark:text-gray-400">
              No shared expenses with {balance.contactName} yet.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Expenses you paid */}
      {balance.userPaidExpenses.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-emerald-500" />
              Expenses you paid ({balance.contactName} owes you)
            </h2>
            <div className="space-y-3">
              {balance.userPaidExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className={`flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 ${
                    expense.isSettled ? 'opacity-60' : ''
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {expense.description || 'Expense'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(expense.date)}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center justify-end gap-1">
                      Total: {formatter.format(expense.totalAmount)}
                      {expense.participantCount > 2 && (
                        <span className="text-xs text-gray-400 flex items-center gap-0.5 ml-1">
                          <Users className="w-3 h-3" />
                          +{expense.participantCount - 2}
                        </span>
                      )}
                    </p>
                    <p
                      className={`font-semibold flex items-center justify-end gap-1 ${
                        expense.isSettled
                          ? 'text-gray-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      +{formatter.format(expense.contactShare)}
                      {expense.isSettled && <Check className="w-4 h-4" />}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {balance.userPaidSettled > 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                Settled: {formatter.format(balance.userPaidSettled)} | Pending: {formatter.format(balance.userPaidTotal)}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Expenses they paid */}
      {balance.contactPaidExpenses.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
              <ArrowDownLeft className="w-4 h-4 text-amber-500" />
              Expenses {balance.contactName} paid (you owe)
            </h2>
            <div className="space-y-3">
              {balance.contactPaidExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className={`flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 ${
                    expense.isSettled ? 'opacity-60' : ''
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {expense.description || 'Expense'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(expense.date)}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center justify-end gap-1">
                      Total: {formatter.format(expense.totalAmount)}
                      {expense.participantCount > 2 && (
                        <span className="text-xs text-gray-400 flex items-center gap-0.5 ml-1">
                          <Users className="w-3 h-3" />
                          +{expense.participantCount - 2}
                        </span>
                      )}
                    </p>
                    <p
                      className={`font-semibold flex items-center justify-end gap-1 ${
                        expense.isSettled
                          ? 'text-gray-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      -{formatter.format(expense.contactShare)}
                      {expense.isSettled && <Check className="w-4 h-4" />}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {balance.contactPaidSettled > 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                Settled: {formatter.format(balance.contactPaidSettled)} | Pending: {formatter.format(balance.contactPaidTotal)}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
