import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, X, Calendar, MapPin, BookmarkPlus, ArrowRight } from 'lucide-react';
import { usePrayana } from '../../context/PrayanaContext';

export const IncomingTripModal: React.FC = () => {
  const {
    pendingIncomingTrip,
    confirmIncomingTripImport,
    dismissIncomingTripImport,
  } = usePrayana();

  if (!pendingIncomingTrip) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 select-none">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dismissIncomingTripImport}
          className="absolute inset-0 prayana-backdrop"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          data-lenis-prevent
          onClick={(e) => e.stopPropagation()}
          className="relative z-10 w-full max-w-lg max-h-[88vh] overflow-y-auto overscroll-contain prayana-glass border border-[var(--hairline-strong)] p-5 shadow-2xl font-mono text-[12px] text-[var(--ink-primary)] space-y-4"
        >
          <div className="flex items-start justify-between gap-3 border-b border-[var(--hairline)] pb-3">
            <div>
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-semantic-nominal font-bold">
                <QrCode className="w-3.5 h-3.5" />
                <span>OFFLINE P2P SYNC PAYLOAD DECODED</span>
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl text-[var(--ink-primary)] mt-1">
                INCOMING PEER-TO-PEER TRIP
              </h2>
            </div>
            <button
              type="button"
              onClick={dismissIncomingTripImport}
              aria-label="Dismiss incoming trip"
              className="p-1.5 border border-[var(--hairline-strong)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3.5 border border-[var(--hairline)] bg-[var(--bg-surface)] space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] uppercase tracking-widest text-[var(--ink-muted)]">
                DESTINATION
              </span>
              <span className="font-bold text-[var(--ink-primary)]">
                {pendingIncomingTrip.destinationName}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] uppercase tracking-widest text-[var(--ink-muted)]">
                EXPEDITION
              </span>
              <span className="text-[var(--ink-primary)] truncate max-w-[65%] text-right">
                {pendingIncomingTrip.title}
              </span>
            </div>
            {(pendingIncomingTrip.startDate || pendingIncomingTrip.endDate) && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] uppercase tracking-widest text-[var(--ink-muted)] flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>DATES</span>
                </span>
                <span className="text-[var(--ink-secondary)]">
                  {pendingIncomingTrip.startDate || 'TBD'} → {pendingIncomingTrip.endDate || 'TBD'}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] uppercase tracking-widest text-[var(--ink-muted)] flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span>STOPS · DURATION · BUDGET</span>
              </span>
              <span className="text-[var(--ink-primary)] font-bold">
                {pendingIncomingTrip.stops.length} STOPS · {pendingIncomingTrip.totalDays}D · ₹
                {pendingIncomingTrip.totalBudget.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {pendingIncomingTrip.stops.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase tracking-widest text-[var(--ink-muted)]">
                INCLUDED STOPS PREVIEW
              </div>
              <div className="max-h-40 overflow-y-auto overscroll-contain space-y-1 pr-1" data-lenis-prevent>
                {pendingIncomingTrip.stops.map((s, idx) => (
                  <div
                    key={s.id || idx}
                    className="flex items-center justify-between px-2.5 py-1.5 border border-[var(--hairline)] bg-[var(--bg-surface)] text-[11px]"
                  >
                    <span className="truncate pr-2">
                      <span className="text-[var(--ink-muted)] mr-1.5">
                        D{String(s.day || 1).padStart(2, '0')}
                      </span>
                      {s.title}
                    </span>
                    <span className="text-[10px] text-[var(--ink-muted)] shrink-0">
                      {s.dwellMinutes}M
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-[var(--hairline)]">
            <button
              type="button"
              onClick={() => void confirmIncomingTripImport('SAVE')}
              className="px-3.5 py-2 border border-[var(--hairline-strong)] bg-[var(--bg-surface)] text-[var(--ink-primary)] hover:border-[var(--ink-primary)] font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              <span>[ ADD TO SAVED TRIPS ]</span>
            </button>
            <button
              type="button"
              onClick={() => void confirmIncomingTripImport('ACTIVATE')}
              className="px-4 py-2 border border-[var(--ink-primary)] bg-[var(--ink-primary)] text-[var(--bg-canvas)] font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>[ OPEN AS ACTIVE ITINERARY ]</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
