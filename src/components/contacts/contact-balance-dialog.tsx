'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getContactBalance } from '@/app/actions/contacts';
import { formatDate } from '@/lib/utils';
import { Loader2, Check, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import type { Contact, ContactBalance, CurrencyCode } from '@/types';

interface ContactBalanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact;
  currency: CurrencyCode;
}

export function ContactBalanceDialog({
  open,
  onOpenChange,
  contact,
  currency,
}: ContactBalanceDialogProps) {
  const [balance, setBalance] = useState<ContactBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatter = useMemo(
    () =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
      }),
    [currency]
  );

  useEffect(() => {
    if (open && contact.id) {
      loadBalance();
    }
  }, [open, contact.id]);

  const loadBalance = async () => {
    setLoading(true);
    setError(null);
    const result = await getContactBalance(contact.id);
    if (result.error) {
      setError(result.error);
    } else {
      setBalance(result.data);
    }
    setLoading(false);
  };

  const hasNoExpenses =
    balance &&
    balance.userPaidExpenses.length === 0 &&
    balance.contactPaidExpenses.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Balance with {contact.name}</DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        )}

        {error && (
          <div className="text-center py-8 text-red-500">{error}</div>
        )}

        {!loading && !error && balance && (
          <div className="space-y-6">
            {/* Net Balance Summary */}
            <div
              className={`p-4 rounded-lg text-center ${
                balance.netBalance > 0
                  ? 'bg-emerald-50 dark:bg-emerald-900/20'
                  : balance.netBalance < 0
                  ? 'bg-amber-50 dark:bg-amber-900/20'
                  : 'bg-gray-50 dark:bg-gray-800/50'
              }`}
            >
              <p
                className={`text-2xl font-bold ${
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
                  ? `${contact.name} owes you`
                  : balance.netBalance < 0
                  ? `You owe ${contact.name}`
                  : 'All settled up'}
              </p>
            </div>

            {hasNoExpenses && (
              <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                No shared expenses with this contact yet.
              </p>
            )}

            {/* Expenses you paid (contact owes you) */}
            {balance.userPaidExpenses.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                  You paid ({contact.name} owes you)
                </h3>
                <div className="space-y-2">
                  {balance.userPaidExpenses.map((expense) => (
                    <div
                      key={expense.id}
                      className={`flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 ${
                        expense.isSettled ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {expense.description || 'Expense'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(expense.date)} • Total:{' '}
                          {formatter.format(expense.totalAmount)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <span
                          className={`text-sm font-semibold ${
                            expense.isSettled
                              ? 'text-gray-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          +{formatter.format(expense.contactShare)}
                        </span>
                        {expense.isSettled && (
                          <Check className="w-4 h-4 text-emerald-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {balance.userPaidSettled > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Settled: {formatter.format(balance.userPaidSettled)}
                  </p>
                )}
              </div>
            )}

            {/* Expenses contact paid (you owe them) */}
            {balance.contactPaidExpenses.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <ArrowDownLeft className="w-4 h-4 text-amber-500" />
                  {contact.name} paid (you owe)
                </h3>
                <div className="space-y-2">
                  {balance.contactPaidExpenses.map((expense) => (
                    <div
                      key={expense.id}
                      className={`flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 ${
                        expense.isSettled ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {expense.description || 'Expense'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(expense.date)} • Total:{' '}
                          {formatter.format(expense.totalAmount)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <span
                          className={`text-sm font-semibold ${
                            expense.isSettled
                              ? 'text-gray-400'
                              : 'text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          -{formatter.format(expense.userShare)}
                        </span>
                        {expense.isSettled && (
                          <Check className="w-4 h-4 text-emerald-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {balance.contactPaidSettled > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Settled: {formatter.format(balance.contactPaidSettled)}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
