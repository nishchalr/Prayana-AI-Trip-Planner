import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Home, Users, Sparkles, Sun, Moon, Menu, X } from 'lucide-react';
import { usePrayana } from '../../context/PrayanaContext';

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
 * - On HOME (`GALLERY_HOME`): 4-icon rail open by default, NO background dimming.
 * - On ITINERARY / CO-TRAVELLERS / MY PROFILE: curled into a `w-9 h-9` 3-line toggle;
 *   when curled open, all 4 rail boxes extend uniformly to `w-[152px]` with GPU-only GSAP motion.
 * - Single quick tap on any icon (including PRAYANA AI) triggers immediately.
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
  const coTravellersCount = travelers.filter((t) => !t.isPrimarySelf).length;

  const [expandedId, setExpandedId] = useState<RailItemId | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);
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
      label: `CO-TRAVELLERS (${coTravellersCount})`,
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

  // GPU-only GSAP curl-open animation (zero width/height layout thrash)
  useEffect(() => {
    if (!showRail) return;
    if (railRef.current && !isHome) {
      gsap.fromTo(
        railRef.current,
        { opacity: 0, y: -10, scaleY: 0.84, transformOrigin: 'top right' },
        { opacity: 1, y: 0, scaleY: 1, duration: 0.16, ease: 'power3.out', force3D: true, clearProps: 'transform' }
      );
    }
    if (backdropRef.current && !isHome) {
      gsap.fromTo(
        backdropRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.16, ease: 'power3.out' }
      );
    }
  }, [showRail, isHome]);

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
      if (dist > 28 && !g.isLongPress) {
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
        const targetId = resolveHoveredId(e.clientX, e.clientY) ?? g.currentId;
        if (targetId) {
          setExpandedId(targetId);
          itemsRef.current.find((item) => item.id === targetId)?.execute();
          scheduleCollapse(220);
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
          scheduleCollapse(240);
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
      {/* Subtle 85-95% Backdrop ONLY when curled-open on non-HOME pages */}
      {!isHome && isMobileRailOpen && (
        <div
          ref={backdropRef}
          onClick={() => setIsMobileRailOpen(false)}
          className="fixed inset-0 z-30 prayana-backdrop lg:hidden"
        />
      )}

      {/* Curled 3-line Toggle Button on non-HOME non-ITINERARY views */}
      {!isHome && !isItinerary && (
        <button
          type="button"
          onClick={toggleMobileRail}
          aria-label={isMobileRailOpen ? 'Collapse Quick Actions' : 'Expand Quick Actions'}
          aria-expanded={isMobileRailOpen}
          className="fixed right-3 top-[60px] z-20 w-9 h-9 flex items-center justify-center border prayana-glass text-[var(--ink-primary)] hover:border-[var(--ink-primary)] shadow-lg lg:hidden cursor-pointer transform-gpu"
        >
          {isMobileRailOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      )}

      {/* Expanding 4-Icon Rail */}
      {showRail && (
        <div
          ref={railRef}
          role="toolbar"
          aria-label="Quick Mobile Navigation Rail"
          data-lenis-prevent
          onContextMenu={(e) => e.preventDefault()}
          style={{ WebkitTouchCallout: 'none', touchAction: 'none' }}
          className={`fixed right-3 z-40 flex flex-col items-end gap-2 lg:hidden select-none touch-none pointer-events-none transform-gpu ${
            isHome ? 'top-[132px]' : isItinerary ? 'top-[158px]' : 'top-[104px]'
          }`}
        >
          {items.map((item) => {
            const Icon = item.icon;
            const isExpanded = expandedId === item.id;

            // On non-HOME curled-open rail, all 4 boxes extend uniformly to w-[152px]
            if (!isHome) {
              return (
                <button
                  key={item.id}
                  ref={(el) => {
                    buttonRefs.current[item.id] = el;
                  }}
                  type="button"
                  aria-label={item.label}
                  onClick={() => item.execute()}
                  className={`pointer-events-auto w-[152px] h-10 px-3 flex items-center justify-between border shadow-lg cursor-pointer transform-gpu font-mono text-[10px] font-bold tracking-wider uppercase ${
                    item.isActive
                      ? 'bg-[var(--ink-primary)] text-[var(--bg-canvas)] border-[var(--ink-primary)]'
                      : 'prayana-glass text-[var(--ink-primary)] hover:border-[var(--ink-primary)]'
                  }`}
                >
                  <span className="truncate">{item.label}</span>
                  <Icon className="w-4 h-4 shrink-0" />
                </button>
              );
            }

            return (
              <div key={item.id} className="relative flex items-center justify-end pointer-events-auto">
                <span
                  aria-hidden={!isExpanded}
                  style={{
                    transform: isExpanded ? 'translate3d(0, 0, 0) scale(1)' : 'translate3d(10px, 0, 0) scale(0.96)',
                    opacity: isExpanded ? 1 : 0,
                    transition: 'transform 150ms cubic-bezier(0.22, 1, 0.36, 1), opacity 130ms ease-out',
                  }}
                  className="pointer-events-none absolute right-full mr-1.5 h-10 px-3 flex items-center whitespace-nowrap border prayana-glass text-[var(--ink-primary)] font-mono text-[11px] font-bold tracking-wider uppercase shadow-lg transform-gpu"
                >
                  {item.label}
                </span>

                <button
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
                      scheduleCollapse(260);
                    }
                  }}
                  style={{
                    WebkitTouchCallout: 'none',
                    touchAction: 'none',
                    transform: isExpanded ? 'translate3d(0,0,0) scale(1.04)' : 'translate3d(0,0,0) scale(1)',
                    transition: 'transform 140ms cubic-bezier(0.22, 1, 0.36, 1)',
                  }}
                  className={`w-10 h-10 flex items-center justify-center border shadow-lg cursor-pointer transform-gpu ${
                    item.isActive
                      ? 'bg-[var(--ink-primary)] text-[var(--bg-canvas)] border-[var(--ink-primary)]'
                      : 'prayana-glass text-[var(--ink-primary)] hover:border-[var(--ink-primary)]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};
