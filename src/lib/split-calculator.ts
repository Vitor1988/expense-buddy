import type { SplitMethod } from '@/types';

export interface SplitInput {
  userId: string;
  value: number; // amount for exact, percentage for %, shares for shares
}

export interface SplitResult {
  userId: string;
  amount: number;
  shares: number | null;
  percentage: number | null;
}

/**
 * Calculate equal split among selected members
 * Handles remainder by adding extra cents to first members
 */
export function calculateEqualSplit(
  total: number,
  memberIds: string[]
): SplitResult[] {
  if (memberIds.length === 0) return [];

  const baseAmount = Math.floor((total / memberIds.length) * 100) / 100;
  const remainder = Math.round((total - baseAmount * memberIds.length) * 100);

  return memberIds.map((userId, index) => ({
    userId,
    amount: index < remainder ? baseAmount + 0.01 : baseAmount,
    shares: 1,
    percentage: Math.round((100 / memberIds.length) * 100) / 100,
  }));
}

/**
 * Calculate split based on exact amounts per person
 * Returns error if amounts don't sum to total
 */
export function calculateExactSplit(
  total: number,
  inputs: SplitInput[]
): { splits: SplitResult[]; error: string | null } {
  if (inputs.length === 0) {
    return { splits: [], error: 'No members selected' };
  }

  const sum = inputs.reduce((acc, input) => acc + input.value, 0);
  const roundedSum = Math.round(sum * 100) / 100;
  const roundedTotal = Math.round(total * 100) / 100;

  // Allow 1 cent tolerance for rounding
  if (Math.abs(roundedSum - roundedTotal) > 0.01) {
    const diff = roundedTotal - roundedSum;
    return {
      splits: [],
      error: `Amounts don't add up. ${diff > 0 ? `${formatCurrency(Math.abs(diff))} remaining` : `${formatCurrency(Math.abs(diff))} over budget`}`,
    };
  }

  const splits = inputs.map((input) => ({
    userId: input.userId,
    amount: Math.round(input.value * 100) / 100,
    shares: null,
    percentage: total > 0 ? Math.round((input.value / total) * 100 * 100) / 100 : 0,
  }));

  return { splits, error: null };
}

/**
 * Calculate split based on percentages
 * Returns error if percentages don't sum to 100
 */
export function calculatePercentageSplit(
  total: number,
  inputs: SplitInput[]
): { splits: SplitResult[]; error: string | null } {
  if (inputs.length === 0) {
    return { splits: [], error: 'No members selected' };
  }

  const sumPercentage = inputs.reduce((acc, input) => acc + input.value, 0);
  const roundedSum = Math.round(sumPercentage * 100) / 100;

  // Allow 0.01% tolerance for rounding
  if (Math.abs(roundedSum - 100) > 0.01) {
    const diff = 100 - roundedSum;
    return {
      splits: [],
      error: `Percentages must add up to 100%. Currently: ${roundedSum.toFixed(2)}% (${diff > 0 ? `${diff.toFixed(2)}% remaining` : `${Math.abs(diff).toFixed(2)}% over`})`,
    };
  }

  // Calculate amounts and handle rounding
  let remainingTotal = total;
  const splits: SplitResult[] = [];

  inputs.forEach((input, index) => {
    let amount: number;
    if (index === inputs.length - 1) {
      // Last person gets the remainder to avoid rounding issues
      amount = Math.round(remainingTotal * 100) / 100;
    } else {
      amount = Math.round((total * input.value) / 100 * 100) / 100;
      remainingTotal -= amount;
    }

    splits.push({
      userId: input.userId,
      amount,
      shares: null,
      percentage: Math.round(input.value * 100) / 100,
    });
  });

  return { splits, error: null };
}

/**
 * Calculate split based on shares (proportional)
 * Example: 2 shares + 1 share = 2/3 and 1/3 of total
 */
export function calculateSharesSplit(
  total: number,
  inputs: SplitInput[]
): { splits: SplitResult[]; error: string | null } {
  if (inputs.length === 0) {
    return { splits: [], error: 'No members selected' };
  }

  const totalShares = inputs.reduce((acc, input) => acc + input.value, 0);

  if (totalShares <= 0) {
    return { splits: [], error: 'Total shares must be greater than 0' };
  }

  // Check for negative shares
  if (inputs.some((input) => input.value < 0)) {
    return { splits: [], error: 'Shares cannot be negative' };
  }

  // Calculate amounts and handle rounding
  let remainingTotal = total;
  const splits: SplitResult[] = [];

  inputs.forEach((input, index) => {
    let amount: number;
    if (index === inputs.length - 1) {
      // Last person gets the remainder to avoid rounding issues
      amount = Math.round(remainingTotal * 100) / 100;
    } else {
      amount = Math.round((total * input.value) / totalShares * 100) / 100;
      remainingTotal -= amount;
    }

    splits.push({
      userId: input.userId,
      amount,
      shares: input.value,
      percentage: Math.round((input.value / totalShares) * 100 * 100) / 100,
    });
  });

  return { splits, error: null };
}

/**
 * Main function to calculate splits based on method
 */
export function calculateSplits(
  method: SplitMethod,
  total: number,
  memberIds: string[],
  inputs?: SplitInput[]
): { splits: SplitResult[]; error: string | null } {
  switch (method) {
    case 'equal':
      return { splits: calculateEqualSplit(total, memberIds), error: null };

    case 'exact':
      if (!inputs) {
        return { splits: [], error: 'Exact amounts are required' };
      }
      return calculateExactSplit(total, inputs);

    case 'percentage':
      if (!inputs) {
        return { splits: [], error: 'Percentages are required' };
      }
      return calculatePercentageSplit(total, inputs);

    case 'shares':
      if (!inputs) {
        return { splits: [], error: 'Shares are required' };
      }
      return calculateSharesSplit(total, inputs);

    default:
      return { splits: [], error: 'Invalid split method' };
  }
}

/**
 * Validate that a split configuration is valid
 */
export function validateSplit(
  method: SplitMethod,
  total: number,
  memberIds: string[],
  inputs?: SplitInput[]
): { isValid: boolean; error: string | null } {
  const result = calculateSplits(method, total, memberIds, inputs);
  return {
    isValid: result.error === null && result.splits.length > 0,
    error: result.error,
  };
}

// Helper function for formatting currency in error messages
function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}
