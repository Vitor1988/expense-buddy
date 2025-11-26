'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Receipt, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FormSubmitButton } from '@/components/shared';
import type { GroupMember, SplitMethod, SharedExpense, ExpenseSplit } from '@/types';
import { calculateSplits, type SplitInput, type SplitResult } from '@/lib/split-calculator';

type ExpenseWithSplits = SharedExpense & {
  splits: ExpenseSplit[];
};

interface SharedExpenseFormProps {
  groupId: string;
  members: (GroupMember & { profile: { id: string; full_name: string | null; avatar_url: string | null } })[];
  currentUserId: string;
  currency: string;
  action: (formData: FormData) => Promise<{ error?: string; success?: boolean }>;
  expense?: ExpenseWithSplits;
}

export function SharedExpenseForm({
  groupId,
  members,
  currentUserId,
  currency,
  action,
  expense,
}: SharedExpenseFormProps) {
  const isEditing = !!expense;

  // Initialize state with expense data when editing
  const [amount, setAmount] = useState(expense?.amount?.toString() || '');
  const [description, setDescription] = useState(expense?.description || '');
  const [date, setDate] = useState(expense?.date || new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState(expense?.notes || '');
  const [paidBy, setPaidBy] = useState(expense?.paid_by || currentUserId);
  const [splitMethod, setSplitMethod] = useState<SplitMethod>(expense?.split_method || 'equal');
  const [selectedMembers, setSelectedMembers] = useState<string[]>(() => {
    if (expense?.splits && expense.splits.length > 0) {
      return expense.splits.map((s) => s.user_id);
    }
    return members.map((m) => m.user_id);
  });

  // For exact amounts - initialize from expense splits if editing
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>(() => {
    const initial = Object.fromEntries(members.map((m) => [m.user_id, '']));
    if (expense?.split_method === 'exact' && expense.splits) {
      expense.splits.forEach((split) => {
        initial[split.user_id] = split.amount.toString();
      });
    }
    return initial;
  });

  // For percentages - initialize from expense splits if editing
  const [percentages, setPercentages] = useState<Record<string, string>>(() => {
    const initial = Object.fromEntries(members.map((m) => [m.user_id, '']));
    if (expense?.split_method === 'percentage' && expense.splits) {
      expense.splits.forEach((split) => {
        if (split.percentage !== null) {
          initial[split.user_id] = split.percentage.toString();
        }
      });
    }
    return initial;
  });

  // For shares - initialize from expense splits if editing
  const [shares, setShares] = useState<Record<string, string>>(() => {
    const initial = Object.fromEntries(members.map((m) => [m.user_id, '1']));
    if (expense?.split_method === 'shares' && expense.splits) {
      expense.splits.forEach((split) => {
        if (split.shares !== null) {
          initial[split.user_id] = split.shares.toString();
        }
      });
    }
    return initial;
  });

  const [splitPreview, setSplitPreview] = useState<SplitResult[]>([]);
  const [splitError, setSplitError] = useState<string | null>(null);

  const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency;

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  });

  const amountNum = parseFloat(amount) || 0;

  // Build split inputs based on method
  const buildSplitInputs = useCallback((): SplitInput[] => {
    switch (splitMethod) {
      case 'exact':
        return selectedMembers.map((userId) => ({
          userId,
          value: parseFloat(exactAmounts[userId]) || 0,
        }));
      case 'percentage':
        return selectedMembers.map((userId) => ({
          userId,
          value: parseFloat(percentages[userId]) || 0,
        }));
      case 'shares':
        return selectedMembers.map((userId) => ({
          userId,
          value: parseFloat(shares[userId]) || 0,
        }));
      default:
        return [];
    }
  }, [splitMethod, selectedMembers, exactAmounts, percentages, shares]);

  // Calculate preview whenever inputs change
  useEffect(() => {
    if (amountNum <= 0 || selectedMembers.length === 0) {
      setSplitPreview([]);
      setSplitError(null);
      return;
    }

    const inputs = splitMethod === 'equal' ? undefined : buildSplitInputs();
    const result = calculateSplits(splitMethod, amountNum, selectedMembers, inputs);

    setSplitPreview(result.splits);
    setSplitError(result.error);
  }, [amountNum, splitMethod, selectedMembers, buildSplitInputs]);

  const handleMemberToggle = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAll = () => {
    setSelectedMembers(members.map((m) => m.user_id));
  };

  // Auto-distribute for percentages
  const distributeEqually = () => {
    const equalPercent = (100 / selectedMembers.length).toFixed(2);
    const newPercentages = { ...percentages };
    selectedMembers.forEach((userId) => {
      newPercentages[userId] = equalPercent;
    });
    setPercentages(newPercentages);
  };

  // Auto-fill remaining for exact
  const fillRemaining = (targetUserId: string) => {
    const otherAmounts = selectedMembers
      .filter((id) => id !== targetUserId)
      .reduce((sum, id) => sum + (parseFloat(exactAmounts[id]) || 0), 0);
    const remaining = Math.max(0, amountNum - otherAmounts);
    setExactAmounts((prev) => ({
      ...prev,
      [targetUserId]: remaining.toFixed(2),
    }));
  };

  const handleSubmit = async (formData: FormData) => {
    // Add split data to form
    formData.set('split_method', splitMethod);
    formData.set('split_members', JSON.stringify(selectedMembers));

    // Add split values based on method
    if (splitMethod !== 'equal') {
      const inputs = buildSplitInputs();
      formData.set('split_values', JSON.stringify(inputs));
    }

    const result = await action(formData);
    if (result?.error) {
      toast.error(result.error);
    }
  };

  const getMemberName = (userId: string) => {
    const member = members.find((m) => m.user_id === userId);
    return userId === currentUserId
      ? 'You'
      : member?.profile?.full_name || 'Unknown';
  };

  const getMemberInitials = (userId: string) => {
    const member = members.find((m) => m.user_id === userId);
    return member?.profile?.full_name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase() || '?';
  };

  const getSplitAmount = (userId: string) => {
    const split = splitPreview.find((s) => s.userId === userId);
    return split?.amount || 0;
  };

  return (
    <form action={handleSubmit} className="space-y-6">
      <input type="hidden" name="group_id" value={groupId} />

      {/* Amount */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-lg">
              Amount
            </Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-gray-500">
                {currencySymbol}
              </span>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-12 text-3xl h-16 font-bold"
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Description */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              name="description"
              placeholder="What was this for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              name="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Any additional details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Paid By */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Paid by</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={paidBy} onValueChange={setPaidBy} name="paid_by">
            <SelectTrigger>
              <SelectValue placeholder="Who paid?" />
            </SelectTrigger>
            <SelectContent>
              {members.map((member) => (
                <SelectItem key={member.user_id} value={member.user_id}>
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="text-xs">
                        {getMemberInitials(member.user_id)}
                      </AvatarFallback>
                    </Avatar>
                    <span>{getMemberName(member.user_id)}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name="paid_by" value={paidBy} />
        </CardContent>
      </Card>

      {/* Split Method Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Split method</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={splitMethod} onValueChange={(v) => setSplitMethod(v as SplitMethod)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="equal">Equal</TabsTrigger>
              <TabsTrigger value="exact">Exact</TabsTrigger>
              <TabsTrigger value="percentage">%</TabsTrigger>
              <TabsTrigger value="shares">Shares</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Split With - Dynamic based on method */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {splitMethod === 'equal' && 'Split equally between'}
              {splitMethod === 'exact' && 'Enter exact amounts'}
              {splitMethod === 'percentage' && 'Enter percentages'}
              {splitMethod === 'shares' && 'Enter shares'}
            </CardTitle>
            <div className="flex gap-2">
              {splitMethod === 'percentage' && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={distributeEqually}
                  className="text-emerald-600 hover:text-emerald-700"
                >
                  Distribute Equally
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={selectAll}
                className="text-emerald-600 hover:text-emerald-700"
              >
                Select All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {members.map((member) => {
            const isSelected = selectedMembers.includes(member.user_id);
            const name = getMemberName(member.user_id);
            const initials = getMemberInitials(member.user_id);
            const splitAmount = getSplitAmount(member.user_id);

            return (
              <div
                key={member.user_id}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <Checkbox
                    id={`member-${member.user_id}`}
                    checked={isSelected}
                    onCheckedChange={() => handleMemberToggle(member.user_id)}
                  />
                  <Avatar className="w-8 h-8">
                    <AvatarFallback
                      className={
                        member.user_id === currentUserId
                          ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400'
                          : 'bg-gray-200 dark:bg-gray-700'
                      }
                    >
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <label
                    htmlFor={`member-${member.user_id}`}
                    className="font-medium cursor-pointer"
                  >
                    {name}
                  </label>
                </div>

                {/* Input based on split method */}
                {isSelected && splitMethod === 'equal' && amountNum > 0 && (
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {formatter.format(splitAmount)}
                  </span>
                )}

                {isSelected && splitMethod === 'exact' && (
                  <div className="flex items-center gap-2">
                    <div className="relative w-28">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                        {currencySymbol}
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={exactAmounts[member.user_id]}
                        onChange={(e) =>
                          setExactAmounts((prev) => ({
                            ...prev,
                            [member.user_id]: e.target.value,
                          }))
                        }
                        className="pl-6 h-8 text-sm"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => fillRemaining(member.user_id)}
                      className="text-xs px-2 h-8"
                    >
                      Rest
                    </Button>
                  </div>
                )}

                {isSelected && splitMethod === 'percentage' && (
                  <div className="relative w-24">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      placeholder="0"
                      value={percentages[member.user_id]}
                      onChange={(e) =>
                        setPercentages((prev) => ({
                          ...prev,
                          [member.user_id]: e.target.value,
                        }))
                      }
                      className="pr-6 h-8 text-sm"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                      %
                    </span>
                  </div>
                )}

                {isSelected && splitMethod === 'shares' && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      placeholder="1"
                      value={shares[member.user_id]}
                      onChange={(e) =>
                        setShares((prev) => ({
                          ...prev,
                          [member.user_id]: e.target.value,
                        }))
                      }
                      className="w-20 h-8 text-sm text-center"
                    />
                    <span className="text-xs text-gray-500">
                      {parseFloat(shares[member.user_id]) === 1 ? 'share' : 'shares'}
                    </span>
                  </div>
                )}
              </div>
            );
          })}

          {selectedMembers.length === 0 && (
            <p className="text-sm text-red-500">
              Please select at least one person
            </p>
          )}
        </CardContent>
      </Card>

      {/* Split Error */}
      {splitError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{splitError}</AlertDescription>
        </Alert>
      )}

      {/* Split Preview */}
      {amountNum > 0 && selectedMembers.length > 0 && !splitError && (
        <Card className="bg-gray-50 dark:bg-gray-800/50">
          <CardContent className="pt-6 space-y-3">
            <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              Split Preview
            </div>
            {splitPreview.map((split) => (
              <div
                key={split.userId}
                className="flex items-center justify-between text-sm"
              >
                <span>{getMemberName(split.userId)}</span>
                <div className="flex items-center gap-2">
                  {splitMethod === 'percentage' && split.percentage !== null && (
                    <span className="text-gray-500">({split.percentage}%)</span>
                  )}
                  {splitMethod === 'shares' && split.shares !== null && (
                    <span className="text-gray-500">
                      ({split.shares} {split.shares === 1 ? 'share' : 'shares'})
                    </span>
                  )}
                  <span className="font-semibold">{formatter.format(split.amount)}</span>
                </div>
              </div>
            ))}
            <div className="border-t pt-2 flex items-center justify-between font-medium">
              <span>Total</span>
              <span>{formatter.format(amountNum)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <FormSubmitButton
        className="w-full bg-emerald-500 hover:bg-emerald-600"
        loadingText={isEditing ? 'Updating Expense...' : 'Adding Expense...'}
        icon={<Receipt className="w-4 h-4 mr-2" />}
        disabled={!!splitError || selectedMembers.length === 0}
      >
        {isEditing ? 'Update Expense' : 'Add Expense'}
      </FormSubmitButton>
    </form>
  );
}
