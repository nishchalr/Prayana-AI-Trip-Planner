import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { usePrayana } from '../../context/PrayanaContext';
import { PrayanaLogo } from '../common/PrayanaLogo';
import { FLUID_BACKDROP_TRANSITION, FLUID_MODAL_TRANSITION } from '../../motion/fluidTokens';
import { 
  X, 
  Printer, 
  Download, 
  ShieldCheck, 
  Heart, 
  Activity, 
  CheckCircle2, 
  Share2, 
  FileText,
  AlertCircle,
  Check,
  ExternalLink 
} from 'lucide-react';

const POP_SPRING = { type: 'spring' as const, stiffness: 650, damping: 32, mass: 0.6 };

function utf8ToBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export const ShareHubModal: React.FC = () => {
  const { 
    isShareHubOpen, 
    setIsShareHubOpen, 
    activeDestination, 
    activeTrip, 
    travelers, 
    routeStops, 
    isBhashiniDownloaded 
  } = usePrayana();

  const [copied, setCopied] = useState<boolean>(false);

  // Compact plain text / URL payload readable by standard camera and offline devices
  // Compact, UTF-8-safe Base64url hash (<= 700 chars for scannable offline QR + instant restoration)
  const encodedTripHash = useMemo(() => {
    const knownIds = new Set(activeDestination.stops.map(s => s.id));
    const customStops = routeStops
      .filter(s => !knownIds.has(s.id))
      .map(s => ({
        id: s.id,
        t: s.title,
        st: s.subtitle,
        c: s.cost,
        o: s.isOutdoor,
        p: s.isPinned,
        co: s.coords,
      }));

    const compactData: Record<string, unknown> = {
      d: activeDestination.id,
      dy: activeTrip.dayIndex,
      td: activeTrip.totalDays,
      tb: activeTrip.totalBudget,
      bs: activeTrip.budgetSplit,
      si: routeStops.map(s => s.id),
      tr: travelers.slice(0, 6).map(t => ({
        n: t.name,
        m: t.mobility,
        i: t.travelInsuranceId,
      })),
    };
    if (customStops.length > 0) {
      compactData.cs = customStops;
    }

    try {
      return utf8ToBase64Url(JSON.stringify(compactData));
    } catch {
      return '';
    }
  }, [activeDestination, activeTrip, routeStops, travelers]);

  const bleLinkedCount = travelers.filter(
    t => t.wearableStatus === 'BLE_CONNECTED' || t.fitbandConnected
  ).length;
  const primaryInsurance = travelers[0]?.travelInsuranceId || 'UNREGISTERED';

  const shareableUrl = `${window.location.origin}${window.location.pathname}#trip=${encodedTripHash}`;

  const handlePrint = () => {
    document.body.classList.add('printing-dossier');
    const cleanup = () => {
      document.body.classList.remove('printing-dossier');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
    setTimeout(cleanup, 1500);
  };

  const handleCopyLink = async () => {
    try {
      if (encodedTripHash) {
        window.location.hash = `trip=${encodedTripHash}`;
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareableUrl);
      } else {
        throw new Error('Clipboard API unavailable');
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = shareableUrl;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2400);
      } catch (fallbackErr) {
        console.warn('Clipboard write error', fallbackErr);
      }
    }
  };

  if (!isShareHubOpen) return null;

  return (
    <AnimatePresence>
      <div className="print-dossier-modal-shell fixed inset-0 z-[90] flex items-center justify-center p-4 md:p-8 select-none print:static print:inset-auto print:block print:p-0">
        {/* Backdrop */}
        <motion.div
          {...FLUID_BACKDROP_TRANSITION}
          onClick={() => setIsShareHubOpen(false)}
          className="absolute inset-0 prayana-backdrop no-print"
        />

        {/* Modal Window */}
        <motion.div
          {...FLUID_MODAL_TRANSITION}
          className="print-dossier-root relative z-10 w-full max-w-4xl max-h-[88vh] prayana-glass border border-[rgba(242,240,235,0.18)] shadow-2xl flex flex-col overflow-hidden text-ink-primary font-mono text-[13px] print:max-h-none print:overflow-visible print:shadow-none print:border-0 transform-gpu"
        >
          {/* Header */}
          <div className="p-5 border-b border-[rgba(242,240,235,0.12)] flex items-center justify-between bg-[#161616]">
            <div className="flex items-center space-x-3.5">
              <PrayanaLogo className="w-10 h-10 ring-2 ring-[#F2F0EB]/30" showRing />
              <div>
                <div className="text-[11px] text-ink-secondary tracking-widest uppercase">
                  TRIP ARCHIVE SUMMARY & OFFLINE DISPATCH // PRAYANA OS
                </div>
                <h2 className="font-serif text-3xl sm:text-4xl text-ink-primary tracking-tight mt-0.5">
                  {activeDestination.routeTitle}
                </h2>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 no-print">
              <motion.button
                onClick={handleCopyLink}
                whileHover={{ y: -2, scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                transition={POP_SPRING}
                className="mono-hud-btn px-3 py-1.5 bg-[#1F1F1F] border border-[rgba(242,240,235,0.2)] text-ink-primary hover:border-ink-primary transition-colors duration-100 flex items-center gap-1.5 cursor-pointer"
                title="Copy Trip URL to Clipboard"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-semantic-nominal" />
                    <span className="text-semantic-nominal font-bold">[ ✓ LINK COPIED ]</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5" />
                    <span>COPY SHARE LINK</span>
                  </>
                )}
              </motion.button>

              <motion.button
                onClick={handlePrint}
                whileHover={{ y: -2, scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                transition={POP_SPRING}
                className="mono-hud-btn px-3 py-1.5 bg-[#202020] border border-[rgba(242,240,235,0.2)] text-ink-primary hover:border-ink-primary transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Print Archival Itinerary Document"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>PRINT / EXPORT PDF</span>
              </motion.button>

              <motion.button
                onClick={() => setIsShareHubOpen(false)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-1.5 hover:bg-[#222222] transition-colors border border-[rgba(242,240,235,0.14)] cursor-pointer"
              >
                <X className="w-4 h-4 text-ink-secondary" />
              </motion.button>
            </div>
          </div>

          {/* Printable Document Body */}
          <div data-lenis-prevent className="flex-1 overflow-y-auto overscroll-contain p-6 space-y-6">
            {/* Top Quick Summary Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 bg-[#161616] border border-[rgba(242,240,235,0.08)]">
                <div className="text-[11px] text-ink-muted uppercase">CORRIDOR DURATION</div>
                <div className="text-xl font-bold font-mono text-ink-primary mt-0.5">
                  {activeTrip.totalDays} DAYS
                </div>
                <div className="text-[11px] text-ink-secondary">{routeStops.length} SCHEDULED STOPS</div>
              </div>

              <div className="p-3 bg-[#161616] border border-[rgba(242,240,235,0.08)]">
                <div className="text-[11px] text-ink-muted uppercase">COHORT ROSTER</div>
                <div className="text-xl font-bold font-mono text-ink-primary mt-0.5">
                  {travelers.length} TRAVELERS
                </div>
                <div className={`text-[11px] ${bleLinkedCount > 0 ? 'text-semantic-nominal' : 'text-ink-muted'}`}>
                  {bleLinkedCount > 0 ? `${bleLinkedCount} BLE FITBAND LINKED` : 'NO BLE FITBAND LINKED'}
                </div>
              </div>

              <div className="p-3 bg-[#161616] border border-[rgba(242,240,235,0.08)]">
                <div className="text-[11px] text-ink-muted uppercase">ALLOCATED BUDGET</div>
                <div className="text-xl font-bold font-mono text-ink-primary mt-0.5">
                  ₹{activeTrip.totalBudget.toLocaleString()}
                </div>
                <div className="text-[11px] text-ink-secondary">4-TIER REBALANCED</div>
              </div>

              <div className="p-3 bg-[#161616] border border-[rgba(242,240,235,0.08)]">
                <div className="text-[11px] text-ink-muted uppercase">OFFLINE DICTIONARY</div>
                <div className="text-xl font-bold font-mono mt-0.5">
                  <span className={isBhashiniDownloaded ? 'text-semantic-nominal' : 'text-semantic-caution'}>
                    {isBhashiniDownloaded ? 'SYNCED' : 'PENDING'}
                  </span>
                </div>
                <div className="text-[11px] text-ink-muted">BHASHINI CANONICAL</div>
              </div>
            </div>

            {/* Offline QR Code Sync Deck & Emergency Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Working Scannable Vector QR Code for Offline Sync */}
              <div className="p-4 bg-[#161616] border border-[rgba(242,240,235,0.1)] flex flex-col items-center justify-center text-center">
                <div className="text-[11px] text-ink-muted uppercase tracking-widest mb-3">
                  OFFLINE PEER-TO-PEER SYNC QR
                </div>
                
                {/* Real SVG QR Code from qrcode.react */}
                <div className="p-3 bg-white border border-[rgba(242,240,235,0.2)] flex items-center justify-center">
                  <QRCodeSVG
                    value={shareableUrl}
                    size={144}
                    bgColor="#FFFFFF"
                    fgColor="#0E0E0E"
                    level="M"
                  />
                </div>

                <div className="text-[11px] text-ink-secondary mt-2.5 font-mono">
                  PAYLOAD: PRYN_ROUTE_SYNC<br />SCANNABLE WITH ANY PHONE CAMERA
                </div>
              </div>

              {/* Group Medical & Emergency Insurance Card */}
              <div className="md:col-span-2 p-4 bg-[#161616] border border-[rgba(242,240,235,0.1)] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[11px] text-ink-muted uppercase tracking-widest mb-3">
                    <span>COHORT MEDICAL & INSURANCE DOSSIER</span>
                    <span className="text-semantic-nominal font-bold">VERIFIED ARCHIVAL</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    {travelers.map(t => (
                      <div key={t.id} className="p-2.5 bg-[#1B1B1B] border border-[rgba(242,240,235,0.06)]">
                        <div className="flex justify-between font-bold text-ink-primary">
                          <span>{t.name} ({t.age}y)</span>
                          <span className="text-ink-secondary">{t.mobility}</span>
                        </div>
                        <div className="text-[11px] text-semantic-hazard mt-1">
                          {t.medicalFlags.join(', ') || 'No Medical Flags'}
                          {t.dietaryTags.filter(d => d.includes('Allergy') || d === 'Gluten-Free').length > 0 && ` · ${t.dietaryTags.filter(d => d.includes('Allergy') || d === 'Gluten-Free').join(', ')}`}
                        </div>
                        <div className="text-[11px] text-ink-muted mt-1">
                          ICE: {t.emergencyContact.name} ({t.emergencyContact.phone})
                        </div>
                        <div className="text-[11px] text-ink-secondary mt-0.5">
                          POL: {t.travelInsuranceId}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-[rgba(242,240,235,0.08)] flex justify-between text-[11px] text-ink-muted">
                  <span>DISPATCH EMERGENCY LINE: {activeDestination.country === 'Japan' ? '110 / 119 (JAPAN)' : '112 (NATIONAL EMERGENCY)'}</span>
                  <span>TRAVEL POLICY: {primaryInsurance}</span>
                </div>
              </div>
            </div>

            {/* Complete Itinerary Chronological Stop Manifest */}
            <div className="p-4 bg-[#161616] border border-[rgba(242,240,235,0.1)]">
              <div className="text-[11px] text-ink-muted uppercase tracking-widest mb-3">
                CHRONOLOGICAL DAY 01 STOP MANIFEST
              </div>

              <div className="space-y-1.5">
                {routeStops.map((stop) => (
                  <div
                    key={stop.id}
                    className="p-2.5 bg-[#1A1A1A] border border-[rgba(242,240,235,0.06)] flex items-center justify-between text-[12px]"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-ink-muted">0{stop.index}</span>
                      <span className="text-ink-primary font-medium">{stop.title}</span>
                      <span className="text-[11px] text-ink-secondary">({stop.vibeTag})</span>
                    </div>

                    <div className="flex items-center space-x-4 text-[11px] text-ink-muted font-mono">
                      <span>{stop.optimalTime}</span>
                      <span>+{stop.elevationDeltaM}m · {stop.slopeDeg}°</span>
                      <span className="text-ink-primary font-bold">{stop.dwellMinutes} MIN</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="p-4 border-t border-[rgba(242,240,235,0.12)] bg-[#151515] flex items-center justify-between no-print">
            <div className="text-[11px] text-ink-muted">
              PRAYANA TRIP DISPATCH ENGINE // ARCHIVAL DOSSIER GENERATION
            </div>
            <button
              onClick={() => setIsShareHubOpen(false)}
              className="mono-hud-btn px-4 py-1.5 bg-ink-primary text-canvas font-bold hover:bg-white cursor-pointer"
            >
              CLOSE [ESC]
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
