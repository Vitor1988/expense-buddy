import { describe, it, expect } from 'vitest';
import {
  calculateEqualSplit,
  calculateExactSplit,
  calculatePercentageSplit,
  calculateSharesSplit,
  calculateSplits,
  validateSplit,
  type SplitInput,
} from '../split-calculator';

describe('calculateEqualSplit', () => {
  it('should divide equally among members', () => {
    const result = calculateEqualSplit(100, ['user1', 'user2']);
    expect(result).toHaveLength(2);
    expect(result[0].amount).toBe(50);
    expect(result[1].amount).toBe(50);
    expect(result[0].shares).toBe(1);
    expect(result[0].percentage).toBe(50);
  });

  it('should handle remainder by distributing extra cents to first members', () => {
    const result = calculateEqualSplit(100, ['user1', 'user2', 'user3']);
    expect(result).toHaveLength(3);
    // 100 / 3 = 33.33... base amount is 33.33
    // remainder is 1 cent - use toBeCloseTo for floating point comparison
    expect(result[0].amount).toBeCloseTo(33.34, 2);
    expect(result[1].amount).toBeCloseTo(33.33, 2);
    expect(result[2].amount).toBeCloseTo(33.33, 2);
    // Total should equal original amount
    const total = result.reduce((acc, r) => acc + r.amount, 0);
    expect(Math.round(total * 100) / 100).toBe(100);
  });

  it('should return empty array for empty members', () => {
    const result = calculateEqualSplit(100, []);
    expect(result).toEqual([]);
  });

  it('should handle single member', () => {
    const result = calculateEqualSplit(100, ['user1']);
    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(100);
    expect(result[0].percentage).toBe(100);
  });
});

describe('calculateExactSplit', () => {
  it('should accept exact amounts that sum to total', () => {
    const inputs: SplitInput[] = [
      { userId: 'user1', value: 60 },
      { userId: 'user2', value: 40 },
    ];
    const result = calculateExactSplit(100, inputs);
    expect(result.error).toBeNull();
    expect(result.splits).toHaveLength(2);
    expect(result.splits[0].amount).toBe(60);
    expect(result.splits[1].amount).toBe(40);
  });

  it('should reject amounts that do not sum to total', () => {
    const inputs: SplitInput[] = [
      { userId: 'user1', value: 50 },
      { userId: 'user2', value: 40 },
    ];
    const result = calculateExactSplit(100, inputs);
    expect(result.error).not.toBeNull();
    expect(result.splits).toEqual([]);
  });

  it('should allow 1 cent tolerance for rounding', () => {
    const inputs: SplitInput[] = [
      { userId: 'user1', value: 33.34 },
      { userId: 'user2', value: 33.33 },
      { userId: 'user3', value: 33.33 },
    ];
    // Sum is 100.00, should pass
    const result = calculateExactSplit(100, inputs);
    expect(result.error).toBeNull();
    expect(result.splits).toHaveLength(3);
  });

  it('should return error for no members', () => {
    const result = calculateExactSplit(100, []);
    expect(result.error).toBe('No members selected');
  });

  it('should calculate correct percentages', () => {
    const inputs: SplitInput[] = [
      { userId: 'user1', value: 75 },
      { userId: 'user2', value: 25 },
    ];
    const result = calculateExactSplit(100, inputs);
    expect(result.splits[0].percentage).toBe(75);
    expect(result.splits[1].percentage).toBe(25);
  });
});

describe('calculatePercentageSplit', () => {
  it('should calculate amounts from percentages that sum to 100', () => {
    const inputs: SplitInput[] = [
      { userId: 'user1', value: 60 },
      { userId: 'user2', value: 40 },
    ];
    const result = calculatePercentageSplit(100, inputs);
    expect(result.error).toBeNull();
    expect(result.splits[0].amount).toBe(60);
    expect(result.splits[1].amount).toBe(40);
  });

  it('should reject percentages that do not sum to 100', () => {
    const inputs: SplitInput[] = [
      { userId: 'user1', value: 60 },
      { userId: 'user2', value: 30 },
    ];
    const result = calculatePercentageSplit(100, inputs);
    expect(result.error).not.toBeNull();
    expect(result.splits).toEqual([]);
  });

  it('should handle rounding and give remainder to last person', () => {
    const inputs: SplitInput[] = [
      { userId: 'user1', value: 33.33 },
      { userId: 'user2', value: 33.33 },
      { userId: 'user3', value: 33.34 },
    ];
    const result = calculatePercentageSplit(100, inputs);
    expect(result.error).toBeNull();
    // Total should equal 100
    const total = result.splits.reduce((acc, r) => acc + r.amount, 0);
    expect(Math.round(total * 100) / 100).toBe(100);
  });

  it('should return error for no members', () => {
    const result = calculatePercentageSplit(100, []);
    expect(result.error).toBe('No members selected');
  });
});

