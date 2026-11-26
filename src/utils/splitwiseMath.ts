/**
 * Sequential Auto-Rebalancing Custom Split & Equal Split Math
 * Strictly coerces all amounts to finite numbers (preventing string concatenation).
 */

export function buildEqualSplits(totalAmount: number, selectedIds: string[]): Record<string, number> {
  const total = Math.max(0, Number(totalAmount) || 0);
  const count = selectedIds.length;
  if (count === 0) return {};

  const result: Record<string, number> = {};
  const baseShare = Math.round((total / count) * 100) / 100;
  let running = 0;

  selectedIds.forEach((id, idx) => {
    if (idx === count - 1) {
      result[id] = Math.max(0, Math.round((total - running) * 100) / 100);
    } else {
      result[id] = baseShare;
      running += baseShare;
    }
  });

  return result;
}

export function rebalanceSequentialCustomSplits(
  totalAmount: number,
  selectedIds: string[],
  lockedIds: Set<string>,
  currentSplits: Record<string, number>,
  editedId?: string,
  editedRawValue?: number
): { splits: Record<string, number>; nextLocked: Set<string> } {
  const total = Math.max(0, Number(totalAmount) || 0);
  const nextLocked = new Set<string>(
    Array.from(lockedIds).filter((id) => selectedIds.includes(id))
  );
  const working: Record<string, number> = {};

  selectedIds.forEach((id) => {
    working[id] = Math.max(0, Number(currentSplits[id]) || 0);
  });

  if (editedId && selectedIds.includes(editedId)) {
    nextLocked.add(editedId);
    working[editedId] = Math.max(0, Number(editedRawValue) || 0);
  }

  let lockedSum = 0;
  nextLocked.forEach((id) => {
    lockedSum += Number(working[id]) || 0;
  });

  const unlockedIds = selectedIds.filter((id) => !nextLocked.has(id));
  if (unlockedIds.length > 0) {
    const remaining = Math.max(0, total - lockedSum);
    const each = Math.round((remaining / unlockedIds.length) * 100) / 100;
    let running = 0;
    unlockedIds.forEach((id, idx) => {
      if (idx === unlockedIds.length - 1) {
        working[id] = Math.max(0, Math.round((remaining - running) * 100) / 100);
      } else {
        working[id] = each;
        running += each;
      }
    });
  }

  return { splits: working, nextLocked };
}

export interface ExpenseGuardResult {
  totalError: string | null;
  capError: string | null;
}

export function computeExpenseGuards(params: {
  totalAmount: number;
  splitMode: 'equal' | 'custom';
  splitBetween: string[];
  customSplits: Record<string, number>;
  lockedIds: Set<string>;
  travelerBalances: Array<{ id: string; shortName: string; share: number; personalCap: number }>;
  editingPriorShares?: Record<string, number>;
}): ExpenseGuardResult {
  const total = Math.max(0, Number(params.totalAmount) || 0);
  const { splitMode, splitBetween, customSplits, lockedIds, travelerBalances, editingPriorShares } = params;

  let totalError: string | null = null;
  if (splitMode === 'custom') {
    let lockedSum = 0;
    let customSum = 0;
    for (const id of splitBetween) {
      const val = Math.max(0, Number(customSplits[id]) || 0);
      customSum += val;
      if (val > total + 0.01) {
        totalError = `Individual share exceeds the total expense of ₹${total.toLocaleString()} — adjust amounts to log`;
        break;
      }
      if (lockedIds.has(id)) {
        lockedSum += val;
      }
    }
    if (!totalError && (lockedSum > total + 0.01 || Math.abs(customSum - total) > 0.5)) {
      totalError = `Custom shares (₹${Math.round(customSum).toLocaleString()}) exceed or do not match the total expense of ₹${total.toLocaleString()} — adjust amounts to log`;
    }
  }

  let capError: string | null = null;
  if (splitBetween.length > 0 && travelerBalances.length > 0) {
    const equalEach = total / splitBetween.length;
    for (const id of splitBetween) {
      const bal = travelerBalances.find((b) => b.id === id);
      if (!bal) continue;
      const prior = Number(editingPriorShares?.[id] || 0);
      const currentEffectiveShare = Math.max(0, bal.share - prior);
      const newShare = splitMode === 'custom' ? Math.max(0, Number(customSplits[id]) || 0) : equalEach;
      if (currentEffectiveShare + newShare > bal.personalCap + 0.01) {
        const remaining = Math.max(0, Math.round(bal.personalCap - currentEffectiveShare));
        capError = `${bal.shortName}'s personal budget is ₹${bal.personalCap.toLocaleString()} (₹${remaining.toLocaleString()} remaining) — this ₹${Math.round(newShare).toLocaleString()} share exceeds their limit and cannot be logged`;
        break;
      }
    }
  }

  return { totalError, capError };
}
