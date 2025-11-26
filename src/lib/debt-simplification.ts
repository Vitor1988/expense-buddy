/**
 * Debt Simplification Algorithm
 *
 * Given a set of balances (who owes what), this algorithm minimizes
 * the number of transactions needed to settle all debts.
 *
 * Uses a greedy approach: match the largest creditor with the largest debtor.
 */

export interface Balance {
  userId: string;
  amount: number; // positive = owed money, negative = owes money
}

export interface SimplifiedDebt {
  fromUserId: string;
  toUserId: string;
  amount: number;
}

/**
 * Simplify debts to minimize number of transactions
 *
 * @param balances Array of user balances (positive = owed money, negative = owes money)
 * @returns Array of simplified debts (from -> to with amount)
 */
export function simplifyDebts(balances: Balance[]): SimplifiedDebt[] {
  // Filter out zero balances and create working copies
  const debtors: Balance[] = []; // People who owe money (negative balance)
  const creditors: Balance[] = []; // People who are owed money (positive balance)

  balances.forEach((balance) => {
    const roundedAmount = Math.round(balance.amount * 100) / 100;
    if (roundedAmount < -0.01) {
      debtors.push({ userId: balance.userId, amount: Math.abs(roundedAmount) });
    } else if (roundedAmount > 0.01) {
      creditors.push({ userId: balance.userId, amount: roundedAmount });
    }
  });

  // Sort by amount descending for greedy matching
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const debts: SimplifiedDebt[] = [];

  // Greedy matching: pair largest debtor with largest creditor
  while (debtors.length > 0 && creditors.length > 0) {
    const debtor = debtors[0];
    const creditor = creditors[0];

    // Amount to transfer is the minimum of what's owed and what's due
    const transferAmount = Math.min(debtor.amount, creditor.amount);
    const roundedTransfer = Math.round(transferAmount * 100) / 100;

    if (roundedTransfer > 0.01) {
      debts.push({
        fromUserId: debtor.userId,
        toUserId: creditor.userId,
        amount: roundedTransfer,
      });
    }

    // Update balances
    debtor.amount -= roundedTransfer;
    creditor.amount -= roundedTransfer;

    // Remove settled parties
    if (debtor.amount < 0.01) {
      debtors.shift();
    }
    if (creditor.amount < 0.01) {
      creditors.shift();
    }

    // Re-sort if needed (simple version just continues with current order)
    // For optimal results with 3+ parties, re-sorting helps
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);
  }

  return debts;
}

/**
 * Calculate net balances from expense splits
 *
 * @param expenses Array of expenses with payer and splits
 * @returns Array of net balances per user
 */
export function calculateNetBalances(
  expenses: Array<{
    paidBy: string;
    amount: number;
    splits: Array<{ userId: string; amount: number }>;
  }>
): Balance[] {
  const balanceMap = new Map<string, number>();

  expenses.forEach((expense) => {
    // Payer is owed by others
    const currentPayerBalance = balanceMap.get(expense.paidBy) || 0;
    balanceMap.set(expense.paidBy, currentPayerBalance + expense.amount);

    // Each split participant owes
    expense.splits.forEach((split) => {
      const currentBalance = balanceMap.get(split.userId) || 0;
      balanceMap.set(split.userId, currentBalance - split.amount);
    });
  });

  return Array.from(balanceMap.entries()).map(([userId, amount]) => ({
    userId,
    amount: Math.round(amount * 100) / 100,
  }));
}

/**
 * Get debts for a specific user
 *
 * @param userId The user to get debts for
 * @param simplifiedDebts Array of simplified debts
 * @returns Object with debts owed by user and debts owed to user
 */
export function getUserDebts(
  userId: string,
  simplifiedDebts: SimplifiedDebt[]
): {
  owes: SimplifiedDebt[]; // User owes these people
  owedBy: SimplifiedDebt[]; // These people owe user
} {
  return {
    owes: simplifiedDebts.filter((debt) => debt.fromUserId === userId),
    owedBy: simplifiedDebts.filter((debt) => debt.toUserId === userId),
  };
}

/**
 * Calculate total amount user owes or is owed
 */
export function getUserTotalBalance(
  userId: string,
  simplifiedDebts: SimplifiedDebt[]
): number {
  let total = 0;

  simplifiedDebts.forEach((debt) => {
    if (debt.fromUserId === userId) {
      total -= debt.amount; // User owes this amount
    }
    if (debt.toUserId === userId) {
      total += debt.amount; // User is owed this amount
    }
  });

  return Math.round(total * 100) / 100;
}
