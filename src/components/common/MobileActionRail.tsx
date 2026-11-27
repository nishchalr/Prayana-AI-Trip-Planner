import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Home, Users, Sparkles, Sun, Moon } from 'lucide-react';
import { usePrayana } from '../../context/PrayanaContext';
import { FLUID_SPRING } from '../../motion/fluidTokens';

type RailItemId = 'HOME' | 'PROFILES' | 'PRAYANA_AI' | 'THEME';

interface RailItem {
  id: RailItemId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  execute: () => void;
}

/**
 * Overlaid mobile/tablet (< lg) right-edge quick-action rail.
 * Positioned fixed so the 3D monument canvas is never resized or compressed.
 * Supports:
 *  - Quick Tap (< 260ms): expands pill leftward and immediately triggers action.
 *  - Long Press (>= 260ms) + Vertical Slide: previews hovered pill leftward while sliding,
 *    collapses previous pill smoothly, and triggers the released icon on pointer up.
 */
export const MobileActionRail: React.FC = () => {
  const {
    activeView,
    setActiveView,
    setActiveStopId,
    isCopilotDrawerOpen,
    setIsCopilotDrawerOpen,
    theme,
    toggleTheme,
    travelers,
  } = usePrayana();

  const [expandedId, setExpandedId] = useState<RailItemId | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);
  const buttonRefs = useRef<Record<RailItemId, HTMLButtonElement | null>>({
    HOME: null,
    PROFILES: null,
    PRAYANA_AI: null,
    THEME: null,
  });

  const longPressTimerRef = useRef<number | null>(null);
  const collapseTimerRef = useRef<number | null>(null);
  const gestureRef = useRef<{
    active: boolean;
    pointerId: number;
    startId: RailItemId;
    currentId: RailItemId;
    isLongPress: boolean;
    startX: number;
    startY: number;
    movedOutsideTap: boolean;
  } | null>(null);

  const items: RailItem[] = [
    {
      id: 'HOME',
      label: 'HOME',
      icon: Home,
      isActive: activeView === 'GALLERY_HOME' && !isCopilotDrawerOpen,
      execute: () => {
        setActiveStopId(null);
        setActiveView('GALLERY_HOME');
      },
    },
    {
      id: 'PROFILES',
      label: `PROFILES (${travelers.length})`,
      icon: Users,
      isActive: activeView === 'PROFILES' && !isCopilotDrawerOpen,
      execute: () => {
        setActiveStopId(null);
        setActiveView('PROFILES');
      },
    },
    {
      id: 'PRAYANA_AI',
      label: 'PRAYANA AI',
      icon: Sparkles,
      isActive: isCopilotDrawerOpen,
      execute: () => {
        setIsCopilotDrawerOpen(true);
      },
    },
    {
      id: 'THEME',
      label: theme === 'dark' ? 'LIGHT MODE' : 'DARK MODE',
      icon: theme === 'dark' ? Sun : Moon,
      isActive: false,
      execute: () => {
        toggleTheme();
      },
    },
  ];

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
      if (collapseTimerRef.current) window.clearTimeout(collapseTimerRef.current);
    };
  }, []);

  const clearTimers = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (collapseTimerRef.current) {
      window.clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
  };

  const resolveHoveredId = (clientX: number, clientY: number): RailItemId | null => {
    const railRect = railRef.current?.getBoundingClientRect();
    if (railRect) {
      // Allow generous leftward horizontal leeway when labels are expanded, cancel if slid far away
      if (clientX < railRect.left - 180 || clientX > railRect.right + 48) {
        return null;
      }
    }

    const order: RailItemId[] = ['HOME', 'PROFILES', 'PRAYANA_AI', 'THEME'];
    for (const id of order) {
      const el = buttonRefs.current[id];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (clientY >= rect.top - 4 && clientY <= rect.bottom + 4) {
        return id;
      }
    }

    // Clamp softly to top/bottom item when finger stays close vertically inside rail column
    const firstRect = buttonRefs.current.HOME?.getBoundingClientRect();
    const lastRect = buttonRefs.current.THEME?.getBoundingClientRect();
    if (firstRect && clientY < firstRect.top && clientY >= firstRect.top - 28) return 'HOME';
    if (lastRect && clientY > lastRect.bottom && clientY <= lastRect.bottom + 28) return 'THEME';
    return null;
  };

  const scheduleCollapse = (delayMs: number) => {
    if (collapseTimerRef.current) window.clearTimeout(collapseTimerRef.current);
    collapseTimerRef.current = window.setTimeout(() => {
      setExpandedId(null);
    }, delayMs);
  };

  const handleRailPointerDown = (itemId: RailItemId, e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    clearTimers();

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore if capture unsupported
    }

    gestureRef.current = {
      active: true,
      pointerId: e.pointerId,
      startId: itemId,
      currentId: itemId,
      isLongPress: false,
      startX: e.clientX,
      startY: e.clientY,
      movedOutsideTap: false,
    };

    longPressTimerRef.current = window.setTimeout(() => {
      const g = gestureRef.current;
      if (!g || !g.active) return;
      g.isLongPress = true;
      setExpandedId(g.currentId);
    }, 260);
  };

  const handleRailPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gestureRef.current;
    if (!g || !g.active) return;
    e.stopPropagation();

    const dist = Math.hypot(e.clientX - g.startX, e.clientY - g.startY);
    if (dist > 14 && !g.isLongPress) {
      g.movedOutsideTap = true;
    }

    if (g.isLongPress) {
      const hovered = resolveHoveredId(e.clientX, e.clientY);
      if (hovered && hovered !== g.currentId) {
        g.currentId = hovered;
        setExpandedId(hovered);
      } else if (!hovered && expandedId !== null) {
        setExpandedId(null);
      }
    }
  };

  const handleRailPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gestureRef.current;
    gestureRef.current = null;
    clearTimers();
    if (!g || !g.active) return;
    e.stopPropagation();

    try {
      if (e.currentTarget.hasPointerCapture(g.pointerId)) {
        e.currentTarget.releasePointerCapture(g.pointerId);
      }
    } catch {
      // ignore
    }

    if (g.isLongPress) {
      const targetId = resolveHoveredId(e.clientX, e.clientY);
      if (targetId) {
        setExpandedId(targetId);
        const match = items.find((item) => item.id === targetId);
        match?.execute();
        scheduleCollapse(260);
      } else {
        setExpandedId(null);
      }
      return;
    }

    // Quick Tap (< 260ms)
    if (!g.movedOutsideTap) {
      const target = items.find((item) => item.id === g.startId);
      if (target) {
        setExpandedId(target.id);
        target.execute();
        scheduleCollapse(380);
      }
    } else {
      setExpandedId(null);
    }
  };

  const handleRailPointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    gestureRef.current = null;
    clearTimers();
    setExpandedId(null);
    e.stopPropagation();
  };

  return (
    <div
      ref={railRef}
      role="toolbar"
      aria-label="Quick Mobile Navigation Rail"
      data-lenis-prevent
      onPointerMove={handleRailPointerMove}
      onPointerUp={handleRailPointerUp}
      onPointerCancel={handleRailPointerCancel}
      className="fixed right-3 top-[132px] z-30 flex flex-col items-end gap-2 lg:hidden select-none touch-none pointer-events-none"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isExpanded = expandedId === item.id;
        return (
          <motion.button
            key={item.id}
            ref={(el) => {
              buttonRefs.current[item.id] = el;
            }}
            type="button"
            aria-label={item.label}
            title={item.label}
            onPointerDown={(e) => {
              e.stopPropagation();
              // Forward to rail wrapper so pointer capture handles cross-button vertical slide
              if (railRef.current) {
                handleRailPointerDown(item.id, {
                  ...e,
                  currentTarget: railRef.current,
                } as React.PointerEvent<HTMLDivElement>);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setExpandedId(item.id);
                item.execute();
                scheduleCollapse(380);
              }
            }}
            animate={{ scale: isExpanded ? 1.03 : 1 }}
            transition={FLUID_SPRING}
            className={`pointer-events-auto h-10 min-w-10 flex items-center justify-end border backdrop-blur-md transition-colors cursor-pointer shadow-lg transform-gpu ${
              item.isActive
                ? 'bg-[var(--ink-primary)] text-[var(--bg-canvas)] border-[var(--ink-primary)]'
                : 'bg-[var(--bg-surface)]/95 text-[var(--ink-primary)] border-[var(--hairline-strong)] hover:border-[var(--ink-primary)]'
            }`}
          >
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.span
                  key={`${item.id}-label`}
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 'auto', opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={FLUID_SPRING}
                  className="overflow-hidden whitespace-nowrap pl-3 pr-0.5 font-mono text-[11px] font-bold tracking-wider uppercase"
                >
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>
            <span className="w-10 h-10 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4" />
            </span>
          </motion.button>
        );
      })}
    </div>
  );
};
