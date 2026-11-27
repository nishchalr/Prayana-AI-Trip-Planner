import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePrayana } from '../../context/PrayanaContext';
import { CompassLoader } from '../common/CompassLoader';
import { FLUID_BACKDROP_TRANSITION, FLUID_DRAWER_RIGHT_TRANSITION } from '../../motion/fluidTokens';
import { 
  X, 
  Sparkles, 
  Send, 
  Bot, 
  Check, 
  ArrowRight, 
  Activity, 
  ShieldCheck, 
  Sliders,
  CornerDownLeft 
} from 'lucide-react';
import { 
  executeGeminiCopilotPrompt, 
  CopilotActionResult 
} from '../../services/geminiCopilotService';
import { sendCopilotCommand } from '../../services/apiClient';

interface CopilotMessage {
  id: string;
  sender: 'user' | 'gemini';
  text: string;
  actionTag?: string;
  timestamp: string;
}

export const CopilotDrawer: React.FC = () => {
  const { 
    isCopilotDrawerOpen, 
    setIsCopilotDrawerOpen, 
    activeDestination,
    liveVitals,
    activeTraveler,
    routeStops,
    setRouteStops,
    activeTrip,
    setActiveView,
    toggleStormDisruption,
    compensatoryRebalance,
    setActiveCockpitTab,
    theme
  } = usePrayana();

  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: '1',
      sender: 'gemini',
      text: `Prayana AI online (Gemini Core). Active corridor: ${activeDestination.name} (${activeDestination.routeTitle}). I am continuously monitoring ${activeTraveler.name}'s Google Health vitals (HR: ${liveVitals.heartRate} BPM, Strain: ${liveVitals.strainLevel}) and dietary restrictions. How should I optimize your route?`,
      timestamp: '13:50',
    },
  ]);

  useEffect(() => {
    setMessages(prev => {
      if (prev.length === 0 || prev[0].id !== '1') return prev;
      const updatedFirst: CopilotMessage = {
        ...prev[0],
        text: `Prayana AI online (Gemini Core). Active corridor: ${activeDestination.name} (${activeDestination.routeTitle}). I am continuously monitoring ${activeTraveler.name}'s Google Health vitals (HR: ${liveVitals.heartRate} BPM, Strain: ${liveVitals.strainLevel}) and dietary restrictions. How should I optimize your route?`,
      };
      return [updatedFirst, ...prev.slice(1)];
    });
  }, [activeDestination.id, activeDestination.name, activeDestination.routeTitle, activeTraveler.id, activeTraveler.name]);

  const quickChips = [
    '[ MAKE DAY 2 MORE RELAXED ]',
    '[ SWAP OUTDOOR TREK FOR INDOOR MUSEUM ]',
    '[ FIND ALLERGY-SAFE DINNER NEAR STOP 2 ]',
    '[ ADJUST PLAN FOR ELEVATED HEART RATE ]',
  ];

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || isProcessing) return;

    const userMsg: CopilotMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsProcessing(true);

    try {
      // 1. Try FastAPI backend Gemini Copilot router
      const backendResult = await sendCopilotCommand(text, {
        destinationName: activeDestination.name,
        routeTitle: activeDestination.routeTitle,
        activeTraveler,
        liveHeartRate: liveVitals.heartRate,
        liveStrainLevel: liveVitals.strainLevel,
        routeStops,
        totalBudget: activeTrip.totalBudget,
      });

      if (backendResult) {
        if (backendResult.action_type === 'RELAX_PACING') {
          setRouteStops(current =>
            current.map(s => ({
              ...s,
              dwellMinutes: s.dwellMinutes + 20,
              optimalTime: `${s.optimalTime} (+20m dwell)`,
            }))
          );
        } else if (backendResult.action_type === 'REROUTE_INDOOR') {
          toggleStormDisruption();
        } else if (backendResult.action_type === 'FILTER_DINING') {
          setActiveCockpitTab('DINING');
        } else if (backendResult.action_type === 'ADJUST_EFFORT') {
          setRouteStops(current =>
            current.map(s => (s.slopeDeg > 2.5 ? { ...s, slopeDeg: 2.0, effortRating: 'LOW' } : s))
          );
        }

        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: 'gemini',
            text: backendResult.explanation,
            actionTag: `[ ${backendResult.action_type} · SYS_${backendResult.source.toUpperCase()} ]`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        return;
      }

      // 2. Fallback to client-side Gemini Copilot Service
      const result: CopilotActionResult = await executeGeminiCopilotPrompt(text, {
        destinationName: activeDestination.name,
        routeTitle: activeDestination.routeTitle,
        activeTraveler,
        liveHeartRate: liveVitals.heartRate,
        liveStrainLevel: liveVitals.strainLevel,
        routeStops,
        totalBudget: activeTrip.totalBudget,
      });

      // Execute live state mutations in PrayanaContext
      if (result.actionType === 'RELAX_PACING') {
        const delta = result.parameters.dwellDeltaMinutes || 20;
        setRouteStops(current =>
          current.map(s => ({
            ...s,
            dwellMinutes: s.dwellMinutes + delta,
            optimalTime: `${s.optimalTime} (+${delta}m dwell)`,
          }))
        );
      } else if (result.actionType === 'INDOOR_REROUTE') {
        toggleStormDisruption();
      } else if (result.actionType === 'FILTER_DINING') {
        setActiveCockpitTab('DINING');
      } else if (result.actionType === 'REDUCE_EFFORT_STRAIN') {
        const maxSlope = result.parameters.maxSlopeDeg || 2.5;
        setRouteStops(current =>
          current.map(s => {
            if (s.slopeDeg > maxSlope) {
              return {
                ...s,
                slopeDeg: maxSlope,
                effortRating: 'LOW',
                title: `${s.title} (Gentle Terrace Path)`,
                elevationDeltaM: Math.min(s.elevationDeltaM, 15),
              };
            }
            return s;
          })
        );
      } else if (result.actionType === 'REBALANCE_BUDGET') {
        compensatoryRebalance();
      }

      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'gemini',
          text: result.explanation,
          actionTag: result.actionTag,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err) {
      console.error('Copilot prompt error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isCopilotDrawerOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden select-none">
        {/* Backdrop */}
        <motion.div
          {...FLUID_BACKDROP_TRANSITION}
          onClick={() => setIsCopilotDrawerOpen(false)}
          className="absolute inset-0 bg-black/75 backdrop-blur-xs"
        />

        {/* Slide-over Drawer */}
        <motion.div
          {...FLUID_DRAWER_RIGHT_TRANSITION}
          className="absolute inset-y-0 right-0 max-w-full flex pl-10 transform-gpu"
        >
          <div className="w-screen max-w-md bg-[#121212] border-l border-[rgba(242,240,235,0.14)] p-6 flex flex-col justify-between overflow-y-auto text-ink-primary font-mono text-[13px]">
            {/* Header */}
            <div>
              <div className="flex items-center justify-between border-b border-[rgba(242,240,235,0.12)] pb-4 mb-4">
                <div>
                  <div className="flex items-center space-x-2 text-ink-primary font-medium tracking-wide">
                    <Sparkles className="w-4 h-4 text-ink-primary" />
                    <span>PRAYANA AI ASSISTANT</span>
                  </div>
                  <div className="text-[11px] text-ink-secondary tracking-widest mt-0.5">
                    STRUCTURED MUTATION ENGINE // GEMINI 1.5 FLASH
                  </div>
                </div>
                <button
                  onClick={() => setIsCopilotDrawerOpen(false)}
                  className="p-1 hover:bg-[#202020] transition-colors border border-[rgba(242,240,235,0.12)] cursor-pointer"
                >
                  <X className="w-4 h-4 text-ink-secondary" />
                </button>
              </div>

              {/* Quick Action Monospace Chips */}
              <div className="mb-4">
                <div className="text-[11px] text-ink-muted uppercase tracking-widest mb-2">
                  CLICKABLE PRAYANA AI ACTIONS
                </div>
                <div className="flex flex-col gap-1.5">
                  {quickChips.map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(chip)}
                      disabled={isProcessing}
                      className="text-left px-2.5 py-1.5 bg-[#181818] border border-[rgba(242,240,235,0.1)] hover:border-ink-primary hover:bg-[#222222] text-ink-primary text-[12px] transition-colors flex items-center justify-between group cursor-pointer disabled:opacity-50"
                    >
                      <span>{chip}</span>
                      <ArrowRight className="w-3 h-3 text-ink-muted group-hover:text-ink-primary transition-colors" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Message History */}
              <div className="space-y-3 mb-4 max-h-[360px] overflow-y-auto pr-1">
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`p-3 border ${
                      msg.sender === 'user'
                        ? 'bg-[#1C1C1C] border-ink-primary/30 ml-6 text-right'
                        : 'bg-[#151515] border-[rgba(242,240,235,0.1)] mr-4'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] text-ink-muted mb-1 uppercase tracking-widest">
                      <span>{msg.sender === 'user' ? 'YOU' : 'GEMINI CORE'}</span>
                      <span>{msg.timestamp}</span>
                    </div>
                    <p className="text-[13px] text-ink-primary leading-relaxed text-left font-sans">
                      {msg.text}
                    </p>
                    {msg.actionTag && (
                      <div className="mt-2 text-left">
                        <span className="inline-block px-1.5 py-0.5 bg-[#0E0E0E] border border-semantic-nominal/50 text-semantic-nominal text-[11px] font-mono">
                          {msg.actionTag}
                        </span>
                      </div>
                    )}
                  </div>
                ))}

                {isProcessing && (
                  <CompassLoader
                    variant="inline"
                    theme={theme}
                    statusText="SYNTHESIZING PRAYANA AI ROUTE MUTATION..."
                  />
                )}
              </div>
            </div>

            {/* Input & Footer Controls */}
            <div>
              <div className="flex items-center gap-2 border border-[rgba(242,240,235,0.2)] bg-[#181818] p-1.5 mb-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask Gemini: 'Make Day 2 relaxed', 'Find safe dinner'..."
                  disabled={isProcessing}
                  className="flex-1 bg-transparent px-2 py-1 text-ink-primary placeholder:text-ink-muted text-[13px] focus:outline-none font-sans"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={isProcessing}
                  className="px-3 py-1 bg-ink-primary text-canvas font-mono text-[12px] uppercase font-bold hover:bg-white transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3 h-3" />
                  <span>RUN</span>
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-ink-muted">
                <span>PRESS ESC TO CLOSE</span>
                <button
                  onClick={() => {
                    setIsCopilotDrawerOpen(false);
                    setActiveView('ITINERARY_OUTPUT');
                  }}
                  className="text-ink-secondary hover:text-ink-primary underline transition-colors cursor-pointer"
                >
                  VIEW UPDATED ITINERARY →
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
