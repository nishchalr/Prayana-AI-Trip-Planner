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
