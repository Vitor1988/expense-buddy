'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { getCategories } from '@/app/actions/categories';
import { settleExpenseSplit } from '@/app/actions/expenses';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import type { Category, CurrencyCode } from '@/types';

interface SettleExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  splitId: string;
  expenseDescription: string;
  amount: number;
  owedTo: string;
  currency?: CurrencyCode;
}

export function SettleExpenseDialog({
  open,
  onOpenChange,
  splitId,
  expenseDescription,
  amount,
  owedTo,
  currency = 'EUR',
}: SettleExpenseDialogProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const { toast } = useToast();

  // Fetch categories when dialog opens
  useEffect(() => {
    if (open) {
      setIsLoading(true);
      getCategories().then((result) => {
        if (result.data) {
          setCategories(result.data);
        }
        setIsLoading(false);
      });
      // Reset selection when dialog opens
      setSelectedCategoryId('');
    }
  }, [open]);

  const handleConfirm = async () => {
    if (!selectedCategoryId) {
      toast({
        title: 'Category required',
        description: 'Please select a category for this expense.',
        variant: 'destructive',
      });
      return;
    }

    setIsSettling(true);
    const result = await settleExpenseSplit(splitId, selectedCategoryId);
    setIsSettling(false);

    if (result.error) {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Settled!',
        description: `Payment to ${owedTo} marked as complete.`,
      });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark as Paid</DialogTitle>
          <DialogDescription>
            Confirm payment of {formatCurrency(amount, currency)} to {owedTo}
            {expenseDescription && ` for "${expenseDescription}"`}.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Label htmlFor="settle-category" className="text-sm font-medium">
            Choose a category for your records
          </Label>
          <p className="text-xs text-muted-foreground mb-2">
            This expense will appear in your reports under this category.
          </p>
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Select
              value={selectedCategoryId}
              onValueChange={setSelectedCategoryId}
            >
              <SelectTrigger id="settle-category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <span className="flex items-center gap-2">
                      <span>{category.icon}</span>
                      <span>{category.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSettling}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSettling || !selectedCategoryId}
          >
            {isSettling ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Settling...
              </>
            ) : (
              'Confirm Payment'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
