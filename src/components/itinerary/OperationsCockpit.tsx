import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { usePrayana } from '../../context/PrayanaContext';
import { CockpitTab, ExpenseItem, DietaryTag } from '../../types';
import { PopButton, PopCard } from '../ui/InteractivePrimitives';
import { 
  CreditCard, 
  Utensils, 
  Camera, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Download, 
  Languages, 
  Sparkles, 
  CloudRain, 
  Heart, 
  Compass, 
  FileText,
  Volume2,
  Upload,
  RefreshCw 
} from 'lucide-react';

export const OperationsCockpit: React.FC = () => {
  const { 
    activeCockpitTab, 
    setActiveCockpitTab,
    expenses,
    addExpense,
    isOverspent,
    netOverspend,
    compensatoryRebalance,
    rebalanceApplied,
    isStormDisrupted,
    toggleStormDisruption,
    diningOptions,
    placesData,
    placesLoading,
    refreshDestinationPlaces,
    activeTrip,
    travelers,
    activeDestination,
    isBhashiniDownloaded,
    downloadBhashiniPack,
    ocrScanResult,
    runOcrScan 
  } = usePrayana();

  // Expense form state
  const [expenseCategory, setExpenseCategory] = useState<'stays' | 'food' | 'transit' | 'activitiesAndBuffer'>('food');
  const [expenseAmount, setExpenseAmount] = useState<number>(1200);
  const [expenseDesc, setExpenseDesc] = useState<string>('');

  // OCR Photo Upload & Live Camera State
  const [menuTextToScan, setMenuTextToScan] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [menuPreviewUrl, setMenuPreviewUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
      if (menuPreviewUrl) URL.revokeObjectURL(menuPreviewUrl);
    };
  }, []);

  useEffect(() => {
    if (activeCockpitTab !== 'OCR_ALLERGEN') {
      stopCamera();
    }
  }, [activeCockpitTab]);

  // Group allergens
  const groupAllergies = Array.from(
    new Set(travelers.flatMap(t => t.dietaryTags.filter(d => d.includes('Allergy') || d === 'Gluten-Free')))
  );

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (expenseAmount <= 0) return;
    addExpense({
      category: expenseCategory,
      amount: expenseAmount,
      description: expenseDesc.trim() || `${expenseCategory.toUpperCase()} Entry`,
      dayIndex: 1,
    });
    setExpenseDesc('');
    setExpenseAmount(1000);
  };

  const handleRunOcr = async (preset?: string) => {
    setIsScanning(true);
    try {
      await runOcrScan({ sampleText: preset ?? menuTextToScan });
    } finally {
      setIsScanning(false);
    }
  };

  const handleRunImageFile = async (file: File) => {
    stopCamera();
    if (menuPreviewUrl) URL.revokeObjectURL(menuPreviewUrl);
    setMenuPreviewUrl(URL.createObjectURL(file));
    setUploadedFileName(file.name);
    setCameraError(null);
    setIsScanning(true);
    try {
      await runOcrScan({ imageFile: file });
    } finally {
      setIsScanning(false);
    }
  };

  const handleStartCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera capture API unavailable in this browser.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setIsCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 60);
    } catch (err: any) {
      setCameraError(err?.message || 'Unable to access camera.');
    }
  };

  const handleCaptureCameraFrame = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const capturedFile = new File([blob], `menu-capture-${Date.now()}.png`, {
        type: 'image/png',
      });
      await handleRunImageFile(capturedFile);
    }, 'image/png');
  };

  return (
    <div className="w-full bg-[#121212] border border-[rgba(242,240,235,0.12)] p-4 font-mono text-[11px] select-none">
      {/* Hairline Sub-Navigation Tabs (2x2 clean grid on mobile, 4-col on sm+) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-[rgba(242,240,235,0.12)] pb-3 mb-4 gap-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 w-full lg:w-auto">
          {(
            [
              { id: 'BUDGET', label: '1. LIVE BUDGET & REBALANCING', icon: CreditCard },
              { id: 'DINING', label: '2. SMART DINING & STAYS', icon: Utensils },
              { id: 'OCR_ALLERGEN', label: '3. OFFLINE OCR & ALLERGEN SCANNER', icon: Camera },
              { id: 'DISRUPTION_SAFETY', label: '4. DISRUPTION REROUTE & MEDICAL KIT', icon: CloudRain },
            ] as const
          ).map(tab => {
            const Icon = tab.icon;
            const isActive = activeCockpitTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCockpitTab(tab.id)}
                className={`relative px-2.5 py-2 flex items-center space-x-1.5 text-[11px] leading-tight text-left transition-colors duration-150 cursor-pointer z-10 ${
                  isActive
                    ? '!text-[#0E0E0E] font-bold'
                    : 'text-ink-secondary hover:text-ink-primary bg-[#161616] border border-[rgba(242,240,235,0.1)]'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeCockpitTabIndicator"
                    className="absolute inset-0 bg-ink-primary -z-10 shadow-md"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Real-time status pill */}
        <div className="text-[9px] text-ink-muted shrink-0">
          OPERATIONS STATUS: <span className="text-semantic-nominal font-bold">ONLINE</span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: LIVE BUDGET & 4-BUCKET REBALANCING (CHAPTER 5)    */}
      {/* ======================================================== */}
      {activeCockpitTab === 'BUDGET' && (
        <div className="space-y-4">
          {/* Overspend Alert Banner */}
          {isOverspent && (
            <div className="p-3.5 bg-[#251515] border border-semantic-hazard flex flex-col md:flex-row md:items-center justify-between gap-3 text-semantic-hazard">
              <div className="flex items-start space-x-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-[10px]">
                    NET GROUP OVERSPEND DETECTED: +₹{netOverspend.toLocaleString()} (DAY 01)
                  </div>
                  <div className="text-[9px] text-ink-secondary mt-0.5 font-sans">
                    Realized spend exceeds planned daily velocity. Trimming rule (Eq 5.2) targets activities (50%) and dining (30%) to protect local transit (5%).
                  </div>
                </div>
              </div>

              <PopButton
                onClick={compensatoryRebalance}
                disabled={rebalanceApplied}
                variant="danger"
                size="md"
                className="shrink-0"
              >
                {rebalanceApplied ? '✓ RE-PLAN COMMITTED' : 'COMPENSATORY RE-PLAN [+]'}
              </PopButton>
            </div>
          )}

          {rebalanceApplied && (
            <div className="p-2.5 bg-[#172018] border border-semantic-nominal/60 text-semantic-nominal text-[9px] flex items-center justify-between">
              <span>✓ COMPENSATORY RE-PLAN APPLIED: Replaced paid monument tickets with free panoramic viewpoints & rebalanced 4-bucket targets.</span>
              <span className="font-bold">ω REBALANCE ACTIVE</span>
            </div>
          )}

          {/* Live 4-Bucket Allocation & Remaining Daily Targets */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            {(
              [
                { key: 'stays' as const, label: 'STAYS', pct: activeTrip.budgetSplit.stays, dailyTarget: activeTrip.rebalanceTargets?.stays },
                { key: 'food' as const, label: 'FOOD & DINING', pct: activeTrip.budgetSplit.food, dailyTarget: activeTrip.rebalanceTargets?.food },
                { key: 'transit' as const, label: 'LOCAL TRANSIT', pct: activeTrip.budgetSplit.transit, dailyTarget: activeTrip.rebalanceTargets?.transit },
                { key: 'activitiesAndBuffer' as const, label: 'ACTIVITIES & BUFFER', pct: activeTrip.budgetSplit.activitiesAndBuffer, dailyTarget: activeTrip.rebalanceTargets?.activities },
              ]
            ).map(bucket => {
              const bucketCap = Math.round((activeTrip.totalBudget * bucket.pct) / 100);
              const bucketSpent = expenses
                .filter(ex => ex.category === bucket.key)
                .reduce((acc, ex) => acc + ex.amount, 0);
              const utilPct = Math.min(100, Math.round((bucketSpent / Math.max(1, bucketCap)) * 100));
              const isOver = bucketSpent > bucketCap;

              return (
                <div key={bucket.key} className="p-2.5 bg-[#161616] border border-[rgba(242,240,235,0.1)]">
                  <div className="flex items-center justify-between text-[8px] text-ink-muted">
                    <span>{bucket.label}</span>
                    <span className="font-bold text-ink-primary">{bucket.pct}%</span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between font-mono text-[10px]">
                    <span className={isOver ? 'text-semantic-hazard font-bold' : 'text-ink-primary font-bold'}>
                      ₹{bucketSpent.toLocaleString()}
                    </span>
                    <span className="text-[8px] text-ink-muted">
                      / ₹{bucketCap.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full h-1 bg-[#222222] mt-1.5 overflow-hidden">
                    <div
                      className={`h-full transition-colors duration-150 ${isOver ? 'bg-semantic-hazard' : 'bg-ink-primary'}`}
                      style={{ width: `${utilPct}%` }}
                    />
                  </div>
                  {typeof bucket.dailyTarget === 'number' && (
                    <div className="mt-1 text-[8px] text-semantic-nominal">
                      DAILY TARGET: ₹{Math.round(bucket.dailyTarget).toLocaleString()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 4-Bucket Expense Logger Form */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-[#161616] border border-[rgba(242,240,235,0.1)]">
              <div className="text-[9px] text-ink-muted uppercase tracking-widest mb-3">
                QUICK EXPENSE LOGGER
              </div>
              <form onSubmit={handleAddExpense} className="space-y-2.5">
                <div>
                  <label className="block text-[8px] text-ink-secondary uppercase mb-1">
                    BUDGET BUCKET
                  </label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value as any)}
                    className="w-full bg-[#1A1A1A] border border-[rgba(242,240,235,0.15)] p-1.5 text-ink-primary text-xs focus:outline-none"
                  >
                    <option value="stays">Stays ({activeTrip.budgetSplit.stays}%)</option>
                    <option value="food">Food & Dining ({activeTrip.budgetSplit.food}%)</option>
                    <option value="transit">Local Transit ({activeTrip.budgetSplit.transit}%)</option>
                    <option value="activitiesAndBuffer">Activities & Buffer ({activeTrip.budgetSplit.activitiesAndBuffer}%)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[8px] text-ink-secondary uppercase mb-1">
                    AMOUNT (₹ INR)
                  </label>
                  <input
                    type="number"
                    step="100"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(Number(e.target.value))}
                    className="w-full bg-[#1A1A1A] border border-[rgba(242,240,235,0.15)] p-1.5 text-ink-primary font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[8px] text-ink-secondary uppercase mb-1">
                    DESCRIPTION
                  </label>
                  <input
                    type="text"
                    value={expenseDesc}
                    onChange={(e) => setExpenseDesc(e.target.value)}
                    placeholder="e.g. Coconut water & coracle tip"
                    className="w-full bg-[#1A1A1A] border border-[rgba(242,240,235,0.15)] p-1.5 text-ink-primary font-sans text-xs focus:outline-none"
                  />
                </div>

                <PopButton
                  type="submit"
                  size="md"
                  className="w-full flex items-center justify-center gap-1.5 !bg-ink-primary !text-[#0E0E0E] hover:!bg-white"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>LOG EXPENSE [+]</span>
                </PopButton>
              </form>
            </div>

            {/* Recent Expenses List */}
            <div className="md:col-span-2 p-4 bg-[#161616] border border-[rgba(242,240,235,0.1)]">
              <div className="flex items-center justify-between text-[9px] text-ink-muted uppercase tracking-widest mb-3">
                <span>RECENT REALIZED EXPENSES</span>
                <span>TOTAL: ₹{expenses.reduce((s, e) => s + e.amount, 0).toLocaleString()}</span>
              </div>

              <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                {expenses.map(e => (
                  <div
                    key={e.id}
                    className="p-2 bg-[#1A1A1A] border border-[rgba(242,240,235,0.06)] flex items-center justify-between text-[10px]"
                  >
                    <div>
                      <div className="text-ink-primary font-medium">{e.description}</div>
                      <div className="text-[8px] text-ink-muted uppercase">
                        {e.category} · {e.timestamp}
                      </div>
                    </div>
                    <div className="font-mono text-ink-primary font-bold">
                      ₹{e.amount.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: SMART DINING & STAYS (ALLERGY & CAP FILTERED)    */}
      {/* ======================================================== */}
      {activeCockpitTab === 'DINING' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[9px] text-ink-muted uppercase tracking-widest pb-1.5 border-b border-[rgba(242,240,235,0.08)]">
            <span>
              LIVE OPENSTREETMAP OVERPASS // {activeDestination.name.toUpperCase()} · FILTER: {groupAllergies.join(', ') || 'NONE'}
            </span>
            <div className="flex items-center gap-2">
              <span className={placesData?.source?.startsWith('openstreetmap_overpass') ? 'text-semantic-nominal' : 'text-amber-300'}>
                {placesLoading ? 'QUERYING OVERPASS...' : placesData?.source || 'NO LIVE DATA'}
              </span>
              <button
                type="button"
                onClick={() => refreshDestinationPlaces()}
                disabled={placesLoading}
                className="px-2 py-0.5 bg-[#1B1B1B] border border-[rgba(242,240,235,0.2)] text-ink-primary hover:border-ink-primary flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-2.5 h-2.5 ${placesLoading ? 'animate-spin' : ''}`} />
                <span>REFRESH OSM</span>
              </button>
            </div>
          </div>

          {placesData?.disclaimer && (
            <div className="p-2 bg-[#161616] border border-[rgba(242,240,235,0.08)] text-[8px] font-sans text-ink-secondary">
              {placesData.disclaimer}
            </div>
          )}

          {placesLoading && diningOptions.length === 0 ? (
            <div className="p-6 text-center text-[10px] text-ink-secondary border border-[rgba(242,240,235,0.1)] bg-[#141414]">
              QUERYING LIVE OPENSTREETMAP OVERPASS RESTAURANTS & STAYS AROUND {activeDestination.name.toUpperCase()}...
            </div>
          ) : diningOptions.length === 0 ? (
            <div className="p-6 text-center text-[10px] text-ink-muted border border-[rgba(242,240,235,0.1)] bg-[#141414] space-y-2">
              <div>NO LIVE OVERPASS VENUES RETURNED FOR THIS SECTOR.</div>
              <button
                type="button"
                onClick={() => refreshDestinationPlaces()}
                className="px-3 py-1 bg-ink-primary text-canvas font-bold cursor-pointer"
              >
                [ RETRY OVERPASS QUERY ]
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {diningOptions.slice(0, 8).map(din => {
                const hasAllergenConflict = din.allergenFlags.some(a => groupAllergies.includes(a as any));

                return (
                  <PopCard
                    key={din.id}
                    className={`p-3.5 transition-colors duration-150 ${
                      hasAllergenConflict
                        ? 'border-semantic-hazard/50 bg-[#221515]'
                        : 'border-[rgba(242,240,235,0.12)] bg-[#161616]'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-serif text-lg text-ink-primary leading-tight">
                          {din.name}
                        </h4>
                        <div className="text-[9px] text-ink-secondary mt-0.5">
                          {din.cuisine} · {din.distanceKm} km from hub
                        </div>
                      </div>

                      <div className="text-right font-mono shrink-0 ml-2">
                        <div className="text-sm font-bold text-ink-primary">
                          ~₹{din.costForTwo} <span className="text-[8px] font-normal text-ink-muted">est.</span>
                        </div>
                        <div className="text-[8px] text-ink-muted">
                          OSM {din.categoryTag?.toUpperCase() || 'DINING'}
                        </div>
                      </div>
                    </div>

                    {/* OSM Verified Tags vs Heuristic Notes */}
                    <div className="mt-2.5 flex flex-wrap gap-1">
                      {(din.osmVerifiedTags || []).map(tag => (
                        <span key={tag} className="px-1.5 py-0.5 bg-[#152418] border border-semantic-nominal/60 text-semantic-nominal text-[8px] font-bold">
                          [OSM DIET] {tag}
                        </span>
                      ))}
                      {din.allergenFlags.map(af => (
                        <span key={af} className="px-1.5 py-0.5 bg-[#2D1616] border border-semantic-hazard text-semantic-hazard text-[8px] font-bold">
                          HEURISTIC RISK: {af.toUpperCase()}
                        </span>
                      ))}
                      {!din.isOsmDietVerified && (din.heuristicNotes || []).map((note, ni) => (
                        <span key={ni} className="px-1.5 py-0.5 bg-[#202020] border border-[rgba(242,240,235,0.12)] text-ink-muted text-[8px]">
                          {note}
                        </span>
                      ))}
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-[rgba(242,240,235,0.06)] flex items-center justify-between text-[8px]">
                      <span className="text-ink-muted truncate max-w-[60%]">{din.address}</span>
                      {hasAllergenConflict ? (
                        <span className="text-semantic-hazard font-bold">
                          ⚠ HEURISTIC ALLERGEN WARNING
                        </span>
                      ) : din.isOsmDietVerified ? (
                        <span className="text-semantic-nominal font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> OSM DIET TAGGED
                        </span>
                      ) : (
                        <span className="text-amber-300">
                          CONFIRM WITH STAFF
                        </span>
                      )}
                    </div>
                  </PopCard>
                );
              })}
            </div>
          )}

          {/* Live OSM Stays & Guesthouses */}
          {placesData && placesData.stays.length > 0 && (
            <div className="pt-2">
              <div className="text-[9px] text-ink-muted uppercase tracking-widest pb-1 mb-2 border-b border-[rgba(242,240,235,0.08)]">
                LIVE OPENSTREETMAP ACCOMMODATIONS ({placesData.stays.length})
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {placesData.stays.slice(0, 4).map(stay => (
                  <div key={stay.id} className="p-3 bg-[#151515] border border-[rgba(242,240,235,0.1)] flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <div className="font-serif text-base text-ink-primary truncate">{stay.name}</div>
                      <div className="text-[8px] text-ink-muted truncate">
                        {stay.category_tag.replace('_', ' ').toUpperCase()} · {stay.distance_km} km · {stay.address}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-ink-primary">~₹{stay.estimated_cost_for_two}</div>
                      <div className="text-[8px] text-ink-muted">EST / NIGHT</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: OFFLINE TOOLKIT & MENU ALLERGEN SCANNER (CHAPTER 6) */}
      {/* ======================================================== */}
      {activeCockpitTab === 'OCR_ALLERGEN' && (
        <div className="space-y-4">
          {/* Top: Bhashini Language Pack Downloader */}
          <div className="p-3 bg-[#161616] border border-[rgba(242,240,235,0.1)] flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <Languages className="w-4 h-4 text-ink-primary" />
              <div>
                <div className="font-bold text-ink-primary text-[10px]">
                  BHASHINI REGIONAL LANGUAGE PACK // {activeDestination.region.toUpperCase()}
                </div>
                <div className="text-[8px] text-ink-secondary mt-0.5">
                  Offline quantized LSTM dictionary for Kannada script & local dining vernacular (24 MB)
                </div>
              </div>
            </div>

            <PopButton
              onClick={downloadBhashiniPack}
              disabled={isBhashiniDownloaded}
              size="sm"
              variant={isBhashiniDownloaded ? 'outline' : 'primary'}
              className="flex items-center gap-1.5"
            >
              <Download className="w-3 h-3" />
              <span>{isBhashiniDownloaded ? 'PACK DOWNLOADED (OFFLINE READY)' : 'DOWNLOAD OFFLINE PACK'}</span>
            </PopButton>
          </div>

          {/* Center: OCR Scanner with Sample Presets & Strict Safety Rules */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-[#161616] border border-[rgba(242,240,235,0.1)] space-y-3">
              <div className="flex items-center justify-between text-[9px] text-ink-muted uppercase">
                <span>INTERACTIVE MENU OCR VIEWFINDER (EOAM)</span>
                <span>ϵ = 0.20 FUZZY LEVENSHTEIN</span>
              </div>

              {/* Real Photo Upload Dropzone & Webcam Capture */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleRunImageFile(file);
                }}
              />

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleRunImageFile(file);
                }}
                onClick={() => !isCameraActive && fileInputRef.current?.click()}
                className="relative min-h-[140px] bg-[#0E0E0E] border border-dashed border-[rgba(242,240,235,0.28)] hover:border-ink-primary flex flex-col items-center justify-center p-3 text-center overflow-hidden cursor-pointer"
              >
                <div className="absolute inset-0 arch-grid-bg opacity-25 pointer-events-none" />
                {isCameraActive ? (
                  <div className="relative z-10 w-full space-y-2" onClick={(e) => e.stopPropagation()}>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full max-h-[160px] object-cover border border-[rgba(242,240,235,0.2)]"
                    />
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={handleCaptureCameraFrame}
                        className="px-3 py-1 bg-ink-primary text-canvas font-bold text-[9px] cursor-pointer"
                      >
                        [ SNAP & RUN TESSERACT OCR ]
                      </button>
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="px-3 py-1 bg-[#222222] text-ink-secondary border border-[rgba(242,240,235,0.2)] text-[9px] cursor-pointer"
                      >
                        CANCEL
                      </button>
                    </div>
                  </div>
                ) : isScanning ? (
                  <div className="relative z-10 flex flex-col items-center gap-1.5 text-semantic-nominal animate-pulse">
                    <Camera className="w-5 h-5 animate-spin" />
                    <span>RUNNING OPENCV + TESSERACT OCR ON {uploadedFileName || 'INPUT'}...</span>
                  </div>
                ) : menuPreviewUrl ? (
                  <div className="relative z-10 w-full space-y-1.5">
                    <img
                      src={menuPreviewUrl}
                      alt="Uploaded Menu Preview"
                      className="max-h-[120px] mx-auto border border-[rgba(242,240,235,0.2)] object-contain"
                    />
                    <div className="text-[8px] text-ink-muted">
                      {uploadedFileName} · CLICK OR DROP ANOTHER MENU IMAGE
                    </div>
                  </div>
                ) : (
                  <div className="relative z-10 text-[9px] text-ink-muted space-y-1">
                    <Upload className="w-5 h-5 mx-auto text-ink-primary" />
                    <div className="text-ink-primary font-bold">
                      DROP MENU PHOTO HERE OR CLICK TO UPLOAD (PNG / JPG)
                    </div>
                    <div className="text-[8px]">
                      SENDS IMAGE TO OPENCV + TESSERACT ENGINE (/api/v1/ocr/scan-menu)
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-ink-primary text-canvas font-bold text-[9px] cursor-pointer flex items-center gap-1.5"
                >
                  <Upload className="w-3 h-3" />
                  <span>[ UPLOAD MENU PHOTO ]</span>
                </button>
                <button
                  type="button"
                  onClick={handleStartCamera}
                  className="px-3 py-1.5 bg-[#1A1A1A] border border-[rgba(242,240,235,0.2)] text-ink-primary hover:border-ink-primary text-[9px] cursor-pointer flex items-center gap-1.5"
                >
                  <Camera className="w-3 h-3" />
                  <span>[ LIVE CAMERA CAPTURE ]</span>
                </button>
              </div>

              {cameraError && (
                <div className="p-2 bg-[#251313] border border-semantic-hazard/50 text-semantic-hazard text-[8px]">
                  [ CAMERA NOTICE: {cameraError} ]
                </div>
              )}

              {/* Raw Text Input Fallback + Sample Helpers */}
              <div className="space-y-1.5 pt-1 border-t border-[rgba(242,240,235,0.08)]">
                <label className="block text-[8px] text-ink-secondary uppercase">
                  OR PASTE RAW MENU TEXT TO SCREEN:
                </label>
                <textarea
                  rows={2}
                  value={menuTextToScan}
                  onChange={(e) => setMenuTextToScan(e.target.value)}
                  placeholder="Paste menu items here (e.g. Peanut Curry, Kaju Pulao, Benne Dosa)..."
                  className="w-full bg-[#111111] border border-[rgba(242,240,235,0.16)] p-2 text-[10px] text-ink-primary focus:border-ink-primary focus:outline-none"
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    disabled={!menuTextToScan.trim() || isScanning}
                    onClick={() => handleRunOcr()}
                    className="px-3 py-1 bg-[#222222] border border-ink-primary text-ink-primary hover:bg-ink-primary hover:text-canvas text-[9px] cursor-pointer disabled:opacity-40"
                  >
                    [ SCAN TEXT INPUT ]
                  </button>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleRunOcr('1. VEG BIRIYANI (FRIED CASHEW & KAJU)\n2. PRAWN CURRY\n3. BADAM HALWA')}
                      className="px-2 py-1 bg-[#1A1A1A] border border-[rgba(242,240,235,0.1)] hover:border-ink-primary text-[8px] text-ink-muted hover:text-ink-primary cursor-pointer"
                    >
                      SAMPLE: CASHEW
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRunOcr('1. BENNE DOSA W/ COCONUT CHUTNEY\n2. STEAMED IDLI\n3. FILTER COFFEE')}
                      className="px-2 py-1 bg-[#1A1A1A] border border-[rgba(242,240,235,0.1)] hover:border-ink-primary text-[8px] text-ink-muted hover:text-ink-primary cursor-pointer"
                    >
                      SAMPLE: IDLI
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* OCR Output & Critical Safety Protocol */}
            <div className="p-4 bg-[#161616] border border-[rgba(242,240,235,0.1)] flex flex-col justify-between">
              <div>
                <div className="text-[9px] text-ink-muted uppercase tracking-widest mb-2">
                  SCANNER RESULT & MANDATORY SAFETY VERIFICATION
                </div>

                {ocrScanResult ? (
                  <div className="space-y-2.5">
                    {ocrScanResult.status === 'HAZARD_ALERT' ? (
                      <div className="p-3 bg-[#2D1515] border border-semantic-hazard text-semantic-hazard">
                        <div className="font-bold text-xs flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4" />
                          <span>STATUS: HAZARD_ALERT</span>
                        </div>
                        <div className="mt-1 text-[9px] font-sans leading-relaxed text-ink-primary">
                          Matched allergen tokens: <span className="font-mono font-bold text-semantic-hazard">{ocrScanResult.matchedAllergens.join(', ')}</span> detected in extracted menu text!
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-[#1C1C1C] border border-[rgba(242,240,235,0.2)] text-ink-primary">
                        <div className="font-bold text-xs flex items-center gap-1.5 text-ink-primary">
                          <CheckCircle2 className="w-4 h-4 text-ink-secondary" />
                          <span>STATUS: NO_MATCH_DETECTED</span>
                        </div>
                        <div className="mt-1 text-[9px] text-ink-secondary font-sans leading-relaxed">
                          No configured allergen keyword was detected in the extracted text ({Math.round((ocrScanResult.confidence || 0) * 100)}% OCR confidence).
                        </div>
                      </div>
                    )}

                    {/* Raw Tesseract Extracted Text Readout */}
                    <div className="p-2.5 bg-[#0E0E0E] border border-[rgba(242,240,235,0.14)]">
                      <div className="text-[8px] text-ink-muted uppercase mb-1">
                        RAW TESSERACT EXTRACTED TEXT:
                      </div>
                      <pre className="text-[9px] font-mono text-ink-secondary whitespace-pre-wrap max-h-24 overflow-y-auto">
                        {ocrScanResult.rawExtractedText || '[EMPTY]'}
                      </pre>
                    </div>

                    {/* MANDATORY DISCLAIMER AS SPECIFIED IN CHAPTER 6 */}
                    <div className="p-2.5 bg-[#121212] border border-[rgba(242,240,235,0.1)] text-[8px] text-ink-muted font-sans leading-relaxed italic">
                      "{ocrScanResult.disclaimer}"
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center text-ink-muted text-[9px]">
                    Upload a menu photo, capture via webcam, or enter menu text to run Tesseract + Levenshtein allergen screening.
                  </div>
                )}
              </div>

              {/* Two-Way Phrase Translator Sample */}
              <div className="pt-2 border-t border-[rgba(242,240,235,0.08)] mt-3 flex items-center justify-between text-[8px] text-ink-secondary">
                <div className="flex items-center space-x-1">
                  <Volume2 className="w-3 h-3 text-ink-primary" />
                  <span>"Idaralli kadalekaayi ideya?" (Kannada: Does this contain peanuts?)</span>
                </div>
                <span className="font-bold text-ink-primary">[PLAY AUDIO]</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: DISRUPTION REROUTE, MEDICAL KIT & ETIQUETTE       */}
      {/* ======================================================== */}
      {activeCockpitTab === 'DISRUPTION_SAFETY' && (
        <div className="space-y-4">
          {/* Weather Disruption Simulator Toggle */}
          <div className="p-4 bg-[#161616] border border-ink-primary/30 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <CloudRain className="w-4 h-4 text-ink-primary" />
                <span className="font-bold text-ink-primary text-xs">
                  SCRIPTED WEATHER / TRAFFIC DISRUPTION SIMULATOR
                </span>
              </div>
              <p className="text-[9px] text-ink-secondary mt-1 font-sans">
                Simulates heavy monsoon rain in Hampi/Coorg. Toggling instantaneously swaps exposed outdoor boulder trails for indoor heritage palaces (Lotus Mahal, Archaeological Museum) and shifts visit windows.
              </p>
            </div>

            <PopButton
              onClick={toggleStormDisruption}
              size="md"
              variant={isStormDisrupted ? 'danger' : 'outline'}
              className="shrink-0 font-bold"
            >
              {isStormDisrupted ? 'STORM ACTIVE: INDOOR REROUTED' : 'SIMULATE STORM / DISRUPTION'}
            </PopButton>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customized Medical Aid Kit */}
            <div className="p-4 bg-[#161616] border border-[rgba(242,240,235,0.1)]">
              <div className="flex items-center justify-between text-[9px] text-ink-muted uppercase tracking-widest mb-3">
                <span>COHORT MEDICAL AID KIT</span>
                <span className="text-semantic-nominal">4 CUSTOM ITEMS</span>
              </div>

              <div className="space-y-2 text-[9px]">
                <div className="p-2 bg-[#1A1A1A] border border-[rgba(242,240,235,0.08)] flex justify-between">
                  <span>AARAV (ASTHMA):</span>
                  <span className="text-ink-primary font-bold">Salbutamol 100mcg Inhaler</span>
                </div>
                <div className="p-2 bg-[#1A1A1A] border border-[rgba(242,240,235,0.08)] flex justify-between">
                  <span>KABIR (NUT ALLERGY):</span>
                  <span className="text-semantic-hazard font-bold">Epinephrine Auto-Injector (EpiPen 0.15mg)</span>
                </div>
                <div className="p-2 bg-[#1A1A1A] border border-[rgba(242,240,235,0.08)] flex justify-between">
                  <span>NEHA (MOTION SICKNESS):</span>
                  <span className="text-ink-primary font-bold">Dimenhydrinate 50mg (Dramamine)</span>
                </div>
                <div className="p-2 bg-[#1A1A1A] border border-[rgba(242,240,235,0.08)] flex justify-between">
                  <span>DEVIKA (HYPERTENSION & ARTHRITIS):</span>
                  <span className="text-ink-primary font-bold">Amlodipine 5mg + Knee Support Brace</span>
                </div>
              </div>
            </div>

            {/* Regional Etiquette & Regulatory Checklist */}
            <div className="p-4 bg-[#161616] border border-[rgba(242,240,235,0.1)] flex flex-col justify-between">
              <div>
                <div className="text-[9px] text-ink-muted uppercase tracking-widest mb-3">
                  REGIONAL HERITAGE ETIQUETTE & ASI RULES
                </div>
                <ul className="space-y-1.5 text-[9px] text-ink-secondary font-sans leading-relaxed">
                  <li>• <span className="text-ink-primary font-semibold">ASI Sanctum Rule:</span> Footwear strictly prohibited inside active Virupaksha shrines.</li>
                  <li>• <span className="text-ink-primary font-semibold">Coracle River Crossing:</span> Mandatory certified life-vests during Tungabhadra crossings.</li>
                  <li>• <span className="text-ink-primary font-semibold">Commercial Drone Ban:</span> Drone photography restricted within 500m of World Heritage monuments.</li>
                  <li>• <span className="text-ink-primary font-semibold">Hydration Warning:</span> Granite boulder heat retention increases midday ambient temps by +4°C.</li>
                </ul>
              </div>

              <div className="pt-2 border-t border-[rgba(242,240,235,0.08)] text-[8px] text-ink-muted mt-2">
                SOURCE: ARCHAEOLOGICAL SURVEY OF INDIA (HAMPI CIRCLE)
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
