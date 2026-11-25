import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { usePrayana } from '../../../context/PrayanaContext';
import { PopButton } from '../../ui/InteractivePrimitives';
import { FLUID_SPRING, FLUID_HOVER, FLUID_TAP } from '../../../motion/fluidTokens';
import { AlertTriangle, Plus, CreditCard } from 'lucide-react';

export const BudgetPage: React.FC = () => {
  const {
    expenses,
    addExpense,
    isOverspent,
    netOverspend,
    compensatoryRebalance,
    rebalanceApplied,
    activeTrip,
    theme,
  } = usePrayana();
  const isLight = theme === 'light';

  const [expenseCategory, setExpenseCategory] = useState<'stays' | 'food' | 'transit' | 'activitiesAndBuffer'>('food');
  const [expenseAmount, setExpenseAmount] = useState<number>(1200);
  const [expenseDesc, setExpenseDesc] = useState<string>('');

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (expenseAmount <= 0) return;
    addExpense({
      category: expenseCategory,
      amount: expenseAmount,
      description: expenseDesc.trim() || `${expenseCategory.toUpperCase()} Entry`,
      dayIndex: 1,
    });
    setExpenseDesc('');
    setExpenseAmount(1000);
  };

  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const remainingBudget = activeTrip.totalBudget - totalSpent;

  return (
    <div className="w-full space-y-5 pb-12 font-mono text-[11px] select-none">
      {/* Sub-view Header */}
      <div className="p-4 bg-[#121212] border border-[rgba(242,240,235,0.12)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center space-x-2.5">
          <CreditCard className="w-4 h-4 text-ink-primary shrink-0" />
          <div>
            <div className="text-[10px] font-bold text-ink-primary uppercase tracking-widest">
              LIVE BUDGET & EQ. 5.2 REBALANCING // 4-BUCKET LEDGER
            </div>
            <div className="text-[9px] text-ink-secondary">
              Allocated Cohort Cap: ₹{activeTrip.totalBudget.toLocaleString()} · Realized Spend: ₹{totalSpent.toLocaleString()}
            </div>
          </div>
        </div>
        <div className="text-[9px] uppercase">
          REMAINING:{' '}
          <span className={remainingBudget < 0 ? 'text-semantic-hazard font-bold' : 'text-semantic-nominal font-bold'}>
            ₹{remainingBudget.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Overspend Alert Banner */}
      {isOverspent && (
        <div
          className={`p-4 border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
            isLight
              ? 'bg-red-50 border-red-300 text-red-900'
              : 'bg-[#251515] border-semantic-hazard text-semantic-hazard'
          }`}
        >
          <div className="flex items-start space-x-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-[10px]">
                NET GROUP OVERSPEND DETECTED: +₹{netOverspend.toLocaleString()} (DAY 01)
              </div>
              <div
                className={`text-[10px] mt-0.5 font-sans ${
                  isLight ? 'text-red-800/80' : 'text-ink-secondary'
                }`}
              >
                Realized spend exceeds planned daily velocity. Trimming rule (Eq 5.2) targets activities (50%) and dining (30%) to protect local transit (5%).
              </div>
            </div>
          </div>

          {isLight ? (
            <motion.button
              onClick={compensatoryRebalance}
              disabled={rebalanceApplied}
              whileHover={rebalanceApplied ? undefined : FLUID_HOVER}
              whileTap={rebalanceApplied ? undefined : FLUID_TAP}
              transition={FLUID_SPRING}
              className="shrink-0 px-4 py-2 text-[11px] font-mono tracking-widest uppercase bg-red-700 text-white hover:bg-red-800 border border-red-800 font-bold transition-colors duration-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {rebalanceApplied ? '✓ RE-PLAN COMMITTED' : 'COMPENSATORY RE-PLAN [+]'}
            </motion.button>
          ) : (
            <PopButton
              onClick={compensatoryRebalance}
              disabled={rebalanceApplied}
              variant="danger"
              size="md"
              className="shrink-0"
            >
              {rebalanceApplied ? '✓ RE-PLAN COMMITTED' : 'COMPENSATORY RE-PLAN [+]'}
            </PopButton>
          )}
        </div>
      )}

      {rebalanceApplied && (
        <div
          className={`p-3 border text-[10px] flex flex-wrap items-center justify-between gap-2 ${
            isLight
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-[#172018] border-semantic-nominal/60 text-semantic-nominal'
          }`}
        >
          <span>
            ✓ COMPENSATORY RE-PLAN APPLIED: Replaced paid monument tickets with free panoramic viewpoints & rebalanced 4-bucket targets.
          </span>
          <span className="font-bold">ω REBALANCE ACTIVE</span>
        </div>
      )}

      {/* Full-Width 4-Bucket Allocation Cards (12-Col Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {(
          [
            { key: 'stays' as const, label: 'STAYS', pct: activeTrip.budgetSplit.stays, dailyTarget: activeTrip.rebalanceTargets?.stays },
            { key: 'food' as const, label: 'FOOD & DINING', pct: activeTrip.budgetSplit.food, dailyTarget: activeTrip.rebalanceTargets?.food },
            { key: 'transit' as const, label: 'LOCAL TRANSIT', pct: activeTrip.budgetSplit.transit, dailyTarget: activeTrip.rebalanceTargets?.transit },
            { key: 'activitiesAndBuffer' as const, label: 'ACTIVITIES & BUFFER', pct: activeTrip.budgetSplit.activitiesAndBuffer, dailyTarget: activeTrip.rebalanceTargets?.activities },
          ]
        ).map(bucket => {
          const bucketCap = Math.round((activeTrip.totalBudget * bucket.pct) / 100);
          const bucketSpent = expenses
            .filter(ex => ex.category === bucket.key)
            .reduce((acc, ex) => acc + ex.amount, 0);
          const utilPct = Math.min(100, Math.round((bucketSpent / Math.max(1, bucketCap)) * 100));
          const isOver = bucketSpent > bucketCap;

          return (
            <div key={bucket.key} className="p-4 bg-[#161616] border border-[rgba(242,240,235,0.12)]">
              <div className="flex items-center justify-between text-[9px] text-ink-muted">
                <span>{bucket.label}</span>
                <span className="font-bold text-ink-primary">{bucket.pct}% ALLOCATED</span>
              </div>
              <div className="mt-2 flex items-baseline justify-between font-mono text-sm">
                <span className={isOver ? 'text-semantic-hazard font-bold' : 'text-ink-primary font-bold'}>
                  ₹{bucketSpent.toLocaleString()}
                </span>
                <span className="text-[10px] text-ink-muted">
                  / ₹{bucketCap.toLocaleString()}
                </span>
              </div>
              <div className="w-full h-1.5 bg-[#222222] mt-2 overflow-hidden">
                <div
                  className={`h-full transition-colors duration-150 ${isOver ? 'bg-semantic-hazard' : 'bg-ink-primary'}`}
                  style={{ width: `${utilPct}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[8px]">
                <span className="text-ink-muted">{utilPct}% UTILIZED</span>
                {typeof bucket.dailyTarget === 'number' && (
                  <span className="text-semantic-nominal font-bold">
                    DAILY TARGET: ₹{Math.round(bucket.dailyTarget).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 12-Column Quick Expense Logger + Spacious Realized Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4 p-4 bg-[#161616] border border-[rgba(242,240,235,0.12)]">
          <div className="text-[9px] text-ink-muted uppercase tracking-widest mb-3 pb-2 border-b border-[rgba(242,240,235,0.08)]">
            QUICK EXPENSE LOGGER
          </div>
          <form onSubmit={handleAddExpense} className="space-y-3">
            <div>
              <label className="block text-[9px] text-ink-secondary uppercase mb-1">
                BUDGET BUCKET
              </label>
              <select
                value={expenseCategory}
                onChange={(e) => setExpenseCategory(e.target.value as any)}
                className="w-full bg-[#1A1A1A] border border-[rgba(242,240,235,0.15)] p-2 text-ink-primary text-xs focus:outline-none"
              >
                <option value="stays">Stays ({activeTrip.budgetSplit.stays}%)</option>
                <option value="food">Food & Dining ({activeTrip.budgetSplit.food}%)</option>
                <option value="transit">Local Transit ({activeTrip.budgetSplit.transit}%)</option>
                <option value="activitiesAndBuffer">Activities & Buffer ({activeTrip.budgetSplit.activitiesAndBuffer}%)</option>
              </select>
            </div>

            <div>
              <label className="block text-[9px] text-ink-secondary uppercase mb-1">
                AMOUNT (₹ INR)
              </label>
              <input
                type="number"
                step="100"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(Number(e.target.value))}
                className="w-full bg-[#1A1A1A] border border-[rgba(242,240,235,0.15)] p-2 text-ink-primary font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[9px] text-ink-secondary uppercase mb-1">
                DESCRIPTION
              </label>
              <input
                type="text"
                value={expenseDesc}
                onChange={(e) => setExpenseDesc(e.target.value)}
                placeholder="e.g. Coconut water & coracle tip"
                className="w-full bg-[#1A1A1A] border border-[rgba(242,240,235,0.15)] p-2 text-ink-primary font-sans text-xs focus:outline-none"
              />
            </div>

            <PopButton
              type="submit"
              size="md"
              className="w-full flex items-center justify-center gap-1.5 !bg-ink-primary !text-[#0E0E0E] hover:!bg-white"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>LOG EXPENSE [+]</span>
            </PopButton>
          </form>
        </div>

        <div className="lg:col-span-8 p-4 bg-[#161616] border border-[rgba(242,240,235,0.12)] flex flex-col">
          <div className="flex items-center justify-between text-[9px] text-ink-muted uppercase tracking-widest mb-3 pb-2 border-b border-[rgba(242,240,235,0.08)]">
            <span>RECENT REALIZED EXPENSES ({expenses.length} ENTRIES)</span>
            <span className="text-ink-primary font-bold">TOTAL: ₹{totalSpent.toLocaleString()}</span>
          </div>

          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {expenses.map(e => (
              <div
                key={e.id}
                className="p-3 bg-[#1A1A1A] border border-[rgba(242,240,235,0.08)] flex items-center justify-between text-[10px]"
              >
                <div>
                  <div className="text-ink-primary font-medium text-xs">{e.description}</div>
                  <div className="text-[8px] text-ink-muted uppercase mt-0.5">
                    {e.category} · {e.timestamp}
                  </div>
                </div>
                <div className="font-mono text-ink-primary font-bold text-xs">
                  ₹{e.amount.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
