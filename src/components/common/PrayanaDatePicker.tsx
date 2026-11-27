import React, { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface PrayanaDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (isoDate: string) => void;
  minDate?: string; // YYYY-MM-DD
  ariaLabel?: string;
  className?: string;
}

const WEEKDAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
const MONTHS = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
];

export function getTodayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseIso(iso: string): Date {
  const [y, m, d] = (iso || getTodayIso()).split('-').map(Number);
  return new Date(y || 2026, (m || 1) - 1, d || 1);
}

function toIso(y: number, mZeroIndexed: number, d: number): string {
  return `${y}-${String(mZeroIndexed + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export const PrayanaDatePicker: React.FC<PrayanaDatePickerProps> = ({
  value,
  onChange,
  minDate,
  ariaLabel = 'Select Date',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const initial = parseIso(value);
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const parsed = parseIso(value);
    setViewYear(parsed.getFullYear());
    setViewMonth(parsed.getMonth());
  }, [value]);

  useEffect(() => {
    if (!isOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [isOpen]);

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
  // Monday = 0 ... Sunday = 6
  const startOffset = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const formattedDisplay = (() => {
    const d = parseIso(value);
    return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
  })();

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full bg-[#181818] border border-[rgba(242,240,235,0.18)] hover:border-ink-primary p-2 text-ink-primary font-mono text-[12px] flex items-center justify-between gap-2 cursor-pointer transition-colors"
      >
        <span className="truncate">{formattedDisplay}</span>
        <Calendar className="w-3.5 h-3.5 text-ink-muted shrink-0" />
      </button>

      {isOpen && (
        <div
          className="absolute left-0 top-full mt-1.5 z-50 w-64 p-3 bg-[#141419]/92 [data-theme=light]:bg-[#F4F3EF]/95 backdrop-blur-2xl border border-[rgba(255,255,255,0.22)] shadow-2xl font-mono select-none"
          role="dialog"
          aria-label="Prayana Calendar Picker"
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[rgba(242,240,235,0.14)]">
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="Previous Month"
              className="p-1 text-ink-secondary hover:text-ink-primary cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-bold tracking-wider text-ink-primary">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="Next Month"
              className="p-1 text-ink-secondary hover:text-ink-primary cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[9px] text-ink-muted mb-1">
            {WEEKDAYS.map((wd) => (
              <div key={wd} className="py-0.5">{wd}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px]">
            {Array.from({ length: startOffset }).map((_, idx) => (
              <div key={`empty-${idx}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const iso = toIso(viewYear, viewMonth, day);
              const isDisabled = Boolean(minDate && iso < minDate);
              const isSelected = iso === value;
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => {
                    onChange(iso);
                    setIsOpen(false);
                  }}
                  className={`h-7 flex items-center justify-center transition-colors ${
                    isDisabled
                      ? 'opacity-25 cursor-not-allowed text-ink-muted'
                      : isSelected
                      ? 'bg-ink-primary text-canvas font-bold cursor-pointer'
                      : 'text-ink-primary hover:bg-[rgba(242,240,235,0.14)] cursor-pointer'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
