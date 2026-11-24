import React, { useState } from 'react';
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
  Volume2 
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

  // OCR state
  const [menuTextToScan, setMenuTextToScan] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);

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

  const handleRunOcr = (preset?: string) => {
    setIsScanning(true);
    setTimeout(() => {
      runOcrScan(preset || menuTextToScan);
      setIsScanning(false);
    }, 400);
  };

  return (
    <div className="w-full bg-[#121212] border border-[rgba(242,240,235,0.12)] p-4 font-mono text-[11px] select-none">
      {/* Hairline Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between border-b border-[rgba(242,240,235,0.12)] pb-3 mb-4 gap-2">
        <div className="flex items-center space-x-1 sm:space-x-2">
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
                onClick={() => setActiveCockpitTab(tab.id)}
                className={`relative px-3 py-1.5 flex items-center space-x-1.5 text-[10px] transition-all cursor-pointer z-10 ${
                  isActive
                    ? '!text-[#0E0E0E] font-bold'
                    : 'text-ink-secondary hover:text-ink-primary bg-[#161616] border border-[rgba(242,240,235,0.08)]'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeCockpitTabIndicator"
                    className="absolute inset-0 bg-ink-primary -z-10 shadow-md"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Real-time status pill */}
        <div className="text-[9px] text-ink-muted">
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
              <span>✓ COMPENSATORY RE-PLAN APPLIED: Replaced paid monument tickets with free panoramic viewpoints. Future daily pace reduced by ₹{Math.round(netOverspend / 3)}.</span>
              <span className="font-bold">ω_act_buf = 0.50 TRIM APPLIED</span>
            </div>
          )}

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
                    <option value="stays">Stays (35%)</option>
                    <option value="food">Food & Dining (25%)</option>
                    <option value="transit">Local Transit (20%)</option>
                    <option value="activitiesAndBuffer">Activities & Buffer (20%)</option>
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
          <div className="flex items-center justify-between text-[9px] text-ink-muted uppercase tracking-widest pb-1 border-b border-[rgba(242,240,235,0.08)]">
            <span>NEARBY DINING OPTIONS // FILTERED FOR: {groupAllergies.join(', ') || 'NONE'}</span>
            <span>PER-MEAL CAP: ₹1,000 FOR TWO</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {diningOptions.map(din => {
              const hasAllergenConflict = din.allergenFlags.some(a => groupAllergies.includes(a as any));

              return (
                <PopCard
                  key={din.id}
                  className={`p-3.5 transition-all ${
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
                        {din.cuisine} · {din.distanceKm} km away
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <div className="text-sm font-bold text-ink-primary">
                        ₹{din.costForTwo} <span className="text-[8px] font-normal text-ink-muted">for two</span>
                      </div>
                      <div className="text-[8px] text-semantic-nominal">
                        ★ {din.rating} RATING
                      </div>
                    </div>
                  </div>

                  {/* Dietary & Allergen tags */}
                  <div className="mt-3 flex flex-wrap gap-1">
                    {din.dietaryTags.map(tag => (
                      <span key={tag} className="px-1.5 py-0.2 bg-[#202020] border border-[rgba(242,240,235,0.12)] text-ink-secondary text-[8px]">
                        {tag}
                      </span>
                    ))}
                    {din.allergenFlags.map(af => (
                      <span key={af} className="px-1.5 py-0.2 bg-[#2D1616] border border-semantic-hazard text-semantic-hazard text-[8px] font-bold">
                        RISK: {af.toUpperCase()}
                      </span>
                    ))}
                  </div>

                  {/* Status Banner */}
                  <div className="mt-2.5 pt-2 border-t border-[rgba(242,240,235,0.06)] flex items-center justify-between text-[8px]">
                    <span className="text-ink-muted">{din.address}</span>
                    {hasAllergenConflict ? (
                      <span className="text-semantic-hazard font-bold">
                        ⚠️ EXCLUDED BY ALLERGY PROTOCOL
                      </span>
                    ) : (
                      <span className="text-semantic-nominal font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> VERIFIED SAFE
                      </span>
                    )}
                  </div>
                </PopCard>
              );
            })}
          </div>
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

              {/* Sample Menu Presets */}
              <div className="space-y-1">
                <span className="text-[8px] text-ink-secondary block uppercase">TEST SCAN SAMPLES:</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleRunOcr(`
TUNGABHADRA HERITAGE SPECIALS:
1. VEG BIRIYANI (W/ FRIED CASHEW NUTS & KAJU)
2. PRAWN CURRY W/ COCONUT MILK
3. BADAM HALWA (CRUSHED ALMONDS)
4. STEAMED BASMATI RICE
                    `)}
                    className="p-2 bg-[#1A1A1A] border border-[rgba(242,240,235,0.1)] hover:border-ink-primary text-left text-[9px] text-ink-primary cursor-pointer"
                  >
                    [SCAN MENU 1: CASHEW & PRAWN]
                  </button>

                  <button
                    onClick={() => handleRunOcr(`
SHIVA BHAVAN PURE VEG:
1. BENNE DOSA W/ COCONUT CHUTNEY
2. STEAMED RICE IDLI (3 PCS)
3. SAMBAR W/ DRUMSTICK & TOMATO
4. FILTER COFFEE
                    `)}
                    className="p-2 bg-[#1A1A1A] border border-[rgba(242,240,235,0.1)] hover:border-ink-primary text-left text-[9px] text-ink-primary cursor-pointer"
                  >
                    [SCAN MENU 2: PURE VEGETARIAN]
                  </button>
                </div>
              </div>

              {/* Viewfinder simulator */}
              <div className="relative h-28 bg-[#0E0E0E] border border-[rgba(242,240,235,0.2)] flex items-center justify-center p-2 text-center overflow-hidden">
                <div className="absolute inset-0 arch-grid-bg opacity-30" />
                {isScanning ? (
                  <div className="relative z-10 flex flex-col items-center gap-1 text-semantic-nominal animate-pulse">
                    <Camera className="w-5 h-5 animate-spin" />
                    <span>APPLYING OTSU THRESHOLD & TESSERACT 5.3...</span>
                  </div>
                ) : (
                  <div className="relative z-10 text-[9px] text-ink-muted">
                    <Camera className="w-4 h-4 mx-auto mb-1 text-ink-secondary" />
                    <span>CAMERA VIEWFINDER ACTIVE // 3×3 RECTANGULAR CLOSING FILTER READY</span>
                  </div>
                )}
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
                          Matched allergen tokens: <span className="font-mono font-bold text-semantic-hazard">{ocrScanResult.matchedAllergens.join(', ')}</span> detected in menu text!
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-[#1C1C1C] border border-[rgba(242,240,235,0.2)] text-ink-primary">
                        <div className="font-bold text-xs flex items-center gap-1.5 text-ink-primary">
                          <CheckCircle2 className="w-4 h-4 text-ink-secondary" />
                          <span>STATUS: NO_MATCH_DETECTED</span>
                        </div>
                        <div className="mt-1 text-[9px] text-ink-secondary font-sans leading-relaxed">
                          No configured allergen keyword was detected in the scanned text.
                        </div>
                      </div>
                    )}

                    {/* MANDATORY DISCLAIMER AS SPECIFIED IN CHAPTER 6 */}
                    <div className="p-2.5 bg-[#121212] border border-[rgba(242,240,235,0.1)] text-[8px] text-ink-muted font-sans leading-relaxed italic">
                      "{ocrScanResult.disclaimer}"
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center text-ink-muted text-[9px]">
                    No menu scanned yet. Click one of the test scan samples above to run the EOAM pipeline.
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
