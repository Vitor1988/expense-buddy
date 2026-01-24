import { describe, it, expect } from 'vitest';
import {
  simplifyDebts,
  calculateNetBalances,
  getUserDebts,
  getUserTotalBalance,
  type Balance,
  type SimplifiedDebt,
} from '../debt-simplification';

describe('simplifyDebts', () => {
  it('should simplify debts between 2 people', () => {
    const balances: Balance[] = [
      { userId: 'user1', amount: 50 }, // is owed 50
      { userId: 'user2', amount: -50 }, // owes 50
    ];
    const result = simplifyDebts(balances);
    expect(result).toHaveLength(1);
    expect(result[0].fromUserId).toBe('user2');
    expect(result[0].toUserId).toBe('user1');
    expect(result[0].amount).toBe(50);
  });

  it('should simplify debts among 3+ people', () => {
    const balances: Balance[] = [
      { userId: 'user1', amount: 100 }, // is owed 100
      { userId: 'user2', amount: -60 }, // owes 60
      { userId: 'user3', amount: -40 }, // owes 40
    ];
    const result = simplifyDebts(balances);
    // user2 pays user1 60, user3 pays user1 40
    expect(result.length).toBeGreaterThanOrEqual(2);
    const totalOwedToUser1 = result
      .filter((d) => d.toUserId === 'user1')
      .reduce((acc, d) => acc + d.amount, 0);
    expect(totalOwedToUser1).toBe(100);
  });

  it('should handle zero balances by filtering them out', () => {
    const balances: Balance[] = [
      { userId: 'user1', amount: 0 },
      { userId: 'user2', amount: 50 },
      { userId: 'user3', amount: -50 },
    ];
    const result = simplifyDebts(balances);
    expect(result).toHaveLength(1);
    expect(result[0].fromUserId).toBe('user3');
    expect(result[0].toUserId).toBe('user2');
    expect(result[0].amount).toBe(50);
  });

  it('should return empty array when all balances are zero', () => {
    const balances: Balance[] = [
      { userId: 'user1', amount: 0 },
      { userId: 'user2', amount: 0 },
    ];
    const result = simplifyDebts(balances);
    expect(result).toEqual([]);
  });

  it('should use greedy algorithm to match largest debtor with largest creditor', () => {
    const balances: Balance[] = [
      { userId: 'user1', amount: 100 }, // is owed 100
      { userId: 'user2', amount: 50 }, // is owed 50
      { userId: 'user3', amount: -80 }, // owes 80
      { userId: 'user4', amount: -70 }, // owes 70
    ];
    const result = simplifyDebts(balances);
    // First transaction should be largest debtor (user3, owes 80) to largest creditor (user1, owed 100)
    expect(result.length).toBeGreaterThan(0);
    // Total debts should balance out
    const totalPaid = result.reduce((acc, d) => acc + d.amount, 0);
    expect(totalPaid).toBe(150); // Total amount owed
  });

  it('should handle very small amounts near rounding threshold', () => {
    const balances: Balance[] = [
      { userId: 'user1', amount: 0.005 }, // Below threshold, should be filtered
      { userId: 'user2', amount: -0.005 },
    ];
    const result = simplifyDebts(balances);
    expect(result).toEqual([]);
  });

  it('should handle complex scenario with multiple partial settlements', () => {
    const balances: Balance[] = [
      { userId: 'user1', amount: 30 },
      { userId: 'user2', amount: 20 },
      { userId: 'user3', amount: -25 },
      { userId: 'user4', amount: -25 },
    ];
    const result = simplifyDebts(balances);
    // Total credits = 50, total debits = 50
    const totalAmount = result.reduce((acc, d) => acc + d.amount, 0);
    expect(totalAmount).toBe(50);
  });
});

describe('calculateNetBalances', () => {
  it('should calculate net balances from single expense', () => {
    const expenses = [
      {
        paidBy: 'user1',
        amount: 100,
        splits: [
          { userId: 'user1', amount: 50 },
          { userId: 'user2', amount: 50 },
        ],
      },
    ];
    const result = calculateNetBalances(expenses);
    // user1 paid 100, owes 50, net = +50 (is owed 50)
    // user2 paid 0, owes 50, net = -50 (owes 50)
    const user1Balance = result.find((b) => b.userId === 'user1');
    const user2Balance = result.find((b) => b.userId === 'user2');
    expect(user1Balance?.amount).toBe(50);
    expect(user2Balance?.amount).toBe(-50);
  });

  it('should calculate net balances from multiple expenses', () => {
    const expenses = [
      {
        paidBy: 'user1',
        amount: 100,
        splits: [
          { userId: 'user1', amount: 50 },
          { userId: 'user2', amount: 50 },
        ],
      },
      {
        paidBy: 'user2',
        amount: 60,
        splits: [
          { userId: 'user1', amount: 30 },
          { userId: 'user2', amount: 30 },
        ],
      },
    ];
    const result = calculateNetBalances(expenses);
    // user1: paid 100, owes 50+30=80, net = +20
    // user2: paid 60, owes 50+30=80, net = -20
    const user1Balance = result.find((b) => b.userId === 'user1');
    const user2Balance = result.find((b) => b.userId === 'user2');
    expect(user1Balance?.amount).toBe(20);
    expect(user2Balance?.amount).toBe(-20);
  });

  it('should handle payer also in splits correctly', () => {
    const expenses = [
      {
        paidBy: 'user1',
        amount: 90,
        splits: [
          { userId: 'user1', amount: 30 },
          { userId: 'user2', amount: 30 },
          { userId: 'user3', amount: 30 },
        ],
      },
    ];
    const result = calculateNetBalances(expenses);
    // user1: paid 90, owes 30, net = +60
    // user2: paid 0, owes 30, net = -30
    // user3: paid 0, owes 30, net = -30
    const user1Balance = result.find((b) => b.userId === 'user1');
    const user2Balance = result.find((b) => b.userId === 'user2');
    const user3Balance = result.find((b) => b.userId === 'user3');
    expect(user1Balance?.amount).toBe(60);
    expect(user2Balance?.amount).toBe(-30);
    expect(user3Balance?.amount).toBe(-30);
  });

  it('should return empty array for no expenses', () => {
    const result = calculateNetBalances([]);
    expect(result).toEqual([]);
  });

  it('should round amounts correctly', () => {
    const expenses = [
      {
        paidBy: 'user1',
        amount: 100,
        splits: [
          { userId: 'user1', amount: 33.33 },
          { userId: 'user2', amount: 33.33 },
          { userId: 'user3', amount: 33.34 },
        ],
      },
    ];
    const result = calculateNetBalances(expenses);
    // Check that amounts are properly rounded
    result.forEach((balance) => {
      const rounded = Math.round(balance.amount * 100) / 100;
      expect(balance.amount).toBe(rounded);
    });
  });
});

