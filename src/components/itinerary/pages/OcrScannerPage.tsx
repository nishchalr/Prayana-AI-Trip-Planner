import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePrayana } from '../../../context/PrayanaContext';
import { CompassLoader } from '../../common/CompassLoader';
import {
  OCRParseMenuResponse,
  ParsedMenuItem,
  parseMenuStructured,
  translateText as apiTranslateText,
} from '../../../services/apiClient';
import {
  SUPPORTED_CURRENCIES,
  TRANSLATOR_LANGUAGES,
  convertAmount,
  detectInputMode,
  deterministicClientMenuParse,
  deterministicTextTranslate,
  evaluateDishForCohort,
  fetchLiveFxRatesToInr,
  formatCurrencyValue,
  getCachedFxRates,
  resolveRuleKeywords,
  speakInLocalLanguage,
} from '../../../utils/menuParserFallback';
import {
  FLUID_GESTURE_TAP,
  FLUID_ISLAND_SPRING,
  FLUID_MODAL_TRANSITION,
  FLUID_SPRING,
} from '../../../motion/fluidTokens';
import {
  AlertTriangle,
  ArrowLeftRight,
  Camera,
  Check,
  CheckCircle2,
  Flame,
  Languages,
  Mic,
  MicOff,
  Minus,
  Plus,
  Receipt,
  Search,
  ShieldAlert,
  Upload,
  Volume2,
  Wallet,
  X,
} from 'lucide-react';

const SAMPLE_MENUS = {
  MALAYSIAN: `Teh Tarik Ais | Iced Pulled Milk Tea RM 4.15
Kopi O Kosong | Black Coffee RM 2.80
Nasi Lemak Ayam | Coconut Rice with Fried Chicken & Peanuts RM 12.50
Char Kuey Teow Udang | Stir-Fried Flat Noodles with Prawns RM 11.90`,
  KANNADA: `1. BENNE DOSA W/ COCONUT CHUTNEY ₹140
2. STEAMED IDLI VADA COMBO ₹95
3. VEG BIRIYANI (FRIED CASHEW & KAJU) ₹240
4. FILTER COFFEE ₹55`,
  JAPANESE: `抹茶ラテ | Matcha Latte ¥620
海老天ぷらうどん | Prawn Tempura Udon ¥1180
焼き鳥 | Grilled Chicken Skewers ¥780`,
};

const SAMPLE_PHRASE = 'Where is the nearest train station?';

