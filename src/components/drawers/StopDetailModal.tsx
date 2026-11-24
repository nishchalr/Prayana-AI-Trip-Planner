import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePrayana } from '../../context/PrayanaContext';
import { X, Mountain, Clock, MapPin, CheckCircle, Bookmark, Plus } from 'lucide-react';

export const StopDetailModal: React.FC = () => {
  const { 
    activeStop, 
    setActiveStopId, 
    activeTraveler, 
    setIsItineraryOpen,
    wishlistIds,
    toggleWishlist,
    insertStopIntoRoute,
    setActiveView,
    activeView
  } = usePrayana();

  // ONLY render modal when user is in GALLERY_HOME and explicitly clicked a stop!
  // In WORKSPACE, the inline inspector in DualModeRouteMap handles stop inspection.
  if (!activeStop || activeView !== 'GALLERY_HOME') return null;

  const safeWishlist = Array.isArray(wishlistIds) ? wishlistIds : [];
  const isWishlisted = safeWishlist.includes(activeStop.id);

  const handleInsert = () => {
    insertStopIntoRoute(activeStop);
    setActiveStopId(null);
    setActiveView('ITINERARY_OUTPUT');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setActiveStopId(null)}
          className="absolute inset-0 bg-black/80 backdrop-blur-xs"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          className="relative z-10 w-full max-w-lg bg-[#141414] border border-[rgba(242,240,235,0.2)] p-6 shadow-2xl flex flex-col font-mono text-[11px] text-ink-primary"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[rgba(242,240,235,0.1)] pb-3 mb-4">
            <div>
              <div className="text-[9px] text-ink-secondary tracking-widest uppercase">
                STOP NODE 0{activeStop.index} // ARCHITECTURAL INSPECTOR
              </div>
              <h3 className="font-serif text-3xl text-ink-primary tracking-tight mt-0.5">
                {activeStop.title}
              </h3>
              <div className="text-[10px] text-ink-secondary">
                {activeStop.subtitle}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => toggleWishlist(activeStop.id)}
                className={`p-1.5 border transition-colors cursor-pointer ${
                  isWishlisted 
                    ? 'border-ink-primary bg-ink-primary text-canvas' 
                    : 'border-[rgba(242,240,235,0.14)] text-ink-secondary hover:text-ink-primary'
                }`}
                title={isWishlisted ? 'Saved in Bucket List' : 'Bookmark to Bucket List'}
              >
                <Bookmark className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setActiveStopId(null)}
                className="p-1.5 hover:bg-[#202020] transition-colors border border-[rgba(242,240,235,0.14)] cursor-pointer"
              >
                <X className="w-4 h-4 text-ink-secondary hover:text-ink-primary" />
              </button>
            </div>
          </div>

          {/* Description */}
          <p className="font-sans text-xs text-ink-secondary leading-relaxed mb-4">
            {activeStop.description}
          </p>

          {/* Architectural Terrain & Bio-Effort Grid */}
          <div className="grid grid-cols-3 gap-2 p-3 bg-[#181818] border border-[rgba(242,240,235,0.08)] mb-4 text-center">
            <div>
              <div className="text-[8px] text-ink-muted uppercase">ELEVATION GAIN</div>
              <div className="font-mono text-base font-bold text-ink-primary mt-0.5">
                +{activeStop.elevationDeltaM}m
              </div>
              <div className="text-[8px] text-ink-muted">SLOPE {activeStop.slopeDeg}°</div>
            </div>

            <div>
              <div className="text-[8px] text-ink-muted uppercase">DWELL TIME</div>
              <div className="font-mono text-base font-bold text-ink-primary mt-0.5">
                {activeStop.dwellMinutes}m
              </div>
              <div className="text-[8px] text-ink-muted">{activeStop.optimalTime}</div>
            </div>

            <div>
              <div className="text-[8px] text-ink-muted uppercase">STRAIN LEVEL</div>
              <div className="font-mono text-base font-bold mt-0.5">
                <span className={
                  activeStop.effortRating === 'ELEVATED' ? 'text-semantic-hazard' :
                  activeStop.effortRating === 'MODERATE' ? 'text-semantic-caution' :
                  'text-semantic-nominal'
                }>
                  {activeStop.effortRating}
                </span>
              </div>
              <div className="text-[8px] text-ink-muted">ψ SCORE 0.32</div>
            </div>
          </div>

          {/* Traveler Compatibility Check */}
          <div className="p-2.5 bg-[#181818] border border-[rgba(242,240,235,0.08)] mb-5 flex items-center justify-between text-[9px]">
            <span className="text-ink-muted">
              COMPATIBLE WITH {activeTraveler.name.toUpperCase()} ({activeTraveler.mobility}):
            </span>
            <span className="text-semantic-nominal font-bold flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> VERIFIED SAFE
            </span>
          </div>

          {/* Footer CTAs */}
          <div className="flex items-center justify-between pt-2 border-t border-[rgba(242,240,235,0.1)] gap-2">
            <button
              onClick={() => setActiveStopId(null)}
              className="mono-hud-btn px-3 py-1.5 text-ink-secondary hover:text-ink-primary cursor-pointer"
            >
              [← RETURN]
            </button>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleInsert}
                className="mono-hud-btn px-3 py-1.5 border border-ink-primary text-ink-primary hover:bg-ink-primary hover:text-canvas transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>INSERT IN ROUTE [+]</span>
              </button>
              <button
                onClick={() => {
                  setActiveStopId(null);
                  setActiveView('ITINERARY_OUTPUT');
                }}
                className="mono-hud-btn px-4 py-1.5 bg-ink-primary text-canvas font-bold hover:bg-white cursor-pointer"
              >
                VIEW ITINERARY [→]
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
