import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePrayana } from '../../../context/PrayanaContext';
import { BudgetSplit, ExpenseItem } from '../../../types';
import {
  buildEqualSplits,
  rebalanceSequentialCustomSplits,
} from '../../../utils/splitwiseMath';
import {
  FLUID_GESTURE_TAP,
  FLUID_ISLAND_SPRING,
  FLUID_SPRING,
} from '../../../motion/fluidTokens';
import {
  AlertTriangle,
  ArrowRight,
  CreditCard,
  Pencil,
  Plus,
  SlidersHorizontal,
  Trash2,
  Users,
  X,
} from 'lucide-react';

type BucketKey = 'stays' | 'food' | 'transit' | 'activitiesAndBuffer';

function autoCategorizeDescription(desc: string): BucketKey | null {
  const low = desc.toLowerCase();
  if (/(cab|auto|taxi|uber|ola|train|bus|flight|metro|fuel|petrol|toll|ferry|coracle)/.test(low)) {
    return 'transit';
  }
  if (/(lunch|dinner|breakfast|coffee|tea|snack|cafe|food|biriyani|dosa|meal|drink|bar)/.test(low)) {
    return 'food';
  }
  if (/(hotel|stay|resort|hostel|room|airbnb|lodge|villa|homestay)/.test(low)) {
    return 'stays';
  }
  if (/(ticket|safari|entry|museum|tour|boat|guide|temple|park|pass)/.test(low)) {
    return 'activitiesAndBuffer';
  }
  return null;
}