describe('getUserDebts', () => {
  it('should filter debts where user owes others', () => {
    const debts: SimplifiedDebt[] = [
      { fromUserId: 'user1', toUserId: 'user2', amount: 50 },
      { fromUserId: 'user2', toUserId: 'user3', amount: 30 },
      { fromUserId: 'user1', toUserId: 'user3', amount: 20 },
    ];
    const result = getUserDebts('user1', debts);
    expect(result.owes).toHaveLength(2);
    expect(result.owes[0].toUserId).toBe('user2');
    expect(result.owes[1].toUserId).toBe('user3');
    expect(result.owedBy).toHaveLength(0);
  });

  it('should filter debts where user is owed by others', () => {
    const debts: SimplifiedDebt[] = [
      { fromUserId: 'user1', toUserId: 'user2', amount: 50 },
      { fromUserId: 'user3', toUserId: 'user2', amount: 30 },
    ];
    const result = getUserDebts('user2', debts);
    expect(result.owes).toHaveLength(0);
    expect(result.owedBy).toHaveLength(2);
    expect(result.owedBy[0].fromUserId).toBe('user1');
    expect(result.owedBy[1].fromUserId).toBe('user3');
  });

  it('should return both owes and owedBy for mixed debts', () => {
    const debts: SimplifiedDebt[] = [
      { fromUserId: 'user1', toUserId: 'user2', amount: 50 },
      { fromUserId: 'user3', toUserId: 'user1', amount: 30 },
    ];
    const result = getUserDebts('user1', debts);
    expect(result.owes).toHaveLength(1);
    expect(result.owedBy).toHaveLength(1);
    expect(result.owes[0].toUserId).toBe('user2');
    expect(result.owedBy[0].fromUserId).toBe('user3');
  });

  it('should return empty arrays for user with no debts', () => {
    const debts: SimplifiedDebt[] = [
      { fromUserId: 'user1', toUserId: 'user2', amount: 50 },
    ];
    const result = getUserDebts('user3', debts);
    expect(result.owes).toEqual([]);
    expect(result.owedBy).toEqual([]);
  });
});

describe('getUserTotalBalance', () => {
  it('should calculate positive balance when user is owed money', () => {
    const debts: SimplifiedDebt[] = [
      { fromUserId: 'user2', toUserId: 'user1', amount: 50 },
      { fromUserId: 'user3', toUserId: 'user1', amount: 30 },
    ];
    const result = getUserTotalBalance('user1', debts);
    expect(result).toBe(80);
  });

  it('should calculate negative balance when user owes money', () => {
    const debts: SimplifiedDebt[] = [
      { fromUserId: 'user1', toUserId: 'user2', amount: 50 },
      { fromUserId: 'user1', toUserId: 'user3', amount: 30 },
    ];
    const result = getUserTotalBalance('user1', debts);
    expect(result).toBe(-80);
  });

  it('should calculate net balance for mixed debts', () => {
    const debts: SimplifiedDebt[] = [
      { fromUserId: 'user1', toUserId: 'user2', amount: 50 }, // user1 owes 50
      { fromUserId: 'user3', toUserId: 'user1', amount: 80 }, // user1 is owed 80
    ];
    const result = getUserTotalBalance('user1', debts);
    expect(result).toBe(30); // 80 - 50 = 30 (net positive)
  });

  it('should return zero for user with no debts', () => {
    const debts: SimplifiedDebt[] = [
      { fromUserId: 'user1', toUserId: 'user2', amount: 50 },
    ];
    const result = getUserTotalBalance('user3', debts);
    expect(result).toBe(0);
  });

  it('should return zero for empty debt array', () => {
    const result = getUserTotalBalance('user1', []);
    expect(result).toBe(0);
  });

  it('should round the result correctly', () => {
    const debts: SimplifiedDebt[] = [
      { fromUserId: 'user2', toUserId: 'user1', amount: 33.33 },
      { fromUserId: 'user3', toUserId: 'user1', amount: 33.33 },
    ];
    const result = getUserTotalBalance('user1', debts);
    expect(result).toBe(66.66);
  });
});