describe('calculateSharesSplit', () => {
  it('should calculate proportional amounts from shares', () => {
    const inputs: SplitInput[] = [
      { userId: 'user1', value: 2 },
      { userId: 'user2', value: 1 },
    ];
    const result = calculateSharesSplit(90, inputs);
    expect(result.error).toBeNull();
    expect(result.splits[0].amount).toBe(60); // 2/3 of 90
    expect(result.splits[1].amount).toBe(30); // 1/3 of 90
  });

  it('should return error for zero total shares', () => {
    const inputs: SplitInput[] = [
      { userId: 'user1', value: 0 },
      { userId: 'user2', value: 0 },
    ];
    const result = calculateSharesSplit(100, inputs);
    expect(result.error).toBe('Total shares must be greater than 0');
  });

  it('should return error for negative shares', () => {
    const inputs: SplitInput[] = [
      { userId: 'user1', value: 2 },
      { userId: 'user2', value: -1 },
    ];
    const result = calculateSharesSplit(100, inputs);
    expect(result.error).toBe('Shares cannot be negative');
  });

  it('should return error for no members', () => {
    const result = calculateSharesSplit(100, []);
    expect(result.error).toBe('No members selected');
  });

  it('should calculate correct percentages from shares', () => {
    const inputs: SplitInput[] = [
      { userId: 'user1', value: 3 },
      { userId: 'user2', value: 1 },
    ];
    const result = calculateSharesSplit(100, inputs);
    expect(result.splits[0].percentage).toBe(75);
    expect(result.splits[1].percentage).toBe(25);
  });

  it('should handle rounding and give remainder to last person', () => {
    const inputs: SplitInput[] = [
      { userId: 'user1', value: 1 },
      { userId: 'user2', value: 1 },
      { userId: 'user3', value: 1 },
    ];
    const result = calculateSharesSplit(100, inputs);
    expect(result.error).toBeNull();
    // Total should equal 100
    const total = result.splits.reduce((acc, r) => acc + r.amount, 0);
    expect(Math.round(total * 100) / 100).toBe(100);
  });
});

describe('calculateSplits', () => {
  it('should handle equal split method', () => {
    const result = calculateSplits('equal', 100, ['user1', 'user2']);
    expect(result.error).toBeNull();
    expect(result.splits).toHaveLength(2);
    expect(result.splits[0].amount).toBe(50);
  });

  it('should handle exact split method', () => {
    const inputs: SplitInput[] = [
      { userId: 'user1', value: 70 },
      { userId: 'user2', value: 30 },
    ];
    const result = calculateSplits('exact', 100, ['user1', 'user2'], inputs);
    expect(result.error).toBeNull();
    expect(result.splits[0].amount).toBe(70);
  });

  it('should handle percentage split method', () => {
    const inputs: SplitInput[] = [
      { userId: 'user1', value: 75 },
      { userId: 'user2', value: 25 },
    ];
    const result = calculateSplits('percentage', 100, ['user1', 'user2'], inputs);
    expect(result.error).toBeNull();
    expect(result.splits[0].amount).toBe(75);
  });

  it('should handle shares split method', () => {
    const inputs: SplitInput[] = [
      { userId: 'user1', value: 3 },
      { userId: 'user2', value: 1 },
    ];
    const result = calculateSplits('shares', 100, ['user1', 'user2'], inputs);
    expect(result.error).toBeNull();
    expect(result.splits[0].amount).toBe(75);
    expect(result.splits[1].amount).toBe(25);
  });

  it('should return error for invalid split method', () => {
    const result = calculateSplits('invalid' as any, 100, ['user1', 'user2']);
    expect(result.error).toBe('Invalid split method');
  });

  it('should return error when inputs are required but not provided', () => {
    const result = calculateSplits('exact', 100, ['user1', 'user2']);
    expect(result.error).toBe('Exact amounts are required');
  });
});

describe('validateSplit', () => {
  it('should return valid for correct equal split', () => {
    const result = validateSplit('equal', 100, ['user1', 'user2']);
    expect(result.isValid).toBe(true);
    expect(result.error).toBeNull();
  });

  it('should return invalid for empty members', () => {
    const result = validateSplit('equal', 100, []);
    expect(result.isValid).toBe(false);
  });

  it('should return invalid for incorrect exact split', () => {
    const inputs: SplitInput[] = [
      { userId: 'user1', value: 50 },
      { userId: 'user2', value: 40 },
    ];
    const result = validateSplit('exact', 100, ['user1', 'user2'], inputs);
    expect(result.isValid).toBe(false);
    expect(result.error).not.toBeNull();
  });

  it('should return valid for correct exact split', () => {
    const inputs: SplitInput[] = [
      { userId: 'user1', value: 60 },
      { userId: 'user2', value: 40 },
    ];
    const result = validateSplit('exact', 100, ['user1', 'user2'], inputs);
    expect(result.isValid).toBe(true);
    expect(result.error).toBeNull();
  });
});
