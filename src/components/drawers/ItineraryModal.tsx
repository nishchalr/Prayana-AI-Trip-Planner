import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePrayana } from '../../context/PrayanaContext';
import { X, MapPin, Clock, Mountain, ShieldCheck, IndianRupee, ArrowRight } from 'lucide-react';

export const ItineraryModal: React.FC = () => {
  const { 
    isItineraryOpen, 
    setIsItineraryOpen, 
    activeDestination, 
    activeTrip,
    activeTraveler,
    setIsCopilotDrawerOpen 
  } = usePrayana();

  if (!isItineraryOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsItineraryOpen(false)}
          className="absolute inset-0 bg-black/85 backdrop-blur-xs"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ type: 'spring', damping: 26, stiffness: 280 }}
          className="relative z-10 w-full max-w-4xl max-h-[88vh] prayana-glass border border-[rgba(242,240,235,0.18)] shadow-2xl flex flex-col overflow-hidden text-ink-primary font-mono text-[13px]"
        >
          {/* Header */}
          <div className="p-5 border-b border-[rgba(242,240,235,0.12)] flex items-center justify-between bg-[#161616]">
            <div>
              <div className="text-[11px] text-ink-secondary tracking-widest uppercase">
                ACTIVE ITINERARY WORKSPACE // {activeDestination.region.toUpperCase()}
              </div>
              <h2 className="font-serif text-3xl md:text-4xl text-ink-primary tracking-tight mt-0.5">
                {activeDestination.routeTitle}
              </h2>
            </div>
            <button
              onClick={() => setIsItineraryOpen(false)}
              className="p-1.5 hover:bg-[#222222] transition-colors border border-[rgba(242,240,235,0.14)]"
            >
              <X className="w-4 h-4 text-ink-secondary hover:text-ink-primary" />
            </button>
          </div>

          {/* Subheader: 4-Tier Budget Bar & Telemetry Match */}
          <div className="px-5 py-3 border-b border-[rgba(242,240,235,0.08)] bg-[#141414] grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Budget */}
            <div>
              <div className="text-[11px] text-ink-muted uppercase">ALLOCATED TRIP BUDGET</div>
              <div className="text-base font-bold text-ink-primary font-mono flex items-center">
                <span>₹{activeTrip.totalBudget.toLocaleString()}</span>
                <span className="text-[12px] font-normal text-ink-secondary ml-2">
                  (₹{Math.round(activeTrip.totalBudget / 4 / activeTrip.totalDays)}/person/day)
                </span>
              </div>
            </div>

            {/* 4-Tier Budget Segmented Bar */}
            <div className="md:col-span-2">
              <div className="flex justify-between text-[11px] text-ink-muted uppercase mb-1">
                <span>4-TIER BUDGET SPLIT</span>
                <span>STAYS 35% · FOOD 25% · TRANSIT 20% · BUFFER 20%</span>
              </div>
              <div className="h-2 w-full flex bg-[#202020] overflow-hidden">
                <div className="bg-[#B8B5AE] h-full" style={{ width: '35%' }} title="Stays 35%" />
                <div className="bg-[#8E8C86] h-full" style={{ width: '25%' }} title="Food & Dining 25%" />
                <div className="bg-[#6A6863] h-full" style={{ width: '20%' }} title="Local Transit 20%" />
                <div className="bg-[#4A4945] h-full" style={{ width: '20%' }} title="Activities & Buffer 20%" />
              </div>
            </div>
          </div>

          {/* Timeline Stops Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            <div className="flex items-center justify-between text-[11px] text-ink-muted uppercase tracking-widest pb-1 border-b border-[rgba(242,240,235,0.06)]">
              <span>DAY 0{activeTrip.dayIndex} SCHEDULED STOPS</span>
              <span>FILTERED FOR: {activeTraveler.name.toUpperCase()} ({activeTraveler.mobility})</span>
            </div>

            <div className="space-y-2">
              {activeDestination.stops.map((stop) => (
                <div
                  key={stop.id}
                  className="p-3.5 bg-[#171717] border border-[rgba(242,240,235,0.08)] hover:border-ink-secondary transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="flex items-start space-x-3">
                    <span className="font-mono text-[13px] font-bold text-ink-muted mt-0.5">
                      0{stop.index}
                    </span>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-serif text-lg text-ink-primary leading-tight">
                          {stop.title}
                        </h4>
                        <span className="text-[11px] px-1.5 py-0.2 bg-[#222222] border border-[rgba(242,240,235,0.12)] text-ink-secondary">
                          {stop.vibeTag}
                        </span>
                      </div>
                      <p className="font-sans text-[13px] text-ink-secondary mt-1 max-w-xl leading-relaxed">
                        {stop.description}
                      </p>
                    </div>
                  </div>

                  {/* Metrics Badges */}
                  <div className="flex items-center space-x-4 shrink-0 font-mono text-[11px] text-ink-secondary">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-ink-muted" />
                      <span>{stop.optimalTime} ({stop.dwellMinutes}m)</span>
                    </div>

                    <div className="flex items-center space-x-1">
                      <Mountain className="w-3 h-3 text-ink-muted" />
                      <span>Δh {stop.elevationDeltaM}m · {stop.slopeDeg}°</span>
                    </div>

                    <div className="flex items-center space-x-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        stop.effortRating === 'ELEVATED' ? 'bg-semantic-hazard' :
                        stop.effortRating === 'MODERATE' ? 'bg-semantic-caution' :
                        'bg-semantic-nominal'
                      }`} />
                      <span className={
                        stop.effortRating === 'ELEVATED' ? 'text-semantic-hazard' :
                        stop.effortRating === 'MODERATE' ? 'text-semantic-caution' :
                        'text-semantic-nominal'
                      }>
                        {stop.effortRating}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Controls */}
          <div className="p-4 border-t border-[rgba(242,240,235,0.12)] bg-[#151515] flex items-center justify-between">
            <div className="text-[11px] text-ink-muted">
              ROUTE EFFORT SCORE: <span className="text-semantic-nominal font-bold">NOMINAL</span> · ZERO EXCLUDED NODES
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  setIsItineraryOpen(false);
                  setIsCopilotDrawerOpen(true);
                }}
                className="mono-hud-btn px-3 py-1.5 bg-[#202020] border border-[rgba(242,240,235,0.2)] text-ink-primary hover:border-ink-primary"
              >
                ASK PRAYANA AI TO RE-OPTIMIZE [Ctrl+K]
              </button>
              <button
                onClick={() => setIsItineraryOpen(false)}
                className="mono-hud-btn px-4 py-1.5 bg-ink-primary text-canvas font-bold hover:bg-white"
              >
                CLOSE [ESC]
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
