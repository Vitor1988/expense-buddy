'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Receipt } from 'lucide-react';
import type { GroupMember } from '@/types';

interface SharedExpenseFormProps {
  groupId: string;
  members: (GroupMember & { profile: { id: string; full_name: string | null; avatar_url: string | null } })[];
  currentUserId: string;
  currency: string;
  action: (formData: FormData) => Promise<{ error?: string }>;
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      className="w-full bg-emerald-500 hover:bg-emerald-600"
      disabled={pending}
    >
      {pending ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Adding Expense...
        </>
      ) : (
        <>
          <Receipt className="w-4 h-4 mr-2" />
          Add Expense
        </>
      )}
    </Button>
  );
}

export function SharedExpenseForm({
  groupId,
  members,
  currentUserId,
  currency,
  action,
}: SharedExpenseFormProps) {
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState(currentUserId);
  const [selectedMembers, setSelectedMembers] = useState<string[]>(
    members.map((m) => m.user_id)
  );

  const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency;

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  });

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

  const handleSubmit = async (formData: FormData) => {
    formData.set('split_members', JSON.stringify(selectedMembers));
    const result = await action(formData);
    if (result?.error) {
      alert(result.error);
    }
  };

  // Calculate split preview
  const amountNum = parseFloat(amount) || 0;
  const splitAmount =
    selectedMembers.length > 0
      ? Math.round((amountNum / selectedMembers.length) * 100) / 100
      : 0;

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
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              name="date"
              type="date"
              defaultValue={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Any additional details..."
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
              {members.map((member) => {
                const initials = member.profile?.full_name
                  ?.split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase() || '?';

                return (
                  <SelectItem key={member.user_id} value={member.user_id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="text-xs">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <span>
                        {member.user_id === currentUserId
                          ? 'You'
                          : member.profile?.full_name || 'Unknown'}
                      </span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <input type="hidden" name="paid_by" value={paidBy} />
        </CardContent>
      </Card>

      {/* Split With */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Split equally between</CardTitle>
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
        </CardHeader>
        <CardContent className="space-y-3">
          {members.map((member) => {
            const initials = member.profile?.full_name
              ?.split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase() || '?';

            const isSelected = selectedMembers.includes(member.user_id);
            const name =
              member.user_id === currentUserId
                ? 'You'
                : member.profile?.full_name || 'Unknown';

            return (
              <div
                key={member.user_id}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
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
                {isSelected && amountNum > 0 && (
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {formatter.format(splitAmount)}
                  </span>
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

      {/* Split Preview */}
      {amountNum > 0 && selectedMembers.length > 0 && (
        <Card className="bg-gray-50 dark:bg-gray-800/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">
                {formatter.format(amountNum)} split {selectedMembers.length} way
                {selectedMembers.length > 1 ? 's' : ''}
              </span>
              <span className="font-semibold text-lg">
                {formatter.format(splitAmount)} each
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <input type="hidden" name="split_method" value="equal" />

      <SubmitButton />
    </form>
  );
}