export const BudgetPage: React.FC = () => {
  const {
    expenses,
    addExpense,
    updateExpense,
    deleteExpense,
    isOverspent,
    netOverspend,
    compensatoryRebalance,
    rebalanceApplied,
    activeTrip,
    updateActiveTrip,
    travelers,
    theme,
  } = usePrayana();
  const isLight = theme === 'light';

  const defaultTravelerId = travelers[0]?.id || 'cohort-default';

  // Customizable Budgets Drawer State
  const [isEditingBudgets, setIsEditingBudgets] = useState<boolean>(false);
  const [draftTotalBudget, setDraftTotalBudget] = useState<number>(activeTrip.totalBudget);
  const [draftSplit, setDraftSplit] = useState<BudgetSplit>(activeTrip.budgetSplit);
  const [draftIndividualBudgets, setDraftIndividualBudgets] = useState<Record<string, number>>(() => {
    const base: Record<string, number> = {};
    const perHead = Math.round(activeTrip.totalBudget / Math.max(1, travelers.length));
    travelers.forEach((t) => {
      base[t.id] = activeTrip.individualBudgets?.[t.id] ?? perHead;
    });
    return base;
  });

  useEffect(() => {
    setDraftTotalBudget(activeTrip.totalBudget);
    setDraftSplit(activeTrip.budgetSplit);
    const perHead = Math.round(activeTrip.totalBudget / Math.max(1, travelers.length));
    const next: Record<string, number> = {};
    travelers.forEach((t) => {
      next[t.id] = activeTrip.individualBudgets?.[t.id] ?? perHead;
    });
    setDraftIndividualBudgets(next);
  }, [activeTrip.totalBudget, activeTrip.budgetSplit, activeTrip.individualBudgets, travelers]);

  // Splitwise Quick Expense Logger State
  const [expenseDesc, setExpenseDesc] = useState<string>('');
  const [expenseCategory, setExpenseCategory] = useState<BucketKey>('food');
  const [categoryPinned, setCategoryPinned] = useState<boolean>(false);
  const [expenseAmount, setExpenseAmount] = useState<number>(1200);
  const [paidBy, setPaidBy] = useState<string>(defaultTravelerId);
  const [splitMode, setSplitMode] = useState<'equal' | 'custom'>('equal');
  const [splitBetween, setSplitBetween] = useState<string[]>(() => travelers.map((t) => t.id));
  const [customSplits, setCustomSplits] = useState<Record<string, number>>(() =>
    buildEqualSplits(1200, travelers.map((t) => t.id))
  );
  const [lockedIds, setLockedIds] = useState<Set<string>>(() => new Set());
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  useEffect(() => {
    if (travelers.length > 0 && !travelers.some((t) => t.id === paidBy)) {
      setPaidBy(travelers[0].id);
    }
    if (splitBetween.length === 0 && travelers.length > 0) {
      const allIds = travelers.map((t) => t.id);
      setSplitBetween(allIds);
      setCustomSplits(buildEqualSplits(expenseAmount, allIds));
    }
  }, [travelers]);

  const handleDescChange = (val: string) => {
    setExpenseDesc(val);
    if (!categoryPinned) {
      const detected = autoCategorizeDescription(val);
      if (detected) setExpenseCategory(detected);
    }
  };

  const handleAmountChange = (raw: string) => {
    const num = Math.max(0, Number(raw) || 0);
    setExpenseAmount(num);
    if (splitMode === 'custom') {
      const { splits, nextLocked } = rebalanceSequentialCustomSplits(
        num,
        splitBetween,
        lockedIds,
        customSplits
      );
      setCustomSplits(splits);
      setLockedIds(nextLocked);
    }
  };

  const handleSwitchSplitMode = (mode: 'equal' | 'custom') => {
    setSplitMode(mode);
    if (mode === 'custom') {
      setLockedIds(new Set());
      setCustomSplits(buildEqualSplits(expenseAmount, splitBetween));
    }
  };

  const toggleSplitMember = (id: string) => {
    const nextMembers = splitBetween.includes(id)
      ? splitBetween.length > 1
        ? splitBetween.filter((x) => x !== id)
        : splitBetween
      : [...splitBetween, id];
    setSplitBetween(nextMembers);
    const nextLocked = new Set(Array.from(lockedIds).filter((x) => nextMembers.includes(x)));
    const { splits } = rebalanceSequentialCustomSplits(
      expenseAmount,
      nextMembers,
      nextLocked,
      customSplits
    );
    setLockedIds(nextLocked);
    setCustomSplits(splits);
  };

  const handleCustomMemberEdit = (id: string, rawVal: string) => {
    const num = Math.max(0, Number(rawVal) || 0);
    const { splits, nextLocked } = rebalanceSequentialCustomSplits(
      expenseAmount,
      splitBetween,
      lockedIds,
      customSplits,
      id,
      num
    );
    setCustomSplits(splits);
    setLockedIds(nextLocked);
  };

  const handleResetEqualSplits = () => {
    setLockedIds(new Set());
    setCustomSplits(buildEqualSplits(expenseAmount, splitBetween));
  };

  const resetForm = () => {
    setEditingExpenseId(null);
    setExpenseDesc('');
    setExpenseAmount(1000);
    setCategoryPinned(false);
    setSplitMode('equal');
    const allIds = travelers.map((t) => t.id);
    setSplitBetween(allIds);
    setLockedIds(new Set());
    setCustomSplits(buildEqualSplits(1000, allIds));
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Math.max(0, Number(expenseAmount) || 0);
    if (numericAmount <= 0) return;

    const cleanCustomSplits: Record<string, number> | undefined =
      splitMode === 'custom'
        ? Object.fromEntries(
            splitBetween.map((id) => [id, Math.max(0, Number(customSplits[id]) || 0)])
          )
        : undefined;

    const payload: Omit<ExpenseItem, 'id' | 'timestamp'> = {
      category: expenseCategory,
      amount: numericAmount,
      description: expenseDesc.trim() || `${expenseCategory.toUpperCase()} Entry`,
      dayIndex: activeTrip.dayIndex ?? 1,
      paidBy: paidBy || defaultTravelerId,
      splitMode,
      splitBetween,
      customSplits: cleanCustomSplits,
    };

    if (editingExpenseId) {
      updateExpense(editingExpenseId, payload);
    } else {
      addExpense(payload);
    }
    resetForm();
  };

  const startEditExpense = (item: ExpenseItem) => {
    setEditingExpenseId(item.id);
    setExpenseDesc(item.description);
    setExpenseCategory(item.category);
    setCategoryPinned(true);
    setExpenseAmount(item.amount);
    setPaidBy(item.paidBy || defaultTravelerId);
    setSplitMode(item.splitMode || 'equal');
    setSplitBetween(item.splitBetween && item.splitBetween.length > 0 ? item.splitBetween : travelers.map((t) => t.id));
    setCustomSplits(item.customSplits || {});
  };

  const handleSaveBudgets = () => {
    const sumPct = draftSplit.stays + draftSplit.food + draftSplit.transit + draftSplit.activitiesAndBuffer;
    const normalizedSplit: BudgetSplit =
      sumPct > 0 && sumPct !== 100
        ? {
            stays: Math.round((draftSplit.stays / sumPct) * 100),
            food: Math.round((draftSplit.food / sumPct) * 100),
            transit: Math.round((draftSplit.transit / sumPct) * 100),
            activitiesAndBuffer: Math.max(
              0,
              100 -
                Math.round((draftSplit.stays / sumPct) * 100) -
                Math.round((draftSplit.food / sumPct) * 100) -
                Math.round((draftSplit.transit / sumPct) * 100)
            ),
          }
        : draftSplit;

    updateActiveTrip({
      totalBudget: Math.max(1000, draftTotalBudget),
      budgetSplit: normalizedSplit,
      individualBudgets: draftIndividualBudgets,
    });
    setIsEditingBudgets(false);
  };

  // Splitwise Ledger & Per-Traveler Balance Computation
  const { travelerBalances, settleUpPairs } = useMemo(() => {
    const paidMap: Record<string, number> = {};
    const shareMap: Record<string, number> = {};
    const defaultPerHeadCap = Math.round(activeTrip.totalBudget / Math.max(1, travelers.length));

    travelers.forEach((t) => {
      paidMap[t.id] = 0;
      shareMap[t.id] = 0;
    });

    expenses.forEach((exp) => {
      if (travelers.length === 0) return;
      const payer = exp.paidBy && paidMap[exp.paidBy] !== undefined ? exp.paidBy : travelers[0].id;
      paidMap[payer] += exp.amount;

      if (exp.splitMode === 'custom' && exp.customSplits) {
        let assigned = 0;
        travelers.forEach((t) => {
          const val = Number(exp.customSplits?.[t.id] || 0);
          shareMap[t.id] += val;
          assigned += val;
        });
        if (assigned === 0) {
          const eq = exp.amount / travelers.length;
          travelers.forEach((t) => (shareMap[t.id] += eq));
        }
      } else {
        const members =
          exp.splitBetween && exp.splitBetween.length > 0
            ? exp.splitBetween.filter((id) => shareMap[id] !== undefined)
            : travelers.map((t) => t.id);
        const denom = Math.max(1, members.length);
        const each = exp.amount / denom;
        members.forEach((id) => {
          shareMap[id] += each;
        });
      }
    });

    const balances = travelers.map((t) => {
      const paid = Math.round(paidMap[t.id] || 0);
      const share = Math.round(shareMap[t.id] || 0);
      const net = paid - share;
      const personalCap = activeTrip.individualBudgets?.[t.id] ?? defaultPerHeadCap;
      const isOverPersonalCap = share > personalCap;
      return {
        id: t.id,
        name: t.name,
        shortName: t.name.split(' ')[0] || t.name,
        paid,
        share,
        net,
        personalCap,
        isOverPersonalCap,
      };
    });

    // Greedy Settle Up pairs
    const debtors = balances
      .filter((b) => b.net < -1)
      .map((b) => ({ id: b.id, name: b.shortName, amt: -b.net }))
      .sort((a, b) => b.amt - a.amt);
    const creditors = balances
      .filter((b) => b.net > 1)
      .map((b) => ({ id: b.id, name: b.shortName, amt: b.net }))
      .sort((a, b) => b.amt - a.amt);

    const pairs: Array<{ from: string; to: string; amount: number }> = [];
    let i = 0;
    let j = 0;
    while (i < debtors.length && j < creditors.length) {
      const pay = Math.min(debtors[i].amt, creditors[j].amt);
      if (pay > 0) {
        pairs.push({ from: debtors[i].name, to: creditors[j].name, amount: Math.round(pay) });
      }
      debtors[i].amt -= pay;
      creditors[j].amt -= pay;
      if (debtors[i].amt <= 1) i += 1;
      if (creditors[j].amt <= 1) j += 1;
    }

    return { travelerBalances: balances, settleUpPairs: pairs };
  }, [expenses, travelers, activeTrip.totalBudget, activeTrip.individualBudgets]);

  const flaggedTravelers = useMemo(
    () => travelerBalances.filter((b) => b.isOverPersonalCap),
    [travelerBalances]
  );

  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const remainingBudget = activeTrip.totalBudget - totalSpent;

  const panelSurface = isLight
    ? 'bg-[#FFFFFF] border-[rgba(17,17,17,0.16)]'
    : 'bg-[#161616] border-[rgba(242,240,235,0.12)]';
  const subSurface = isLight
    ? 'bg-[#F4F3EF] border-[rgba(17,17,17,0.14)]'
    : 'bg-[#121212] border-[rgba(242,240,235,0.12)]';

  return (
    <div className="w-full space-y-5 pb-12 font-mono text-[13px] select-none">
      {/* Sub-view Header */}
      <div className={`p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${subSurface}`}>
        <div className="flex items-center space-x-2.5">
          <CreditCard className="w-4 h-4 text-[var(--ink-primary)] shrink-0" />
          <div>
            <div className="text-[12px] font-bold text-[var(--ink-primary)] uppercase tracking-widest">
              LIVE BUDGET, SPLITWISE LEDGER &amp; EQ. 5.2 REBALANCING
            </div>
            <div className="text-[11px] text-[var(--ink-secondary)]">
              Cohort Cap: ₹{activeTrip.totalBudget.toLocaleString()} · Realized Spend: ₹{totalSpent.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="text-[11px] uppercase">
            REMAINING:{' '}
            <span className={remainingBudget < 0 ? 'text-semantic-hazard font-bold' : 'text-semantic-nominal font-bold'}>
              ₹{remainingBudget.toLocaleString()}
            </span>
          </div>
          <motion.button
            type="button"
            {...FLUID_GESTURE_TAP}
            transition={FLUID_ISLAND_SPRING}
            onClick={() => setIsEditingBudgets((v) => !v)}
            className="px-3 py-1.5 border border-[var(--hairline-strong)] bg-[var(--bg-surface)] text-[var(--ink-primary)] hover:border-[var(--ink-primary)] text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>{isEditingBudgets ? '[ CLOSE BUDGETS ]' : '[ EDIT BUDGETS ]'}</span>
          </motion.button>
        </div>
      </div>

      {/* Customizable Buckets & Per-Profile Budgets Panel */}
      <AnimatePresence>
        {isEditingBudgets && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={FLUID_ISLAND_SPRING}
            className={`p-4 border space-y-4 ${panelSurface}`}
          >
            <div className="flex items-center justify-between border-b border-[var(--hairline)] pb-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--ink-primary)]">
                CUSTOMIZE COHORT BUCKETS &amp; INDIVIDUAL TRAVELER CAPS
              </span>
              <button
                type="button"
                onClick={() => setIsEditingBudgets(false)}
                className="p-1 text-[var(--ink-muted)] hover:text-[var(--ink-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div>
                <label className="block text-[10px] text-[var(--ink-muted)] uppercase mb-1">
                  TOTAL COHORT CAP (₹)
                </label>
                <input
                  type="number"
                  step="500"
                  value={draftTotalBudget}
                  onChange={(e) => setDraftTotalBudget(Number(e.target.value))}
                  className="w-full p-2 border border-[var(--hairline)] bg-[var(--bg-canvas)] text-[var(--ink-primary)]"
                />
              </div>
              {(
                [
                  { k: 'stays', label: 'STAYS %' },
                  { k: 'food', label: 'FOOD %' },
                  { k: 'transit', label: 'TRANSIT %' },
                  { k: 'activitiesAndBuffer', label: 'ACTIVITIES %' },
                ] as const
              ).map((b) => (
                <div key={b.k}>
                  <label className="block text-[10px] text-[var(--ink-muted)] uppercase mb-1">{b.label}</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={draftSplit[b.k]}
                    onChange={(e) =>
                      setDraftSplit((prev) => ({ ...prev, [b.k]: Math.max(0, Number(e.target.value)) }))
                    }
                    className="w-full p-2 border border-[var(--hairline)] bg-[var(--bg-canvas)] text-[var(--ink-primary)]"
                  />
                </div>
              ))}
            </div>

            {travelers.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[var(--hairline)]">
                <div className="text-[10px] text-[var(--ink-muted)] uppercase">
                  INDIVIDUAL TRAVELER BUDGET CAPS (₹ INR)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {travelers.map((t) => (
                    <div key={t.id} className={`p-2.5 border ${subSurface}`}>
                      <label className="block text-[11px] font-bold text-[var(--ink-primary)] mb-1">
                        {t.name}
                      </label>
                      <input
                        type="number"
                        step="500"
                        value={draftIndividualBudgets[t.id] ?? 0}
                        onChange={(e) =>
                          setDraftIndividualBudgets((prev) => ({
                            ...prev,
                            [t.id]: Math.max(0, Number(e.target.value)),
                          }))
                        }
                        className="w-full p-1.5 border border-[var(--hairline)] bg-[var(--bg-canvas)] text-[var(--ink-primary)] text-[12px]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-[var(--ink-muted)]">
                Bucket Sum: {draftSplit.stays + draftSplit.food + draftSplit.transit + draftSplit.activitiesAndBuffer}% (auto-normalizes to 100% on save)
              </span>
              <motion.button
                type="button"
                {...FLUID_GESTURE_TAP}
                transition={FLUID_ISLAND_SPRING}
                onClick={handleSaveBudgets}
                className="px-4 py-2 bg-[var(--ink-primary)] text-[var(--bg-canvas)] font-bold text-[11px] cursor-pointer"
              >
                [ SAVE BUDGET CONFIG ]
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overspend / Individual Profile Cap Alert Banner */}
      {(isOverspent || flaggedTravelers.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={FLUID_ISLAND_SPRING}
          className={`p-4 border border-l-[3px] border-l-red-500/80 flex flex-col md:flex-row md:items-center justify-between gap-3 ${panelSurface}`}
        >
          <div className="flex items-start space-x-2.5">
            <AlertTriangle className="w-4 h-4 text-semantic-hazard shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-[12px] text-[var(--ink-primary)]">
                {isOverspent
                  ? `NET GROUP OVERSPEND: +₹${netOverspend.toLocaleString()}`
                  : 'INDIVIDUAL PROFILE BUDGET ALERT'}
                {flaggedTravelers.length > 0 && (
                  <span className="text-semantic-hazard ml-2">
                    ({flaggedTravelers.map((f) => `${f.shortName}: ₹${f.share.toLocaleString()} / ₹${f.personalCap.toLocaleString()}`).join(' · ')})
                  </span>
                )}
              </div>
              <div className="text-[12px] mt-0.5 font-sans text-[var(--ink-secondary)]">
                Eq. (5.2) trimming rule targets activities (50%) and dining (30%) while protecting transit (5%).
              </div>
            </div>
          </div>

          <motion.button
            onClick={compensatoryRebalance}
            disabled={rebalanceApplied}
            {...FLUID_GESTURE_TAP}
            transition={FLUID_SPRING}
            className="shrink-0 px-4 py-2 text-[12px] font-mono tracking-widest uppercase bg-[var(--ink-primary)] text-[var(--bg-canvas)] font-bold cursor-pointer disabled:opacity-50"
          >
            {rebalanceApplied ? '✓ RE-PLAN COMMITTED' : 'COMPENSATORY RE-PLAN [+]'}
          </motion.button>
        </motion.div>
      )}

      {rebalanceApplied && (
        <div className={`p-3 border border-l-[3px] border-l-emerald-500 text-[12px] flex flex-wrap items-center justify-between gap-2 ${subSurface}`}>
          <span className="text-semantic-nominal">
            ✓ COMPENSATORY RE-PLAN APPLIED: Replaced paid monument tickets with free panoramic viewpoints &amp; rebalanced 4-bucket targets.
          </span>
          <span className="font-bold text-semantic-nominal">ω REBALANCE ACTIVE</span>
        </div>
      )}

      {/* Full-Width 4-Bucket Allocation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {(
          [
            { key: 'stays' as const, label: 'STAYS', pct: activeTrip.budgetSplit.stays, dailyTarget: activeTrip.rebalanceTargets?.stays },
            { key: 'food' as const, label: 'FOOD & DINING', pct: activeTrip.budgetSplit.food, dailyTarget: activeTrip.rebalanceTargets?.food },
            { key: 'transit' as const, label: 'LOCAL TRANSIT', pct: activeTrip.budgetSplit.transit, dailyTarget: activeTrip.rebalanceTargets?.transit },
            { key: 'activitiesAndBuffer' as const, label: 'ACTIVITIES & BUFFER', pct: activeTrip.budgetSplit.activitiesAndBuffer, dailyTarget: activeTrip.rebalanceTargets?.activities },
          ]
        ).map((bucket) => {
          const bucketCap = Math.round((activeTrip.totalBudget * bucket.pct) / 100);
          const bucketSpent = expenses
            .filter((ex) => ex.category === bucket.key)
            .reduce((acc, ex) => acc + ex.amount, 0);
          const utilPct = Math.min(100, Math.round((bucketSpent / Math.max(1, bucketCap)) * 100));
          const isOver = bucketSpent > bucketCap;

          return (
            <motion.div
              key={bucket.key}
              layout
              transition={FLUID_ISLAND_SPRING}
              className={`p-4 border ${panelSurface}`}
            >
              <div className="flex items-center justify-between text-[11px] text-[var(--ink-muted)]">
                <span>{bucket.label}</span>
                <span className="font-bold text-[var(--ink-primary)]">{bucket.pct}% ALLOCATED</span>
              </div>
              <div className="mt-2 flex items-baseline justify-between font-mono text-sm">
                <span className={isOver ? 'text-semantic-hazard font-bold' : 'text-[var(--ink-primary)] font-bold'}>
                  ₹{bucketSpent.toLocaleString()}
                </span>
                <span className="text-[12px] text-[var(--ink-muted)]">/ ₹{bucketCap.toLocaleString()}</span>
              </div>
              <div className="w-full h-1.5 bg-[var(--hairline)] mt-2 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${utilPct}%` }}
                  transition={FLUID_ISLAND_SPRING}
                  className={`h-full ${isOver ? 'bg-semantic-hazard' : 'bg-[var(--ink-primary)]'}`}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className="text-[var(--ink-muted)]">{utilPct}% UTILIZED</span>
                {typeof bucket.dailyTarget === 'number' && (
                  <span className="text-semantic-nominal font-bold">
                    DAILY: ₹{Math.round(bucket.dailyTarget).toLocaleString()}
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Splitwise Cohort Balances & Who Owes Whom */}
      {travelers.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className={`lg:col-span-7 p-4 border space-y-3 ${panelSurface}`}>
            <div className="flex items-center justify-between border-b border-[var(--hairline)] pb-2 text-[11px] text-[var(--ink-muted)] uppercase">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[var(--ink-primary)]" />
                <span>COHORT BALANCES &amp; PERSONAL CAPS</span>
              </span>
              <span>{travelers.length} TRAVELERS</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {travelerBalances.map((b) => (
                <motion.div
                  key={b.id}
                  layout
                  transition={FLUID_ISLAND_SPRING}
                  className={`p-3 border ${subSurface} ${
                    b.isOverPersonalCap ? 'border-l-[3px] border-l-red-500/80' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[12px] text-[var(--ink-primary)]">{b.name}</span>
                    {b.isOverPersonalCap && (
                      <span className="text-[10px] font-bold text-semantic-hazard border border-semantic-hazard/50 px-1.5 py-0.5">
                        OVER CAP
                      </span>
                    )}
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-1 text-[11px]">
                    <div>
                      <div className="text-[9px] text-[var(--ink-muted)]">PAID</div>
                      <div className="font-bold text-[var(--ink-primary)]">₹{b.paid.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-[var(--ink-muted)]">SHARE / CAP</div>
                      <div className={b.isOverPersonalCap ? 'font-bold text-semantic-hazard' : 'text-[var(--ink-secondary)]'}>
                        ₹{b.share.toLocaleString()} / ₹{b.personalCap.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] text-[var(--ink-muted)]">NET</div>
                      <div className={`font-bold ${b.net >= 0 ? 'text-semantic-nominal' : 'text-semantic-hazard'}`}>
                        {b.net >= 0 ? `+₹${b.net.toLocaleString()}` : `-₹${Math.abs(b.net).toLocaleString()}`}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className={`lg:col-span-5 p-4 border space-y-3 ${panelSurface}`}>
            <div className="border-b border-[var(--hairline)] pb-2 text-[11px] text-[var(--ink-muted)] uppercase">
              SETTLE UP // SIMPLIFIED TRANSFERS
            </div>
            {settleUpPairs.length === 0 ? (
              <div className="p-6 text-center text-[11px] text-[var(--ink-muted)] border border-[var(--hairline)]">
                All cohort balances are settled.
              </div>
            ) : (
              <div className="space-y-2">
                {settleUpPairs.map((pair, idx) => (
                  <motion.div
                    key={`${pair.from}-${pair.to}-${idx}`}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={FLUID_ISLAND_SPRING}
                    className={`p-3 border flex items-center justify-between text-[12px] ${subSurface}`}
                  >
                    <div className="flex items-center gap-2 font-bold text-[var(--ink-primary)]">
                      <span>{pair.from}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[var(--ink-muted)]" />
                      <span>{pair.to}</span>
                    </div>
                    <span className="font-bold text-[var(--ink-primary)]">
                      ₹{pair.amount.toLocaleString()}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 12-Column Splitwise Expense Logger + Realized Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className={`lg:col-span-5 p-4 border ${panelSurface}`}>
          <div className="flex items-center justify-between text-[11px] text-[var(--ink-muted)] uppercase tracking-widest mb-3 pb-2 border-b border-[var(--hairline)]">
            <span>{editingExpenseId ? 'EDIT EXPENSE ENTRY' : 'SPLITWISE EXPENSE LOGGER'}</span>
            {editingExpenseId && (
              <button type="button" onClick={resetForm} className="text-[var(--ink-primary)] hover:underline cursor-pointer">
                CANCEL EDIT
              </button>
            )}
          </div>

          <form onSubmit={handleSaveExpense} className="space-y-3">
            <div>
              <label className="block text-[11px] text-[var(--ink-secondary)] uppercase mb-1">
                DESCRIPTION (AUTO-CATEGORIZES BUCKET)
              </label>
              <input
                type="text"
                value={expenseDesc}
                onChange={(e) => handleDescChange(e.target.value)}
                placeholder="e.g. Uber cab to temple, Lunch dosa, Hotel stay"
                className="w-full bg-[var(--bg-canvas)] border border-[var(--hairline)] p-2 text-[var(--ink-primary)] font-sans text-[13px] focus:outline-none focus:border-[var(--ink-primary)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] text-[var(--ink-secondary)] uppercase mb-1">
                  BUCKET {categoryPinned ? '(MANUAL)' : '(AUTO)'}
                </label>
                <select
                  value={expenseCategory}
                  onChange={(e) => {
                    setExpenseCategory(e.target.value as BucketKey);
                    setCategoryPinned(true);
                  }}
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--hairline)] p-2 text-[var(--ink-primary)] text-[12px] focus:outline-none"
                >
                  <option value="stays">Stays ({activeTrip.budgetSplit.stays}%)</option>
                  <option value="food">Food &amp; Dining ({activeTrip.budgetSplit.food}%)</option>
                  <option value="transit">Local Transit ({activeTrip.budgetSplit.transit}%)</option>
                  <option value="activitiesAndBuffer">Activities ({activeTrip.budgetSplit.activitiesAndBuffer}%)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-[var(--ink-secondary)] uppercase mb-1">
                  AMOUNT (₹ INR)
                </label>
                <input
                  type="number"
                  step="50"
                  value={expenseAmount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--hairline)] p-2 text-[var(--ink-primary)] font-mono focus:outline-none"
                />
              </div>
            </div>

            {travelers.length > 0 && (
              <>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-[var(--ink-secondary)] uppercase mb-1">
                      PAID BY
                    </label>
                    <select
                      value={paidBy}
                      onChange={(e) => setPaidBy(e.target.value)}
                      className="w-full bg-[var(--bg-canvas)] border border-[var(--hairline)] p-2 text-[var(--ink-primary)] text-[12px] focus:outline-none"
                    >
                      {travelers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-[var(--ink-secondary)] uppercase mb-1">
                      SPLIT MODE
                    </label>
                    <div className="grid grid-cols-2 border border-[var(--hairline)] bg-[var(--bg-canvas)] p-0.5">
                      {(['equal', 'custom'] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => handleSwitchSplitMode(m)}
                          className={`py-1.5 text-[11px] uppercase font-bold cursor-pointer ${
                            splitMode === m
                              ? 'bg-[var(--ink-primary)] text-[var(--bg-canvas)]'
                              : 'text-[var(--ink-secondary)]'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Member Checkboxes (Available in BOTH Equal & Custom Modes) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-[var(--ink-muted)] uppercase">
                    <span>
                      INVOLVED MEMBERS ({splitBetween.length}/{travelers.length} SELECTED):
                    </span>
                    {splitMode === 'custom' && (
                      <button
                        type="button"
                        onClick={handleResetEqualSplits}
                        className="text-[var(--ink-primary)] hover:underline font-bold cursor-pointer"
                      >
                        [ RESET EQUAL ]
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {travelers.map((t) => {
                      const checked = splitBetween.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => toggleSplitMember(t.id)}
                          className={`px-2.5 py-1 border text-[11px] cursor-pointer ${
                            checked
                              ? 'bg-[var(--ink-primary)] text-[var(--bg-canvas)] border-[var(--ink-primary)] font-bold'
                              : 'border-[var(--hairline)] text-[var(--ink-secondary)]'
                          }`}
                        >
                          {t.name.split(' ')[0]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {splitMode === 'custom' && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] text-[var(--ink-muted)] uppercase">
                      SEQUENTIAL AUTO-REBALANCING CUSTOM SPLIT (₹ INR):
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {travelers
                        .filter((t) => splitBetween.includes(t.id))
                        .map((t) => {
                          const isLocked = lockedIds.has(t.id);
                          return (
                            <div
                              key={t.id}
                              className={`flex items-center justify-between gap-2 border px-2 py-1 ${
                                isLocked ? 'border-[var(--ink-primary)]' : 'border-[var(--hairline)]'
                              }`}
                            >
                              <span className="text-[11px] truncate">
                                {t.name.split(' ')[0]} {isLocked ? '🔒' : ''}
                              </span>
                              <input
                                type="number"
                                step="any"
                                min={0}
                                value={customSplits[t.id] ?? 0}
                                onChange={(e) => handleCustomMemberEdit(t.id, e.target.value)}
                                className="w-20 bg-[var(--bg-canvas)] border border-[var(--hairline)] px-1.5 py-0.5 text-right text-[11px]"
                              />
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </>
            )}

            <motion.button
              type="submit"
              {...FLUID_GESTURE_TAP}
              transition={FLUID_ISLAND_SPRING}
              className="w-full py-2.5 bg-[var(--ink-primary)] text-[var(--bg-canvas)] font-bold text-[12px] flex items-center justify-center gap-1.5 cursor-pointer hover:opacity-90"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{editingExpenseId ? 'UPDATE EXPENSE [✓]' : 'LOG EXPENSE [+]'}</span>
            </motion.button>
          </form>
        </div>

        <div className={`lg:col-span-7 p-4 border flex flex-col ${panelSurface}`}>
          <div className="flex items-center justify-between text-[11px] text-[var(--ink-muted)] uppercase tracking-widest mb-3 pb-2 border-b border-[var(--hairline)]">
            <span>RECENT REALIZED EXPENSES ({expenses.length} ENTRIES)</span>
            <span className="text-[var(--ink-primary)] font-bold">TOTAL: ₹{totalSpent.toLocaleString()}</span>
          </div>

          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            <AnimatePresence mode="popLayout">
              {expenses.map((item) => {
                const payerName =
                  travelers.find((t) => t.id === item.paidBy)?.name.split(' ')[0] ||
                  travelers[0]?.name.split(' ')[0] ||
                  'Cohort';
                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={FLUID_ISLAND_SPRING}
                    className={`p-3 border flex items-center justify-between gap-2 text-[12px] ${subSurface}`}
                  >
                    <div className="min-w-0">
                      <div className="text-[var(--ink-primary)] font-medium text-[13px] truncate">
                        {item.description}
                      </div>
                      <div className="text-[11px] text-[var(--ink-muted)] uppercase mt-0.5">
                        {item.category} · PAID BY {payerName} ({item.splitMode === 'custom' ? 'CUSTOM' : 'EQUAL'}) · {item.timestamp}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="font-mono text-[var(--ink-primary)] font-bold text-[13px]">
                        ₹{item.amount.toLocaleString()}
                      </div>
                      <button
                        type="button"
                        onClick={() => startEditExpense(item)}
                        className="p-1.5 border border-[var(--hairline)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] cursor-pointer"
                        title="Edit Expense"
                        aria-label={`Edit ${item.description}`}
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteExpense(item.id)}
                        className="p-1.5 border border-[var(--hairline)] text-[var(--ink-secondary)] hover:text-semantic-hazard cursor-pointer"
                        title="Delete Expense"
                        aria-label={`Delete ${item.description}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};
