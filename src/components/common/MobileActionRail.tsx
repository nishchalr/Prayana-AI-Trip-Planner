import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Home, Users, Sparkles, Sun, Moon, Menu, X } from 'lucide-react';
import { usePrayana } from '../../context/PrayanaContext';
import { FLUID_BACKDROP_TRANSITION, FLUID_SPRING } from '../../motion/fluidTokens';

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
 * - On HOME (`GALLERY_HOME`): open by default, NO background dimming.
 * - On ITINERARY / PROFILES / other non-HOME views: curled/collapsed by default into a
 *   single `w-9 h-9` 3-line toggle button (inline in Itinerary's sub-tab row, top-right on Profiles).
 *   When curled open, renders frosted-glass 4-icon rail overlapping top-right + dims background.
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
    isMobileRailOpen,
    setIsMobileRailOpen,
    toggleMobileRail,
  } = usePrayana();

  const isHome = activeView === 'GALLERY_HOME';
  const isItinerary = activeView === 'ITINERARY_OUTPUT';
  const showRail = isHome || isMobileRailOpen;

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
        setIsMobileRailOpen(false);
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
        setIsMobileRailOpen(false);
      },
    },
    {
      id: 'PRAYANA_AI',
      label: 'PRAYANA AI',
      icon: Sparkles,
      isActive: isCopilotDrawerOpen,
      execute: () => {
        setIsCopilotDrawerOpen(true);
        setIsMobileRailOpen(false);
      },
    },
    {
      id: 'THEME',
      label: theme === 'dark' ? 'LIGHT MODE' : 'DARK MODE',
      icon: theme === 'dark' ? Sun : Moon,
      isActive: false,
      execute: () => {
        toggleTheme();
        setIsMobileRailOpen(false);
      },
    },
  ];

  const itemsRef = useRef<RailItem[]>(items);
  itemsRef.current = items;

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

  const scheduleCollapse = (delayMs: number) => {
    if (collapseTimerRef.current) window.clearTimeout(collapseTimerRef.current);
    collapseTimerRef.current = window.setTimeout(() => {
      setExpandedId(null);
    }, delayMs);
  };

  const resolveHoveredId = (clientX: number, clientY: number): RailItemId | null => {
    const railRect = railRef.current?.getBoundingClientRect();
    if (railRect) {
      if (clientX < railRect.left - 190 || clientX > railRect.right + 48) {
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

    const firstRect = buttonRefs.current.HOME?.getBoundingClientRect();
    const lastRect = buttonRefs.current.THEME?.getBoundingClientRect();
    if (firstRect && clientY < firstRect.top && clientY >= firstRect.top - 28) return 'HOME';
    if (lastRect && clientY > lastRect.bottom && clientY <= lastRect.bottom + 28) return 'THEME';
    return null;
  };

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      const g = gestureRef.current;
      if (!g || !g.active) return;

      const dist = Math.hypot(e.clientX - g.startX, e.clientY - g.startY);
      if (dist > 16 && !g.isLongPress) {
        g.movedOutsideTap = true;
      }

      if (g.isLongPress) {
        const hovered = resolveHoveredId(e.clientX, e.clientY);
        if (hovered && hovered !== g.currentId) {
          g.currentId = hovered;
          setExpandedId(hovered);
        } else if (!hovered) {
          setExpandedId(null);
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const g = gestureRef.current;
      if (!g || !g.active) return;
      gestureRef.current = null;
      clearTimers();

      if (g.isLongPress) {
        const targetId = resolveHoveredId(e.clientX, e.clientY);
        if (targetId) {
          setExpandedId(targetId);
          itemsRef.current.find((item) => item.id === targetId)?.execute();
          scheduleCollapse(260);
        } else {
          setExpandedId(null);
        }
        return;
      }

      if (!g.movedOutsideTap) {
        const target = itemsRef.current.find((item) => item.id === g.startId);
        if (target) {
          setExpandedId(target.id);
          target.execute();
          scheduleCollapse(380);
        }
      } else {
        setExpandedId(null);
      }
    };

    const onPointerCancel = () => {
      if (!gestureRef.current?.active) return;
      gestureRef.current = null;
      clearTimers();
      setExpandedId(null);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);

    return () => {
      clearTimers();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
    };
  }, []);

  const handleButtonPointerDown = (
    itemId: RailItemId,
    e: React.PointerEvent<HTMLButtonElement>
  ) => {
    e.stopPropagation();
    clearTimers();

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

  return (
    <>
      {/* Dimmed Backdrop ONLY when curled-open on non-HOME pages */}
      <AnimatePresence>
        {!isHome && isMobileRailOpen && (
          <motion.div
            key="mobile-rail-dim-backdrop"
            {...FLUID_BACKDROP_TRANSITION}
            onClick={() => setIsMobileRailOpen(false)}
            className="fixed inset-0 z-30 bg-black/45 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Curled 3-line Toggle Button on non-HOME non-ITINERARY views (e.g. PROFILES) */}
      {!isHome && !isItinerary && (
        <button
          type="button"
          onClick={toggleMobileRail}
          aria-label={isMobileRailOpen ? 'Collapse Quick Actions' : 'Expand Quick Actions'}
          aria-expanded={isMobileRailOpen}
          className="fixed right-3 top-[60px] z-20 w-9 h-9 flex items-center justify-center border border-[var(--hairline-strong)] prayana-glass text-[var(--ink-primary)] hover:border-[var(--ink-primary)] shadow-lg lg:hidden cursor-pointer"
        >
          {isMobileRailOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      )}

      {/* Expanding 4-Icon Rail */}
      <AnimatePresence>
        {showRail && (
          <motion.div
            ref={railRef}
            role="toolbar"
            aria-label="Quick Mobile Navigation Rail"
            data-lenis-prevent
            onContextMenu={(e) => e.preventDefault()}
            style={{ WebkitTouchCallout: 'none', touchAction: 'none' }}
            initial={!isHome ? { opacity: 0, scale: 0.88, y: -8 } : false}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={!isHome ? { opacity: 0, scale: 0.88, y: -8 } : undefined}
            transition={FLUID_SPRING}
            className={`fixed right-3 z-40 flex flex-col items-end gap-2 lg:hidden select-none touch-none pointer-events-none ${
              isHome ? 'top-[132px]' : isItinerary ? 'top-[158px]' : 'top-[104px]'
            }`}
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
                  onTouchStart={(e) => e.stopPropagation()}
                  onContextMenu={(e) => e.preventDefault()}
                  onPointerDown={(e) => handleButtonPointerDown(item.id, e)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setExpandedId(item.id);
                      item.execute();
                      scheduleCollapse(380);
                    }
                  }}
                  style={{ WebkitTouchCallout: 'none', touchAction: 'none' }}
                  animate={{ scale: isExpanded ? 1.03 : 1 }}
                  transition={FLUID_SPRING}
                  className={`pointer-events-auto h-10 min-w-[40px] flex items-center justify-end overflow-hidden border transition-colors cursor-pointer shadow-lg transform-gpu ${
                    item.isActive
                      ? 'bg-[var(--ink-primary)] text-[var(--bg-canvas)] border-[var(--ink-primary)]'
                      : 'prayana-glass text-[var(--ink-primary)] border-[var(--hairline-strong)] hover:border-[var(--ink-primary)]'
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
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
