import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePrayana } from '../../context/PrayanaContext';
import { X, Bookmark, Plus, MapPin, Mountain, Clock, ArrowRight, Trash2 } from 'lucide-react';
import { MonolithStop } from '../../types';

export const BucketListDrawer: React.FC = () => {
  const { 
    isBucketListOpen, 
    setIsBucketListOpen, 
    wishlistIds, 
    toggleWishlist, 
    destinations, 
    insertStopIntoRoute,
    setActiveView 
  } = usePrayana();

  if (!isBucketListOpen) return null;

  // Gather all stops across all destinations that are wishlisted
  const allStops: MonolithStop[] = destinations.flatMap(d => d.stops);
  const wishlistedStops = allStops.filter(s => wishlistIds.includes(s.id));

  const handleInsert = (stop: MonolithStop) => {
    insertStopIntoRoute(stop);
    setIsBucketListOpen(false);
    setActiveView('ITINERARY_OUTPUT');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsBucketListOpen(false)}
          className="absolute inset-0 bg-black/75 backdrop-blur-xs"
        />

        {/* Slide-over Drawer */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          className="absolute inset-y-0 right-0 max-w-full flex pl-10"
        >
          <div className="w-screen max-w-md bg-[#121212] border-l border-[rgba(242,240,235,0.14)] p-6 flex flex-col justify-between overflow-y-auto text-ink-primary font-mono text-[13px]">
            {/* Header */}
            <div>
              <div className="flex items-center justify-between border-b border-[rgba(242,240,235,0.12)] pb-4 mb-4">
                <div>
                  <div className="flex items-center space-x-2 text-ink-primary font-medium tracking-wide">
                    <Bookmark className="w-4 h-4 text-ink-primary" />
                    <span>PERSONAL BUCKET LIST & SAVED POIS</span>
                  </div>
                  <div className="text-[11px] text-ink-secondary tracking-widest mt-0.5">
                    SPATIAL EXPLORE BOOKMARKS ({wishlistedStops.length} NODES)
                  </div>
                </div>
                <button
                  onClick={() => setIsBucketListOpen(false)}
                  className="p-1 hover:bg-[#202020] transition-colors border border-[rgba(242,240,235,0.12)] cursor-pointer"
                >
                  <X className="w-4 h-4 text-ink-secondary" />
                </button>
              </div>

              {/* Wishlist Items List */}
              <div className="space-y-3 max-h-[72vh] overflow-y-auto pr-1">
                {wishlistedStops.length > 0 ? (
                  wishlistedStops.map((stop) => (
                    <div
                      key={stop.id}
                      className="p-3.5 bg-[#161616] border border-[rgba(242,240,235,0.1)] hover:border-ink-secondary transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-serif text-lg text-ink-primary leading-tight">
                              {stop.title}
                            </h4>
                            <span className="text-[11px] px-1 bg-[#222222] border border-[rgba(242,240,235,0.12)] text-ink-secondary">
                              {stop.vibeTag}
                            </span>
                          </div>
                          <p className="font-sans text-[12px] text-ink-secondary mt-1 line-clamp-2 leading-relaxed">
                            {stop.description}
                          </p>
                        </div>

                        <button
                          onClick={() => toggleWishlist(stop.id)}
                          className="p-1 text-ink-muted hover:text-semantic-hazard transition-colors ml-2 cursor-pointer"
                          title="Remove from Bucket List"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Terrain Specs */}
                      <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-[rgba(242,240,235,0.06)] text-[11px] text-ink-muted">
                        <div className="flex items-center space-x-1">
                          <Mountain className="w-2.5 h-2.5" />
                          <span>Δh +{stop.elevationDeltaM}m · {stop.slopeDeg}° slope</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{stop.dwellMinutes} MIN DWELL</span>
                        </div>
                      </div>

                      {/* 1-Click Insert Into Route CTA */}
                      <div className="mt-3 pt-2 border-t border-[rgba(242,240,235,0.08)] flex justify-end">
                        <button
                          onClick={() => handleInsert(stop)}
                          className="mono-hud-btn px-3 py-1 bg-ink-primary text-canvas font-bold hover:bg-white transition-colors flex items-center gap-1.5 cursor-pointer text-[11px]"
                        >
                          <Plus className="w-3 h-3" />
                          <span>INSERT INTO ROUTE [+]</span>
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-ink-muted">
                    <Bookmark className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <div>Your personal bucket list is empty.</div>
                    <div className="text-[11px] text-ink-secondary mt-1">
                      Bookmark stops from the 3D Monument Stage or Monolith Shelf to add them here.
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-[rgba(242,240,235,0.1)] flex items-center justify-between text-[11px] text-ink-muted">
              <span>CLOUD SYNCED (FIRESTORE)</span>
              <button
                onClick={() => {
                  setIsBucketListOpen(false);
                  setActiveView('ITINERARY_OUTPUT');
                }}
                className="text-ink-secondary hover:text-ink-primary underline cursor-pointer"
              >
                VIEW ITINERARY →
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