export const OcrScannerPage: React.FC = () => {
  const {
    activeDestination,
    activeTrip,
    travelers,
    isBhashiniDownloaded,
    downloadBhashiniPack,
    runOcrScan,
    addExpense,
    theme,
  } = usePrayana();
  const isLight = theme === 'light';

  const cohortAllergens = useMemo(() => {
    const set = new Set<string>();
    (travelers || []).forEach((t) => {
      (t.dietaryTags || []).forEach((tag) => {
        if (tag && tag !== 'None') set.add(tag);
      });
    });
    return Array.from(set);
  }, [travelers]);

  const [menuTextToScan, setMenuTextToScan] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [menuPreviewUrl, setMenuPreviewUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Mode & Language Picker + Live Mic
  const [modeOverride, setModeOverride] = useState<'AUTO' | 'MENU' | 'TEXT'>('AUTO');
  const [resolvedMode, setResolvedMode] = useState<'MENU' | 'TEXT'>('MENU');
  const [sourceLanguage, setSourceLanguage] = useState<string>('auto');
  const [targetLanguage, setTargetLanguage] = useState<string>('en');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [micNotice, setMicNotice] = useState<string | null>(null);
  const [textTranslation, setTextTranslation] = useState<{
    original: string;
    translated: string;
    detectedSource: string;
    targetLang: string;
  } | null>(null);

  // Structured parsed menu + interactive cart + modals
  const [parsedMenu, setParsedMenu] = useState<OCRParseMenuResponse | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [selectedDish, setSelectedDish] = useState<ParsedMenuItem | null>(null);
  const [isWaiterCardOpen, setIsWaiterCardOpen] = useState<boolean>(false);
  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState<boolean>(false);
  const [currencySearch, setCurrencySearch] = useState<string>('');
  const [sourceCurrencyOverride, setSourceCurrencyOverride] = useState<string>('AUTO');
  const [targetCurrency, setTargetCurrency] = useState<string>('INR');
  const [fxRates, setFxRates] = useState<Record<string, number>>(() => getCachedFxRates());
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [budgetLoggedSuccess, setBudgetLoggedSuccess] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<unknown>(null);

  useEffect(() => {
    void fetchLiveFxRatesToInr().then(setFxRates);
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
      if (menuPreviewUrl) URL.revokeObjectURL(menuPreviewUrl);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current && typeof (recognitionRef.current as { stop?: () => void }).stop === 'function') {
        (recognitionRef.current as { stop: () => void }).stop();
      }
    };
  }, []);

  const executeInput = async (opts: { imageFile?: File; sampleText?: string }) => {
    setIsScanning(true);
    setBudgetLoggedSuccess(false);
    setVoiceNotice(null);
    setMicNotice(null);
    try {
      const textInput = (opts.sampleText || '').trim();
      const autoMode = opts.imageFile ? 'MENU' : detectInputMode(textInput);
      const effectiveMode = modeOverride === 'AUTO' ? autoMode : modeOverride;
      setResolvedMode(effectiveMode);

      if (effectiveMode === 'TEXT' && textInput) {
        setParsedMenu(null);
        const apiRes = await apiTranslateText(textInput, sourceLanguage, targetLanguage);
        if (apiRes && apiRes.translated_text && !apiRes.translated_text.startsWith('[')) {
          setTextTranslation({
            original: apiRes.original_text,
            translated: apiRes.translated_text,
            detectedSource: apiRes.detected_source_language,
            targetLang: apiRes.target_language,
          });
        } else {
          const fallback = deterministicTextTranslate(textInput, sourceLanguage, targetLanguage);
          setTextTranslation({
            original: textInput,
            translated: fallback.translatedText,
            detectedSource: fallback.detectedSource,
            targetLang: targetLanguage,
          });
        }
        return;
      }

      setTextTranslation(null);
      const [structured] = await Promise.all([
        parseMenuStructured(opts.imageFile ?? null, opts.sampleText, cohortAllergens, targetCurrency),
        runOcrScan(opts),
      ]);

      // Use deterministic fallback when offline or if sample currency wasn't preserved
      const clientFallback = deterministicClientMenuParse(textInput, cohortAllergens);
      const finalResult =
        structured && structured.categories.length > 0
          ? structured
          : clientFallback;

      // Ensure sample MYR/JPY currency is never overridden to INR on the source dish
      if (textInput && clientFallback.detected_currency !== 'INR' && finalResult.detected_currency === 'INR') {
        finalResult.detected_currency = clientFallback.detected_currency;
        finalResult.categories.forEach((cat) =>
          cat.items.forEach((it) => {
            it.currency = clientFallback.detected_currency;
          })
        );
      }

      setParsedMenu(finalResult);
      setActiveCategory('All');
      setSourceCurrencyOverride('AUTO');
      setCart({});
    } finally {
      setIsScanning(false);
    }
  };

  const handleRunTextScan = async (preset?: string) => {
    const text = (preset ?? menuTextToScan).trim();
    if (!text) return;
    if (preset) setMenuTextToScan(preset);
    await executeInput({ sampleText: text });
  };

  const handleRunImageFile = async (file: File) => {
    stopCamera();
    if (menuPreviewUrl) URL.revokeObjectURL(menuPreviewUrl);
    setMenuPreviewUrl(URL.createObjectURL(file));
    setUploadedFileName(file.name);
    setCameraError(null);
    await executeInput({ imageFile: file });
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to access camera.';
      setCameraError(msg);
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

  const handleToggleMic = () => {
    setMicNotice(null);
    if (isListening && recognitionRef.current) {
      (recognitionRef.current as { stop: () => void }).stop();
      setIsListening(false);
      return;
    }

    const win = window as unknown as {
      SpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        maxAlternatives: number;
        onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
        onerror: (e: { error?: string }) => void;
        onend: () => void;
        start: () => void;
        stop: () => void;
      };
      webkitSpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        maxAlternatives: number;
        onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
        onerror: (e: { error?: string }) => void;
        onend: () => void;
        start: () => void;
        stop: () => void;
      };
    };

    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRec) {
      setMicNotice('Live SpeechRecognition is unsupported in this browser. Type or paste text below.');
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.lang = sourceLanguage === 'auto' ? 'en-IN' : sourceLanguage;
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript || '';
        if (transcript.trim()) {
          setMenuTextToScan(transcript);
          void executeInput({ sampleText: transcript });
        }
      };
      rec.onerror = (err) => {
        setMicNotice(`Microphone notice: ${err?.error || 'unavailable'}`);
        setIsListening(false);
      };
      rec.onend = () => setIsListening(false);
      recognitionRef.current = rec;
      setIsListening(true);
      rec.start();
    } catch {
      setMicNotice('Could not start microphone recognition.');
      setIsListening(false);
    }
  };

  const allItems = useMemo(() => {
    if (!parsedMenu) return [];
    return parsedMenu.categories.flatMap((c) => c.items);
  }, [parsedMenu]);

  const categoryNames = useMemo(() => {
    if (!parsedMenu) return ['All'];
    return ['All', ...parsedMenu.categories.map((c) => c.name)];
  }, [parsedMenu]);

  const visibleItems = useMemo(() => {
    if (!parsedMenu) return [];
    if (activeCategory === 'All') return allItems;
    return parsedMenu.categories.find((c) => c.name === activeCategory)?.items ?? [];
  }, [parsedMenu, activeCategory, allItems]);

  const effectiveSourceCurrency =
    sourceCurrencyOverride === 'AUTO'
      ? parsedMenu?.detected_currency || 'INR'
      : sourceCurrencyOverride;

  const updateCartQty = (dishId: string, delta: number) => {
    setBudgetLoggedSuccess(false);
    setCart((prev) => {
      const nextQty = (prev[dishId] || 0) + delta;
      if (nextQty <= 0) {
        const copy = { ...prev };
        delete copy[dishId];
        return copy;
      }
      return { ...prev, [dishId]: nextQty };
    });
  };

  const cartEntries = useMemo(() => {
    return allItems
      .filter((item) => (cart[item.id] || 0) > 0)
      .map((item) => ({ item, qty: cart[item.id] }));
  }, [allItems, cart]);

  const totalItemsCount = useMemo(
    () => cartEntries.reduce((sum, e) => sum + e.qty, 0),
    [cartEntries]
  );

  const totalOriginalAmount = useMemo(
    () => cartEntries.reduce((sum, e) => sum + e.item.price * e.qty, 0),
    [cartEntries]
  );

  const totalTargetAmount = useMemo(
    () => convertAmount(totalOriginalAmount, effectiveSourceCurrency, targetCurrency, fxRates),
    [totalOriginalAmount, effectiveSourceCurrency, targetCurrency, fxRates]
  );

  const totalInrAmount = useMemo(
    () => convertAmount(totalOriginalAmount, effectiveSourceCurrency, 'INR', fxRates),
    [totalOriginalAmount, effectiveSourceCurrency, fxRates]
  );

  const handleLogOrderToBudget = () => {
    if (cartEntries.length === 0) return;
    const labelSummary = cartEntries
      .slice(0, 2)
      .map((e) => `${e.item.name_en} ×${e.qty}`)
      .join(', ');
    const extraCount = cartEntries.length > 2 ? ` +${cartEntries.length - 2}` : '';
    addExpense({
      category: 'food',
      amount: Math.max(1, Math.round(totalInrAmount)),
      description: `Food & Dining · Menu Order (${labelSummary}${extraCount})`,
      dayIndex: activeTrip?.dayIndex ?? 1,
    });
    setBudgetLoggedSuccess(true);
  };

  const handleSpeak = (text: string, langCode: string) => {
    const res = speakInLocalLanguage(text, langCode);
    if (!res.supported) {
      setVoiceNotice('Browser Speech Synthesis is unavailable on this device.');
    } else if (!res.voiceFound) {
      setVoiceNotice(
        `No native "${langCode.toUpperCase()}" voice pack installed on this OS — playing with default system voice.`
      );
    } else {
      setVoiceNotice(null);
    }
  };

  const handleSpeakFullOrder = () => {
    if (!parsedMenu || cartEntries.length === 0) return;
    const itemLines = cartEntries.map((e) => `${e.qty} ${e.item.name_original}`).join('. ');
    const allergy = parsedMenu.allergy_notice_local ? `${parsedMenu.allergy_notice_local}. ` : '';
    const script = `${parsedMenu.greeting_local}. ${itemLines}. ${allergy}${parsedMenu.closing_local}`;
    handleSpeak(script, parsedMenu.detected_language);
  };

  const filteredCurrencies = useMemo(() => {
    const q = currencySearch.trim().toLowerCase();
    if (!q) return SUPPORTED_CURRENCIES;
    return SUPPORTED_CURRENCIES.filter(
      (c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
    );
  }, [currencySearch]);

  const cardSurface = isLight
    ? 'bg-[#FFFFFF] border-[rgba(17,17,17,0.16)]'
    : 'bg-[#151515] border-[rgba(242,240,235,0.14)]';
  const panelSurface = isLight
    ? 'bg-[#F9F8F4] border-[rgba(17,17,17,0.14)]'
    : 'bg-[#121212] border-[rgba(242,240,235,0.12)]';

  return (
    <div className="relative w-full space-y-5 pb-24 font-mono text-[13px] select-none">
      {/* Top: Bhashini Pack + Mode Switcher + Language Picker */}
      <div className={`p-4 border flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${panelSurface}`}>
        <div className="flex items-center space-x-2.5">
          <Languages className="w-4 h-4 text-[var(--ink-primary)] shrink-0" />
          <div>
            <div className="font-bold text-[var(--ink-primary)] text-[12px]">
              AI MENU &amp; VOICE TRANSLATOR // {activeDestination.region.toUpperCase()}
            </div>
            <div className="text-[11px] text-[var(--ink-secondary)] mt-0.5">
              Auto-detects Menus (INR FX &amp; 3-tier cohort safety) vs. General Signs/Phrases + Live Mic
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* AUTO | MENU | TEXT Segmented Pill */}
          <div className="flex items-center border border-[var(--hairline)] bg-[var(--bg-canvas)] p-0.5">
            {(['AUTO', 'MENU', 'TEXT'] as const).map((m) => {
              const active = modeOverride === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModeOverride(m)}
                  className={`relative px-2.5 py-1 text-[10px] font-bold uppercase cursor-pointer z-10 transition-colors ${
                    active ? 'text-[var(--bg-canvas)]' : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="translatorModePill"
                      transition={FLUID_SPRING}
                      className="absolute inset-0 bg-[var(--ink-primary)] -z-10"
                    />
                  )}
                  <span>{m}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={downloadBhashiniPack}
            disabled={isBhashiniDownloaded}
            className={`px-3 py-1.5 border text-[11px] font-bold uppercase tracking-wider shrink-0 cursor-pointer transition-colors ${
              isBhashiniDownloaded
                ? 'border-[var(--hairline)] bg-[var(--bg-surface)] text-[var(--ink-secondary)] opacity-80 cursor-default'
                : 'border-[var(--ink-primary)] bg-[var(--ink-primary)] text-[var(--bg-canvas)] hover:opacity-90'
            }`}
          >
            {isBhashiniDownloaded ? 'OFFLINE PACK READY' : 'DOWNLOAD PACK'}
          </button>
        </div>
      </div>

      {/* Language Picker & Scanner Input Viewfinder */}
      <div className={`p-4 border space-y-3.5 ${cardSurface}`}>
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--ink-muted)] uppercase">
          <div className="flex flex-wrap items-center gap-2">
            <span>SOURCE:</span>
            <select
              value={sourceLanguage}
              onChange={(e) => setSourceLanguage(e.target.value)}
              aria-label="Source Language"
              className="px-2 py-1 border border-[var(--hairline)] bg-[var(--bg-canvas)] text-[var(--ink-primary)] text-[11px] focus:outline-none"
            >
              {TRANSLATOR_LANGUAGES.map((l) => (
                <option key={`src-${l.code}`} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
            <ArrowLeftRight className="w-3 h-3 text-[var(--ink-muted)]" />
            <span>TARGET:</span>
            <select
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              aria-label="Target Language"
              className="px-2 py-1 border border-[var(--hairline)] bg-[var(--bg-canvas)] text-[var(--ink-primary)] text-[11px] focus:outline-none"
            >
              {TRANSLATOR_LANGUAGES.filter((l) => l.code !== 'auto').map((l) => (
                <option key={`tgt-${l.code}`} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          <span>
            COHORT:{' '}
            <strong className="text-[var(--ink-primary)]">
              {cohortAllergens.length > 0 ? cohortAllergens.join(', ') : 'NONE'}
            </strong>
          </span>
        </div>

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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left: Dropzone / Camera */}
          <div className="lg:col-span-5 space-y-2.5">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) handleRunImageFile(file);
              }}
              onClick={() => !isCameraActive && fileInputRef.current?.click()}
              className={`relative min-h-[160px] border border-dashed flex flex-col items-center justify-center p-4 text-center overflow-hidden cursor-pointer transition-colors ${
                isLight
                  ? 'bg-[#F4F3EF] border-[rgba(17,17,17,0.28)] hover:border-[#111111]'
                  : 'bg-[#0E0E0E] border-[rgba(242,240,235,0.26)] hover:border-[#F2F0EB]'
              }`}
            >
              {isCameraActive ? (
                <div className="relative z-10 w-full space-y-2" onClick={(e) => e.stopPropagation()}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full max-h-[180px] object-cover border border-[var(--hairline)]"
                  />
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={handleCaptureCameraFrame}
                      className="px-3 py-1 bg-[var(--ink-primary)] text-[var(--bg-canvas)] font-bold text-[11px] cursor-pointer"
                    >
                      [ SNAP &amp; TRANSLATE ]
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-3 py-1 border border-[var(--hairline)] bg-[var(--bg-surface)] text-[var(--ink-secondary)] text-[11px] cursor-pointer"
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              ) : isScanning ? (
                <CompassLoader
                  variant="overlay"
                  theme={theme}
                  statusText="TRANSLATING & SCREENING INPUT..."
                />
              ) : menuPreviewUrl ? (
                <div className="relative z-10 w-full space-y-2">
                  <img
                    src={menuPreviewUrl}
                    alt="Uploaded Menu Preview"
                    className="max-h-[130px] mx-auto border border-[var(--hairline)] object-contain"
                  />
                  <div className="text-[11px] text-[var(--ink-muted)]">
                    {uploadedFileName} · CLICK OR DROP ANOTHER IMAGE
                  </div>
                </div>
              ) : (
                <div className="relative z-10 text-[11px] text-[var(--ink-muted)] space-y-1.5">
                  <Upload className="w-5 h-5 mx-auto text-[var(--ink-primary)]" />
                  <div className="text-[var(--ink-primary)] font-bold">
                    DROP MENU OR SIGN PHOTO TO SCAN
                  </div>
                  <div>AUTO-DETECTS MENU ITEMS VS. GENERAL TEXT</div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <motion.button
                type="button"
                {...FLUID_GESTURE_TAP}
                transition={FLUID_ISLAND_SPRING}
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 bg-[var(--ink-primary)] text-[var(--bg-canvas)] font-bold text-[11px] cursor-pointer flex items-center gap-1.5"
              >
                <Upload className="w-3 h-3" />
                <span>[ UPLOAD PHOTO ]</span>
              </motion.button>
              <motion.button
                type="button"
                {...FLUID_GESTURE_TAP}
                transition={FLUID_ISLAND_SPRING}
                onClick={handleStartCamera}
                className="px-3 py-1.5 border border-[var(--hairline-strong)] bg-[var(--bg-surface)] text-[var(--ink-primary)] hover:border-[var(--ink-primary)] text-[11px] cursor-pointer flex items-center gap-1.5"
              >
                <Camera className="w-3 h-3" />
                <span>[ LIVE CAMERA ]</span>
              </motion.button>
              <motion.button
                type="button"
                {...FLUID_GESTURE_TAP}
                transition={FLUID_ISLAND_SPRING}
                onClick={handleToggleMic}
                className={`relative px-3 py-1.5 border text-[11px] font-bold cursor-pointer flex items-center gap-1.5 ${
                  isListening
                    ? 'border-red-500 text-red-500 bg-[var(--bg-canvas)]'
                    : 'border-[var(--hairline-strong)] bg-[var(--bg-surface)] text-[var(--ink-primary)] hover:border-[var(--ink-primary)]'
                }`}
              >
                {isListening && (
                  <motion.span
                    animate={{ scale: [1, 1.35, 1], opacity: [0.8, 0.2, 0.8] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                    className="w-2 h-2 rounded-full bg-red-500"
                  />
                )}
                {isListening ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                <span>{isListening ? '[ LISTENING... ]' : '[ 🎙️ MIC ]'}</span>
              </motion.button>
            </div>

            {cameraError && (
              <div className="p-2 border border-[var(--hairline-strong)] text-[11px] text-red-500">
                [ CAMERA NOTICE: {cameraError} ]
              </div>
            )}
            {micNotice && (
              <div className="p-2 border border-[var(--hairline)] text-[11px] text-[var(--ink-secondary)]">
                [ MIC NOTICE: {micNotice} ]
              </div>
            )}
          </div>

          {/* Right: Text Input + Quick Samples */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-2.5">
            <div className="space-y-1.5">
              <label className="block text-[11px] text-[var(--ink-secondary)] uppercase">
                PASTE MENU OR PHRASE / SIGN TEXT:
              </label>
              <textarea
                rows={4}
                value={menuTextToScan}
                onChange={(e) => setMenuTextToScan(e.target.value)}
                placeholder="Paste a menu (e.g. Teh Tarik Ais RM 4.15) OR a phrase (e.g. Where is the nearest train station?)..."
                className={`w-full border p-2.5 text-[12px] text-[var(--ink-primary)] focus:border-[var(--ink-primary)] focus:outline-none ${
                  isLight
                    ? 'bg-[#F4F3EF] border-[rgba(17,17,17,0.18)]'
                    : 'bg-[#0E0E0E] border-[rgba(242,240,235,0.16)]'
                }`}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <motion.button
                type="button"
                {...FLUID_GESTURE_TAP}
                transition={FLUID_ISLAND_SPRING}
                disabled={!menuTextToScan.trim() || isScanning}
                onClick={() => handleRunTextScan()}
                className="px-3.5 py-1.5 bg-[var(--ink-primary)] text-[var(--bg-canvas)] font-bold text-[11px] cursor-pointer disabled:opacity-40"
              >
                {isScanning ? '[ TRANSLATING... ]' : '[ TRANSLATE & SCREEN ]'}
              </motion.button>

              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleRunTextScan(SAMPLE_MENUS.MALAYSIAN)}
                  className="px-2.5 py-1 border border-[var(--hairline)] bg-[var(--bg-surface)] hover:border-[var(--ink-primary)] text-[11px] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] cursor-pointer"
                >
                  SAMPLE: KOPITIAM (MYR)
                </button>
                <button
                  type="button"
                  onClick={() => handleRunTextScan(SAMPLE_MENUS.KANNADA)}
                  className="px-2.5 py-1 border border-[var(--hairline)] bg-[var(--bg-surface)] hover:border-[var(--ink-primary)] text-[11px] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] cursor-pointer"
                >
                  SAMPLE: KARNATAKA (INR)
                </button>
                <button
                  type="button"
                  onClick={() => handleRunTextScan(SAMPLE_MENUS.JAPANESE)}
                  className="px-2.5 py-1 border border-[var(--hairline)] bg-[var(--bg-surface)] hover:border-[var(--ink-primary)] text-[11px] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] cursor-pointer"
                >
                  SAMPLE: IZAKAYA (JPY)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTargetLanguage((prev) => (prev === 'en' ? 'ja' : prev));
                    void executeInput({ sampleText: SAMPLE_PHRASE });
                  }}
                  className="px-2.5 py-1 border border-[var(--hairline)] bg-[var(--bg-surface)] hover:border-[var(--ink-primary)] text-[11px] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] cursor-pointer"
                >
                  SAMPLE: PHRASE
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* General Text / Sign / Phrase Translation Card */}
      <AnimatePresence mode="popLayout">
        {resolvedMode === 'TEXT' && textTranslation && (
          <motion.div
            key="text-translation-card"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={FLUID_ISLAND_SPRING}
            className={`p-4 border space-y-4 ${cardSurface}`}
          >
            <div className="flex items-center justify-between border-b border-[var(--hairline)] pb-2.5 text-[11px] text-[var(--ink-muted)] uppercase">
              <span>GENERAL TEXT / PHRASE TRANSLATION</span>
              <span>
                {textTranslation.detectedSource.toUpperCase()} → {textTranslation.targetLang.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`p-3.5 border space-y-2 ${panelSurface}`}>
                <div className="flex items-center justify-between text-[10px] text-[var(--ink-muted)] uppercase">
                  <span>ORIGINAL ({textTranslation.detectedSource.toUpperCase()})</span>
                  <button
                    type="button"
                    onClick={() => handleSpeak(textTranslation.original, textTranslation.detectedSource)}
                    className="px-2 py-0.5 border border-[var(--hairline)] text-[var(--ink-primary)] hover:border-[var(--ink-primary)] flex items-center gap-1 cursor-pointer"
                  >
                    <Volume2 className="w-3 h-3" />
                    <span>▶ LISTEN</span>
                  </button>
                </div>
                <div className="font-serif text-xl text-[var(--ink-primary)] leading-snug">
                  {textTranslation.original}
                </div>
              </div>

              <div className={`p-3.5 border space-y-2 ${panelSurface}`}>
                <div className="flex items-center justify-between text-[10px] text-[var(--ink-muted)] uppercase">
                  <span>TRANSLATED ({textTranslation.targetLang.toUpperCase()})</span>
                  <button
                    type="button"
                    onClick={() => handleSpeak(textTranslation.translated, textTranslation.targetLang)}
                    className="px-2 py-0.5 border border-[var(--ink-primary)] bg-[var(--ink-primary)] text-[var(--bg-canvas)] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Volume2 className="w-3 h-3" />
                    <span>▶ LISTEN</span>
                  </button>
                </div>
                <div className="font-serif text-xl text-[var(--ink-primary)] leading-snug">
                  {textTranslation.translated}
                </div>
              </div>
            </div>

            {voiceNotice && (
              <div className="p-2 border border-[var(--hairline)] text-[11px] text-[var(--ink-secondary)]">
                {voiceNotice}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Parsed Structured Menu Section */}
      <AnimatePresence mode="popLayout">
        {resolvedMode === 'MENU' && parsedMenu && (
          <motion.div
            key="menu-parsed-section"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={FLUID_ISLAND_SPRING}
            className="space-y-4"
          >
            {/* Category Filter Pills + Currency Switcher Pill */}
            <div className={`p-3 border flex flex-wrap items-center justify-between gap-3 ${panelSurface}`}>
              <div className="flex flex-wrap items-center gap-1.5">
                {categoryNames.map((cat) => {
                  const isActive = activeCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCategory(cat)}
                      className={`relative px-3 py-1 border text-[11px] uppercase tracking-wider cursor-pointer z-10 transition-colors ${
                        isActive
                          ? 'text-[var(--bg-canvas)] border-[var(--ink-primary)] font-bold'
                          : 'bg-[var(--bg-surface)] text-[var(--ink-secondary)] border-[var(--hairline)] hover:border-[var(--ink-primary)]'
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="menuCategoryPill"
                          transition={FLUID_SPRING}
                          className="absolute inset-0 bg-[var(--ink-primary)] -z-10"
                        />
                      )}
                      <span>{cat}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[var(--ink-muted)] uppercase">
                  LANG: {parsedMenu.detected_language.toUpperCase()}
                </span>
                <motion.button
                  type="button"
                  {...FLUID_GESTURE_TAP}
                  transition={FLUID_ISLAND_SPRING}
                  onClick={() => setIsCurrencyModalOpen(true)}
                  className="px-3 py-1 border border-[var(--hairline-strong)] bg-[var(--bg-surface)] hover:border-[var(--ink-primary)] text-[var(--ink-primary)] text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeftRight className="w-3 h-3" />
                  <span>
                    {sourceCurrencyOverride === 'AUTO'
                      ? `Auto (${parsedMenu.detected_currency})`
                      : effectiveSourceCurrency}{' '}
                    → {targetCurrency}
                  </span>
                </motion.button>
              </div>
            </div>

            {/* Active Cohort Screening Bar */}
            {travelers.length > 0 && (
              <div className={`px-3 py-2 border flex flex-wrap items-center gap-2 text-[11px] ${panelSurface}`}>
                <span className="text-[var(--ink-muted)] uppercase font-bold">ACTIVE COHORT ({travelers.length}):</span>
                {travelers.map((t) => {
                  const tags = (t.dietaryTags || []).filter((tag) => tag && tag !== 'None');
                  return (
                    <span
                      key={t.id}
                      className="px-2 py-0.5 border border-[var(--hairline)] bg-[var(--bg-surface)] text-[var(--ink-primary)]"
                    >
                      {t.name.split(' ')[0]}
                      {tags.length > 0 ? (
                        <span className="text-[var(--ink-secondary)]"> ({tags.join(', ')})</span>
                      ) : (
                        <span className="text-[var(--ink-muted)]"> (No Restrictions)</span>
                      )}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Monochrome Dish Cards Grid with Thin 3px Left Severity Accent Bar */}
            {visibleItems.length === 0 ? (
              <div className={`p-8 text-center border text-[var(--ink-muted)] ${panelSurface}`}>
                No dishes parsed in this category. Try pasting menu items or selecting another sample.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {visibleItems.map((dish) => {
                  const qty = cart[dish.id] || 0;
                  const evalResult = evaluateDishForCohort(dish, travelers);
                  const isAllRestricted = evalResult.severity === 'ALL_RESTRICTED';
                  const isPartialCaution = evalResult.severity === 'PARTIAL_CAUTION';
                  const dishCurrency =
                    sourceCurrencyOverride === 'AUTO'
                      ? dish.currency || effectiveSourceCurrency
                      : effectiveSourceCurrency;
                  const converted = convertAmount(dish.price, dishCurrency, targetCurrency, fxRates);

                  const leftAccentClass = isAllRestricted
                    ? 'border-l-[3px] border-l-red-500/75'
                    : isPartialCaution
                    ? 'border-l-[3px] border-l-amber-400/75'
                    : '';

                  const pillClass = isAllRestricted
                    ? isLight
                      ? 'border-red-400/70 text-red-700 bg-red-50/40'
                      : 'border-red-500/50 text-red-400 bg-transparent'
                    : isPartialCaution
                    ? isLight
                      ? 'border-amber-500/70 text-amber-800 bg-amber-50/40'
                      : 'border-amber-400/50 text-amber-300 bg-transparent'
                    : 'border-[var(--hairline)] text-[var(--ink-secondary)]';

                  return (
                    <motion.div
                      key={dish.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ y: -2 }}
                      transition={FLUID_ISLAND_SPRING}
                      onClick={() => setSelectedDish(dish)}
                      className={`p-3.5 border flex flex-col justify-between gap-3 cursor-pointer transition-colors hover:border-[var(--ink-primary)] ${cardSurface} ${leftAccentClass}`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="font-serif text-[17px] leading-snug text-[var(--ink-primary)]">
                              {dish.name_en}
                            </h4>
                            <div className="text-[11px] text-[var(--ink-muted)] truncate mt-0.5">
                              {dish.name_original}
                            </div>
                          </div>

                          <span
                            className={`shrink-0 px-1.5 py-0.5 border text-[10px] font-bold uppercase flex items-center gap-1 ${pillClass}`}
                          >
                            {isAllRestricted || isPartialCaution ? (
                              <AlertTriangle className="w-2.5 h-2.5" />
                            ) : (
                              <CheckCircle2 className="w-2.5 h-2.5" />
                            )}
                            <span>
                              {isAllRestricted
                                ? 'ALL RESTRICTED'
                                : isPartialCaution
                                ? `PARTIAL CAUTION · ${evalResult.affectedCount}/${evalResult.totalMembers} AFFECTED`
                                : 'NO_MATCH_DETECTED'}
                            </span>
                          </span>
                        </div>

                        {evalResult.affectedTravelers.length > 0 && (
                          <div className="text-[11px] text-[var(--ink-secondary)] leading-snug">
                            {evalResult.affectedTravelers
                              .map((at) => `${at.name}: ${at.reasons.join(', ')}`)
                              .join(' · ')}
                          </div>
                        )}
                      </div>

                      <div className="flex items-end justify-between gap-2 pt-2 border-t border-[var(--hairline)]">
                        <div>
                          <div className="font-bold text-[13px] text-[var(--ink-primary)]">
                            {formatCurrencyValue(dish.price, dishCurrency)}
                          </div>
                          <div className="text-[11px] text-[var(--ink-secondary)]">
                            ≈ {formatCurrencyValue(converted, targetCurrency)} {targetCurrency}
                          </div>
                        </div>

                        {/* Quantity Stepper / Add Button */}
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          {qty > 0 ? (
                            <div className="flex items-center border border-[var(--ink-primary)] bg-[var(--bg-canvas)]">
                              <button
                                type="button"
                                onClick={() => updateCartQty(dish.id, -1)}
                                className="p-1.5 hover:bg-[var(--bg-elevated)] text-[var(--ink-primary)] cursor-pointer"
                                aria-label={`Decrease ${dish.name_en}`}
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="px-2.5 font-bold text-[12px] text-[var(--ink-primary)]">
                                {qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateCartQty(dish.id, 1)}
                                className="p-1.5 hover:bg-[var(--bg-elevated)] text-[var(--ink-primary)] cursor-pointer"
                                aria-label={`Increase ${dish.name_en}`}
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <motion.button
                              type="button"
                              {...FLUID_GESTURE_TAP}
                              transition={FLUID_ISLAND_SPRING}
                              onClick={() => updateCartQty(dish.id, 1)}
                              className="px-2.5 py-1.5 border border-[var(--hairline-strong)] bg-[var(--bg-surface)] hover:bg-[var(--ink-primary)] hover:text-[var(--bg-canvas)] text-[var(--ink-primary)] text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                              <span>ADD</span>
                            </motion.button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Mandatory Non-Guarantee Staff Notice */}
            <div className={`p-3 border text-[11px] text-[var(--ink-muted)] font-sans italic ${panelSurface}`}>
              {parsedMenu.disclaimer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky Bottom Order Bar */}
      <AnimatePresence>
        {totalItemsCount > 0 && parsedMenu && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={FLUID_ISLAND_SPRING}
            className={`sticky bottom-2 z-30 p-3 border shadow-2xl flex flex-wrap items-center justify-between gap-3 ${
              isLight ? 'bg-[#FFFFFF] border-[#111111]' : 'bg-[#141414] border-[#F2F0EB]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="px-2.5 py-1 bg-[var(--ink-primary)] text-[var(--bg-canvas)] font-bold text-[11px]">
                {totalItemsCount} {totalItemsCount === 1 ? 'ITEM' : 'ITEMS'}
              </div>
              <div>
                <div className="font-bold text-[13px] text-[var(--ink-primary)]">
                  {formatCurrencyValue(totalOriginalAmount, effectiveSourceCurrency)}{' '}
                  <span className="text-[var(--ink-secondary)] font-normal">
                    (≈ {formatCurrencyValue(totalTargetAmount, targetCurrency)} {targetCurrency})
                  </span>
                </div>
                <div className="text-[10px] text-[var(--ink-muted)]">
                  {cartEntries.map((e) => `${e.item.name_en} ×${e.qty}`).join(' · ')}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <motion.button
                type="button"
                {...FLUID_GESTURE_TAP}
                transition={FLUID_ISLAND_SPRING}
                onClick={handleLogOrderToBudget}
                disabled={budgetLoggedSuccess}
                className={`px-3 py-2 border text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                  budgetLoggedSuccess
                    ? 'border-semantic-nominal text-semantic-nominal'
                    : 'border-[var(--hairline-strong)] bg-[var(--bg-surface)] text-[var(--ink-primary)] hover:border-[var(--ink-primary)]'
                }`}
              >
                {budgetLoggedSuccess ? <Check className="w-3.5 h-3.5" /> : <Wallet className="w-3.5 h-3.5" />}
                <span>{budgetLoggedSuccess ? 'LOGGED TO BUDGET ✓' : '[ LOG TO BUDGET ]'}</span>
              </motion.button>

              <motion.button
                type="button"
                {...FLUID_GESTURE_TAP}
                transition={FLUID_ISLAND_SPRING}
                onClick={() => setIsWaiterCardOpen(true)}
                className="px-4 py-2 bg-[var(--ink-primary)] text-[var(--bg-canvas)] font-bold text-[11px] flex items-center gap-1.5 cursor-pointer hover:opacity-90"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>[ SHOW TO STAFF ]</span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dish Detail Modal */}
      <AnimatePresence>
        {selectedDish && parsedMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedDish(null)}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              {...FLUID_MODAL_TRANSITION}
              transition={FLUID_ISLAND_SPRING}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-lg border p-5 space-y-4 shadow-2xl ${cardSurface}`}
            >
              <div className="flex items-start justify-between gap-3 border-b border-[var(--hairline)] pb-3">
                <div>
                  <div className="text-[10px] text-[var(--ink-muted)] uppercase tracking-widest">
                    {selectedDish.category} // DISH DETAIL
                  </div>
                  <h3 className="font-serif text-2xl text-[var(--ink-primary)] leading-tight mt-0.5">
                    {selectedDish.name_en}
                  </h3>
                  <div className="text-[12px] text-[var(--ink-secondary)] mt-0.5">
                    {selectedDish.name_original}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDish(null)}
                  className="p-1.5 border border-[var(--hairline)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] cursor-pointer"
                  aria-label="Close Dish Detail"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-bold text-[var(--ink-primary)]">
                    {formatCurrencyValue(
                      selectedDish.price,
                      sourceCurrencyOverride === 'AUTO'
                        ? selectedDish.currency || effectiveSourceCurrency
                        : effectiveSourceCurrency
                    )}
                  </div>
                  <div className="text-[12px] text-[var(--ink-secondary)]">
                    ≈{' '}
                    {formatCurrencyValue(
                      convertAmount(
                        selectedDish.price,
                        sourceCurrencyOverride === 'AUTO'
                          ? selectedDish.currency || effectiveSourceCurrency
                          : effectiveSourceCurrency,
                        targetCurrency,
                        fxRates
                      ),
                      targetCurrency
                    )}{' '}
                    {targetCurrency}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div
                    className="px-2.5 py-1 border border-[var(--hairline)] flex items-center gap-1 text-[11px]"
                    title={`Spiciness ${selectedDish.spiciness}/3`}
                  >
                    <span className="text-[var(--ink-muted)]">SPICE:</span>
                    {[1, 2, 3].map((lvl) => (
                      <Flame
                        key={lvl}
                        className={`w-3.5 h-3.5 ${
                          lvl <= selectedDish.spiciness ? 'text-semantic-hazard' : 'text-[var(--ink-muted)] opacity-30'
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSpeak(selectedDish.name_original, parsedMenu.detected_language)}
                    className="px-3 py-1.5 border border-[var(--ink-primary)] bg-[var(--bg-surface)] text-[var(--ink-primary)] hover:bg-[var(--ink-primary)] hover:text-[var(--bg-canvas)] text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>▶ LISTEN</span>
                  </button>
                </div>
              </div>

              {voiceNotice && (
                <div className="p-2 border border-[var(--hairline)] bg-[var(--bg-canvas)] text-[11px] text-[var(--ink-secondary)]">
                  {voiceNotice}
                </div>
              )}

              <div className="space-y-1.5">
                <div className="text-[11px] text-[var(--ink-muted)] uppercase">POSSIBLE INGREDIENTS</div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedDish.possible_ingredients.map((ing) => {
                    const dishEval = evaluateDishForCohort(selectedDish, travelers);
                    const isMatched = dishEval.matchedAllergens.some((rule) =>
                      resolveRuleKeywords(rule).some((kw) => ing.toLowerCase().includes(kw.toLowerCase()))
                    );
                    const isAll = dishEval.severity === 'ALL_RESTRICTED';
                    return (
                      <span
                        key={ing}
                        className={`px-2 py-0.5 border text-[11px] ${
                          isMatched
                            ? isAll
                              ? 'border-red-500 text-red-500 font-bold'
                              : 'border-amber-500 text-amber-500 font-bold'
                            : 'border-[var(--hairline)] text-[var(--ink-secondary)]'
                        }`}
                      >
                        {ing}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="font-sans text-[13px] text-[var(--ink-secondary)] leading-relaxed">
                {selectedDish.description}
              </div>

              <div className="p-2.5 border border-[var(--hairline)] bg-[var(--bg-canvas)] text-[11px] text-[var(--ink-muted)] font-sans">
                AI Reference Only — Always verify ingredients and cross-contact with staff before ordering.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--hairline)]">
                <button
                  type="button"
                  onClick={() => {
                    updateCartQty(selectedDish.id, 1);
                    setSelectedDish(null);
                  }}
                  className="px-4 py-2 bg-[var(--ink-primary)] text-[var(--bg-canvas)] font-bold text-[11px] flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>ADD TO ORDER</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Searchable Currency Selector Modal */}
      <AnimatePresence>
        {isCurrencyModalOpen && parsedMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCurrencyModalOpen(false)}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              {...FLUID_MODAL_TRANSITION}
              transition={FLUID_ISLAND_SPRING}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-md border p-4 space-y-3 shadow-2xl ${cardSurface}`}
            >
              <div className="flex items-center justify-between border-b border-[var(--hairline)] pb-2.5">
                <span className="font-bold text-[12px] text-[var(--ink-primary)] uppercase">
                  CURRENCY CONVERSION
                </span>
                <button
                  type="button"
                  onClick={() => setIsCurrencyModalOpen(false)}
                  className="p-1 text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]" />
                <input
                  type="text"
                  value={currencySearch}
                  onChange={(e) => setCurrencySearch(e.target.value)}
                  placeholder="Search currency (INR, MYR, JPY, USD, EUR)..."
                  className="w-full pl-8 pr-3 py-1.5 border border-[var(--hairline)] bg-[var(--bg-canvas)] text-[12px] text-[var(--ink-primary)] focus:outline-none focus:border-[var(--ink-primary)]"
                />
              </div>

              <div className="space-y-1.5">
                <div className="text-[10px] text-[var(--ink-muted)] uppercase">MENU SOURCE CURRENCY</div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSourceCurrencyOverride('AUTO')}
                    className={`px-2.5 py-1 border text-[11px] cursor-pointer ${
                      sourceCurrencyOverride === 'AUTO'
                        ? 'bg-[var(--ink-primary)] text-[var(--bg-canvas)] font-bold'
                        : 'border-[var(--hairline)] text-[var(--ink-secondary)]'
                    }`}
                  >
                    Auto ({parsedMenu.detected_currency})
                  </button>
                  {filteredCurrencies.slice(0, 6).map((c) => (
                    <button
                      key={`src-${c.code}`}
                      type="button"
                      onClick={() => setSourceCurrencyOverride(c.code)}
                      className={`px-2.5 py-1 border text-[11px] cursor-pointer ${
                        sourceCurrencyOverride === c.code
                          ? 'bg-[var(--ink-primary)] text-[var(--bg-canvas)] font-bold'
                          : 'border-[var(--hairline)] text-[var(--ink-secondary)]'
                      }`}
                    >
                      {c.code}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-[10px] text-[var(--ink-muted)] uppercase">CONVERT TO TARGET CURRENCY</div>
                <div className="max-h-52 overflow-y-auto space-y-1">
                  {filteredCurrencies.map((c) => {
                    const active = targetCurrency === c.code;
                    return (
                      <button
                        key={`tgt-${c.code}`}
                        type="button"
                        onClick={() => {
                          setTargetCurrency(c.code);
                          setIsCurrencyModalOpen(false);
                        }}
                        className={`w-full px-3 py-2 border flex items-center justify-between text-[12px] cursor-pointer ${
                          active
                            ? 'bg-[var(--ink-primary)] text-[var(--bg-canvas)] border-[var(--ink-primary)] font-bold'
                            : 'border-[var(--hairline)] bg-[var(--bg-canvas)] text-[var(--ink-primary)] hover:border-[var(--ink-primary)]'
                        }`}
                      >
                        <span>
                          {c.code} · {c.name}
                        </span>
                        <span>{c.symbol}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* "Show to Staff" Waiter Order Ticket Modal */}
      <AnimatePresence>
        {isWaiterCardOpen && parsedMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsWaiterCardOpen(false)}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              {...FLUID_MODAL_TRANSITION}
              transition={FLUID_ISLAND_SPRING}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-md border-2 p-5 space-y-4 shadow-2xl ${
                isLight
                  ? 'bg-[#FFFFFF] border-[#111111] text-[#111111]'
                  : 'bg-[#0E0E0E] border-[#F2F0EB] text-[#F2F0EB]'
              }`}
            >
              <div className="flex items-start justify-between gap-2 border-b border-[var(--hairline)] pb-3">
                <div>
                  <div className="text-[10px] tracking-widest text-[var(--ink-muted)] uppercase">
                    WAITER ORDER TICKET // {parsedMenu.detected_language.toUpperCase()}
                  </div>
                  <h3 className="font-serif text-2xl leading-snug mt-1">{parsedMenu.greeting_local}</h3>
                  <div className="text-[11px] text-[var(--ink-secondary)] mt-0.5">
                    {parsedMenu.greeting_en}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsWaiterCardOpen(false)}
                  className="p-1.5 border border-[var(--hairline)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] cursor-pointer"
                  aria-label="Close Waiter Ticket"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="divide-y divide-[var(--hairline)] max-h-60 overflow-y-auto">
                {cartEntries.map(({ item, qty }) => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-bold text-[14px] text-[var(--ink-primary)]">
                        {item.name_original}
                      </div>
                      <div className="text-[11px] text-[var(--ink-secondary)]">{item.name_en}</div>
                    </div>
                    <div className="shrink-0 font-bold text-[15px] px-2.5 py-1 border border-[var(--hairline-strong)]">
                      × {qty}
                    </div>
                  </div>
                ))}
              </div>

              {cohortAllergens.length > 0 && (
                <div className="p-3 border border-l-[3px] border-l-red-500/75 border-[var(--hairline)] space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-[12px] text-red-500">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>{parsedMenu.allergy_notice_local}</span>
                  </div>
                  <div className="text-[11px] text-[var(--ink-secondary)]">{parsedMenu.allergy_notice_en}</div>
                </div>
              )}

              <div className="pt-2 border-t border-[var(--hairline)] text-center space-y-0.5">
                <div className="font-serif text-xl text-[var(--ink-primary)]">
                  {parsedMenu.closing_local}
                </div>
                <div className="text-[11px] text-[var(--ink-secondary)]">{parsedMenu.closing_en}</div>
              </div>

              {voiceNotice && (
                <div className="p-2 border border-[var(--hairline)] text-[11px] text-[var(--ink-secondary)]">
                  {voiceNotice}
                </div>
              )}

              <button
                type="button"
                onClick={handleSpeakFullOrder}
                className="w-full py-2.5 bg-[var(--ink-primary)] text-[var(--bg-canvas)] font-bold text-[12px] flex items-center justify-center gap-2 cursor-pointer hover:opacity-90"
              >
                <Volume2 className="w-4 h-4" />
                <span>▶ LISTEN (LOCAL VOICE)</span>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
