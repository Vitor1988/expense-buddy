'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, HandCoins, ArrowRight } from 'lucide-react';
import { recordSettlement } from '@/app/actions/groups';

interface SimplifiedDebt {
  from_user_id: string;
  to_user_id: string;
  amount: number;
  from_user: { id: string; full_name: string | null; avatar_url: string | null } | null;
  to_user: { id: string; full_name: string | null; avatar_url: string | null } | null;
}

interface Member {
  user_id: string;
  profile?: { id: string; full_name: string | null; avatar_url: string | null };
}

interface SettleUpDialogProps {
  groupId: string;
  currentUserId: string;
  members: Member[];
  debts: SimplifiedDebt[];
  currency: string;
  onSettled: () => void;
}

export function SettleUpDialog({
  groupId,
  currentUserId,
  members,
  debts,
  currency,
  onSettled,
}: SettleUpDialogProps) {
  const [open, setOpen] = useState(false);
  const [toUserId, setToUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  });

  // Filter debts where current user owes someone
  const myDebts = debts.filter((d) => d.from_user_id === currentUserId);

  // Get members except current user
  const otherMembers = members.filter((m) => m.user_id !== currentUserId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount');
      setLoading(false);
      return;
    }

    const result = await recordSettlement(groupId, toUserId, parsedAmount, notes || undefined);

    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setOpen(false);
      setToUserId('');
      setAmount('');
      setNotes('');
      onSettled();
    }
  };

  const handleDebtClick = (debt: SimplifiedDebt) => {
    setToUserId(debt.to_user_id);
    setAmount(debt.amount.toFixed(2));
  };

  const resetForm = () => {
    setToUserId('');
    setAmount('');
    setNotes('');
    setError('');
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        setOpen(newOpen);
        if (!newOpen) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button className="bg-emerald-500 hover:bg-emerald-600">
          <HandCoins className="w-4 h-4 mr-2" />
          Settle Up
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settle Up</DialogTitle>
          <DialogDescription>Record a payment you made to another member</DialogDescription>
        </DialogHeader>

        {/* Quick settle suggestions */}
        {myDebts.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Suggested settlements:
            </p>
            <div className="space-y-2">
              {myDebts.map((debt, index) => (
                <button
                  key={index}
                  onClick={() => handleDebtClick(debt)}
                  className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Pay {debt.to_user?.full_name || 'Unknown'}
                    </span>
                    <ArrowRight className="w-3 h-3 text-gray-400" />
                  </div>
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    {formatter.format(debt.amount)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="to">Pay to</Label>
            <Select value={toUserId} onValueChange={setToUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a member" />
              </SelectTrigger>
              <SelectContent>
                {otherMembers.map((member) => (
                  <SelectItem key={member.user_id} value={member.user_id}>
                    {member.profile?.full_name || 'Unknown'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                {currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$'}
              </span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="e.g., Venmo payment, cash, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !toUserId || !amount}
              className="bg-emerald-500 hover:bg-emerald-600"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Record Payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
