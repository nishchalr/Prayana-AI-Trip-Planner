import React, { useEffect, useMemo, useState } from 'react';
import { usePrayana } from '../../../context/PrayanaContext';
import { TravelerProfile } from '../../../types';
import { PopButton } from '../../ui/InteractivePrimitives';
import { CompassLoader } from '../../common/CompassLoader';
import {
  CloudRain,
  ShieldAlert,
  Pill,
  Plus,
  Minus,
  Trash2,
  Volume2,
  Languages,
  Receipt,
  CheckCircle2,
  Backpack,
} from 'lucide-react';

interface MedItem {
  id: string;
  name: string;
  categoryKey: string;
  qty: number;
  unitPriceInr: number;
  isCritical?: boolean;
}

type TargetLanguage =
  | 'Kannada'
  | 'Hindi'
  | 'Tamil'
  | 'Telugu'
  | 'Malay'
  | 'Japanese'
  | 'French'
  | 'Spanish'
  | 'English';

type TargetCurrency = 'INR' | 'MYR' | 'JPY' | 'USD' | 'EUR' | 'GBP' | 'SGD' | 'THB';

const CURRENCY_CONFIG: Record<TargetCurrency, { symbol: string; rateFromInr: number }> = {
  INR: { symbol: '₹', rateFromInr: 1 },
  MYR: { symbol: 'RM', rateFromInr: 0.052 },
  JPY: { symbol: '¥', rateFromInr: 1.82 },
  USD: { symbol: '$', rateFromInr: 0.0118 },
  EUR: { symbol: '€', rateFromInr: 0.011 },
  GBP: { symbol: '£', rateFromInr: 0.0093 },
  SGD: { symbol: 'S$', rateFromInr: 0.0158 },
  THB: { symbol: '฿', rateFromInr: 0.41 },
};

const LANGUAGE_META: Record<
  TargetLanguage,
  {
    bcp47: string;
    header: string;
    pleaseGive: string;
    terms: Record<string, string>;
  }
> = {
  Kannada: {
    bcp47: 'kn-IN',
    header: 'ದಯವಿಟ್ಟು ಈ ಔಷಧಿಗಳನ್ನು ನೀಡಿ (ಔಷಧಾಲಯ)',
    pleaseGive: 'ಪ್ರಯಾಣಿಕರಿಗೆ ಅಗತ್ಯವಿರುವ ಔಷಧಿಗಳು:',
    terms: {
      inhaler: 'ಆಸ್ತಮಾ ಇನ್ಹೇಲರ್ (ಸಾಲ್ಬುಟಮಾಲ್ 100mcg)',
      epipen: 'ಅಲರ್ಜಿ ತುರ್ತು ಇಂಜೆಕ್ಷನ್ (ಎಪಿಪೆನ್) + ಆಂಟಿಹಿಸ್ಟಮೈನ್',
      motion: 'ವಾಂತಿ / ಪ್ರಯಾಣ ತಲೆತಿರುಗುವಿಕೆ ಮಾತ್ರೆ',
      bp: 'ರಕ್ತದೊತ್ತಡ (BP) ಮಾತ್ರೆಗಳು',
      joint: 'ಕೀಲು ನೋವು ಮುಲಾಮು ಮತ್ತು ಬೆಂಬಲ ಪಟ್ಟಿ',
      glucose: 'ಗ್ಲೂಕೋಸ್ ಜೆಲ್ ಮತ್ತು ಸಕ್ಕರೆ ಪರೀಕ್ಷಾ ಪಟ್ಟಿಗಳು',
      ors: 'ORS ಪೌಡರ್ ಮತ್ತು ಜ್ವರದ ಮಾತ್ರೆ (ಪ್ಯಾರಾಸಿಟಮಾಲ್)',
      custom: 'ವೈದ್ಯಕೀಯ ಔಷಧಿ',
    },
  },
  Hindi: {
    bcp47: 'hi-IN',
    header: 'कृपया ये दवाइयाँ दें (मेडिकल स्टोर)',
    pleaseGive: 'यात्रियों के लिए आवश्यक दवाइयाँ:',
    terms: {
      inhaler: 'अस्थमा इनहेलर (सालबुटामोल 100mcg)',
      epipen: 'गंभीर एलर्जी इंजेक्शन (एपीपेन) + एंटीहिस्टामाइन',
      motion: 'सफर में चक्कर / उल्टी की गोली',
      bp: 'ब्लड प्रेशर (BP) की दवा',
      joint: 'जोड़ों के दर्द की क्रीम और सपोर्ट बेल्ट',
      glucose: 'ग्लूकोज़ जेल और शुगर टेस्ट स्ट्रिप्स',
      ors: 'ORS पैकेट और बुखार की गोली (पैरासिटामोल)',
      custom: 'चिकित्सा सामग्री',
    },
  },
  Tamil: {
    bcp47: 'ta-IN',
    header: 'தயவுசெய்து இந்த மருந்துகளை வழங்கவும்',
    pleaseGive: 'பயணிகளுக்கான மருந்துகள்:',
    terms: {
      inhaler: 'ஆஸ்துமா இன்ஹேலர் (சல்புடமால் 100mcg)',
      epipen: 'அவசர அலர்ஜி ஊசி (EpiPen) + மாத்திரை',
      motion: 'பயண மயக்கம் / வாந்தி மாத்திரை',
      bp: 'இரத்த அழுத்த (BP) மாத்திரைகள்',
      joint: 'மூட்டு வலி களிம்பு மற்றும் சப்போர்ட் பேண்ட்',
      glucose: 'குளுக்கோஸ் ஜெல் & சர்க்கரை பரிசோதனை பட்டைகள்',
      ors: 'ORS பவுடர் மற்றும் பாராசிட்டமால் மாத்திரை',
      custom: 'மருத்துவப் பொருள்',
    },
  },
  Telugu: {
    bcp47: 'te-IN',
    header: 'దయచేసి ఈ మందులు ఇవ్వండి (మెడికల్ షాప్)',
    pleaseGive: 'ప్రయాణికులకు అవసరమైన మందులు:',
    terms: {
      inhaler: 'ఆస్తమా ఇన్హేలర్ (సల్బుటమాల్ 100mcg)',
      epipen: 'అలర్జీ ఎమర్జెన్సీ ఇంజెక్షన్ + యాంటీహిస్టామైన్',
      motion: 'ప్రయాణ వాంతులు / తలతిరుగుడు మాత్ర',
      bp: 'బీపీ (BP) మాత్రలు',
      joint: 'కీళ్ల నొప్పుల ఆయింట్‌మెంట్ మరియు బ్యాండ్',
      glucose: 'గ్లూకోజ్ జెల్ & షుగర్ స్ట్రిప్స్',
      ors: 'ORS ప్యాకెట్లు మరియు పారాసిటమాల్',
      custom: 'వైద్య ఔషధం',
    },
  },
  Malay: {
    bcp47: 'ms-MY',
    header: 'Sila berikan ubat-ubatan ini (Farmasi)',
    pleaseGive: 'Senarai ubat pelancong:',
    terms: {
      inhaler: 'Penyedut Asma (Salbutamol 100mcg)',
      epipen: 'Suntikan Alahan Kecemasan (EpiPen) + Antihistamin',
      motion: 'Pil Mabuk Perjalanan (Dimenhydrinate)',
      bp: 'Ubat Tekanan Darah Tinggi',
      joint: 'Krim Sakit Sendi & Pendakap Lutut',
      glucose: 'Gel Glukosa & Jalur Ujian Gula',
      ors: 'Garam Rehidrasi ORS & Paracetamol 500mg',
      custom: 'Ubat / Item Tambahan',
    },
  },
  Japanese: {
    bcp47: 'ja-JP',
    header: '以下の薬をお願いします（薬局）',
    pleaseGive: '旅行者の必要な薬リスト：',
    terms: {
      inhaler: '喘息吸入器（サルブタモール 100mcg）',
      epipen: 'アナフィラキシー補助治療剤（エピペン）＋抗ヒスタミン薬',
      motion: '乗り物酔い止め薬',
      bp: '高血圧の薬・携帯血圧計',
      joint: '関節サポーター・鎮痛クリーム',
      glucose: 'ブドウ糖ジェル・血糖測定チップ',
      ors: '経口補水液パウダー・解熱鎮痛剤',
      custom: '医療品・常備薬',
    },
  },
  French: {
    bcp47: 'fr-FR',
    header: 'Veuillez me donner ces médicaments (Pharmacie)',
    pleaseGive: 'Médicaments nécessaires pour les voyageurs :',
    terms: {
      inhaler: 'Inhalateur Salbutamol 100mcg + Chambre',
      epipen: 'Auto-injecteur Épinéphrine (EpiPen) + Antihistaminique',
      motion: 'Comprimés contre le mal des transports',
      bp: 'Traitement antihypertenseur',
      joint: 'Genouillère + Gel analgésique topique',
      glucose: 'Gel de glucose + Bandelettes glycémie',
      ors: 'Sachets de réhydratation ORS + Paracétamol',
      custom: 'Article médical',
    },
  },
  Spanish: {
    bcp47: 'es-ES',
    header: 'Por favor, necesito estos medicamentos (Farmacia)',
    pleaseGive: 'Lista de medicamentos para viajeros:',
    terms: {
      inhaler: 'Inhalador de Salbutamol 100mcg',
      epipen: 'Autoinyector de Epinefrina (EpiPen) + Antihistamínico',
      motion: 'Pastillas para el mareo en viaje',
      bp: 'Medicación para la presión arterial',
      joint: 'Rodillera de soporte + Crema analgésica',
      glucose: 'Gel de glucosa + Tiras reactivas',
      ors: 'Sales de rehidratación oral + Paracetamol',
      custom: 'Artículo médico',
    },
  },
  English: {
    bcp47: 'en-IN',
    header: 'Pharmacy Request — Traveler Medication List',
    pleaseGive: 'Required medications & supplies:',
    terms: {
      inhaler: 'Salbutamol 100mcg Rescue Inhaler',
      epipen: 'Epinephrine Auto-Injector (EpiPen) + Antihistamine',
      motion: 'Dimenhydrinate 50mg Motion-Sickness Tabs',
      bp: 'Prescribed Antihypertensive Tabs',
      joint: 'Joint Support Brace + Topical Analgesic',
      glucose: 'Fast-Acting Glucose Gel + Test Strips',
      ors: 'ORS Hydration Pack + Paracetamol 500mg',
      custom: 'Custom Medication',
    },
  },
};

function seedMedsForTraveler(t: TravelerProfile): MedItem[] {
  const combined = [
    ...(t.medicalFlags || []),
    ...(t.dietaryTags || []).filter(
      (d) => d.includes('Allergy') || d === 'Gluten-Free' || d === 'Diabetic-Friendly'
    ),
    ...(t.mobility !== 'Full Mobility' ? [t.mobility] : []),
  ]
    .join(' ')
    .toLowerCase();

  const items: MedItem[] = [];
  const addUnique = (item: Omit<MedItem, 'id'>) => {
    if (items.some((i) => i.categoryKey === item.categoryKey && i.name === item.name)) return;
    items.push({ ...item, id: `${t.id}-${item.categoryKey}-${items.length}` });
  };

  if (combined.includes('asthma') || combined.includes('copd') || combined.includes('bronch')) {
    addUnique({
      name: 'Salbutamol 100mcg Rescue Inhaler + Spacer',
      categoryKey: 'inhaler',
      qty: 1,
      unitPriceInr: 185,
      isCritical: true,
    });
  }
  if (
    combined.includes('nut') ||
    combined.includes('peanut') ||
    combined.includes('shellfish') ||
    combined.includes('anaphy') ||
    combined.includes('allergy')
  ) {
    addUnique({
      name: 'EpiPen Auto-Injector + Cetirizine 10mg',
      categoryKey: 'epipen',
      qty: 1,
      unitPriceInr: 4200,
      isCritical: true,
    });
  }
  if (combined.includes('motion') || combined.includes('vertigo')) {
    addUnique({
      name: 'Dimenhydrinate 50mg / Meclizine (10 tabs)',
      categoryKey: 'motion',
      qty: 1,
      unitPriceInr: 65,
    });
  }
  if (combined.includes('hypertension') || combined.includes('blood pressure') || combined.includes('cardiac')) {
    addUnique({
      name: 'Prescribed Antihypertensive + BP Strip',
      categoryKey: 'bp',
      qty: 1,
      unitPriceInr: 320,
    });
  }
  if (
    combined.includes('arthritis') ||
    combined.includes('knee') ||
    combined.includes('joint') ||
    combined.includes('assisted') ||
    combined.includes('wheelchair')
  ) {
    addUnique({
      name: 'Joint Support Brace + Topical Analgesic Gel',
      categoryKey: 'joint',
      qty: 1,
      unitPriceInr: 290,
    });
  }
  if (combined.includes('diabet') || combined.includes('insulin') || combined.includes('glyc')) {
    addUnique({
      name: 'Fast-Acting Glucose Gel + Test Strips',
      categoryKey: 'glucose',
      qty: 1,
      unitPriceInr: 380,
      isCritical: true,
    });
  }

  // Standard baseline pack for every traveler
  addUnique({
    name: 'ORS Hydration Electrolytes + Paracetamol 500mg',
    categoryKey: 'ors',
    qty: 2,
    unitPriceInr: 45,
  });

  return items;
}

function getEssentialsForTraveler(t: TravelerProfile, isStorm: boolean): string[] {
  const essentials: string[] = ['1L Insulated Water Bottle', 'UV Sun Protection & Cap'];
  if (t.mobility === 'Wheelchair-Accessible') {
    essentials.push('Portable Folding Ramp / Tire Repair Kit', 'Padded Seat Cushion');
  } else if (t.mobility === 'Assisted') {
    essentials.push('Foldable Trekking Cane / Grip Footwear');
  } else {
    essentials.push('High-Traction Trail Footwear');
  }
  if ((t.dietaryTags || []).some((d) => d.includes('Allergy') || d === 'Gluten-Free')) {
    essentials.push('Printed Allergen Alert Card');
  }
  if (isStorm) {
    essentials.push('Waterproof Rain Poncho + Dry Pouch');
  }
  return essentials;
}

export const DisruptionKitPage: React.FC = () => {
  const {
    isStormDisrupted,
    toggleStormDisruption,
    travelers,
    activeDestination,
    weatherSummary,
    routeStops,
    theme,
    activeDay,
    activeTrip,
    addExpense,
    destinationAdvisories,
    advisoriesLoading,
    refreshDestinationAdvisories,
  } = usePrayana();

  const [isRerouting, setIsRerouting] = useState(false);
  const [medsByTraveler, setMedsByTraveler] = useState<Record<string, MedItem[]>>({});
  const [customDrafts, setCustomDrafts] = useState<
    Record<string, { name: string; qty: string; price: string }>
  >({});
  const [targetLanguage, setTargetLanguage] = useState<TargetLanguage>('Kannada');
  const [targetCurrency, setTargetCurrency] = useState<TargetCurrency>('INR');
  const [paidBy, setPaidBy] = useState<string>(travelers[0]?.id || '');
  const [splitMode, setSplitMode] = useState<'equal' | 'custom'>('equal');
  const [budgetLoggedMsg, setBudgetLoggedMsg] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Seed medication lists per traveler whenever cohort changes
  useEffect(() => {
    setMedsByTraveler((prev) => {
      const next = { ...prev };
      let changed = false;
      (travelers || []).forEach((t) => {
        if (!next[t.id]) {
          next[t.id] = seedMedsForTraveler(t);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
    if (!paidBy && travelers[0]?.id) {
      setPaidBy(travelers[0].id);
    }
  }, [travelers, paidBy]);

  // Fetch live OpenWeatherMap + Festival/Closure advisories on mount or destination change
  useEffect(() => {
    if (!destinationAdvisories || destinationAdvisories.destination_id !== activeDestination.id) {
      void refreshDestinationAdvisories(
        activeDestination.id,
        activeDestination.name,
        activeTrip.checkInDate,
        activeTrip.checkOutDate,
        routeStops
      );
    }
  }, [activeDestination.id]);

  const handleToggleDisruption = () => {
    setIsRerouting(true);
    toggleStormDisruption();
    window.setTimeout(() => setIsRerouting(false), 620);
  };

  const outdoorStopsCount = routeStops.filter((s) => s.isOutdoor).length;

  const updateMedQty = (travelerId: string, medId: string, delta: number) => {
    setBudgetLoggedMsg(null);
    setMedsByTraveler((prev) => ({
      ...prev,
      [travelerId]: (prev[travelerId] || []).map((m) =>
        m.id === medId ? { ...m, qty: Math.max(0, m.qty + delta) } : m
      ),
    }));
  };

  const updateMedPrice = (travelerId: string, medId: string, priceVal: number) => {
    setBudgetLoggedMsg(null);
    setMedsByTraveler((prev) => ({
      ...prev,
      [travelerId]: (prev[travelerId] || []).map((m) =>
        m.id === medId ? { ...m, unitPriceInr: Math.max(0, priceVal) } : m
      ),
    }));
  };

  const removeMedItem = (travelerId: string, medId: string) => {
    setBudgetLoggedMsg(null);
    setMedsByTraveler((prev) => ({
      ...prev,
      [travelerId]: (prev[travelerId] || []).filter((m) => m.id !== medId),
    }));
  };

  const handleAddCustomMed = (travelerId: string) => {
    const draft = customDrafts[travelerId] || { name: '', qty: '1', price: '120' };
    const cleanName = draft.name.trim();
    if (!cleanName) return;
    const qty = Math.max(1, parseInt(draft.qty, 10) || 1);
    const unitPriceInr = Math.max(0, parseFloat(draft.price) || 0);
    setBudgetLoggedMsg(null);
    setMedsByTraveler((prev) => ({
      ...prev,
      [travelerId]: [
        ...(prev[travelerId] || []),
        {
          id: `${travelerId}-custom-${Date.now()}`,
          name: cleanName,
          categoryKey: 'custom',
          qty,
          unitPriceInr,
        },
      ],
    }));
    setCustomDrafts((prev) => ({ ...prev, [travelerId]: { name: '', qty: '1', price: '120' } }));
  };

  const billSummary = useMemo(() => {
    let totalInr = 0;
    let totalUnits = 0;
    const perTravelerTotals: Record<string, number> = {};
    const flatItems: Array<{ travelerName: string; item: MedItem }> = [];

    (travelers || []).forEach((t) => {
      const meds = medsByTraveler[t.id] || [];
      let sub = 0;
      meds.forEach((m) => {
        if (m.qty > 0) {
          const line = m.qty * m.unitPriceInr;
          sub += line;
          totalUnits += m.qty;
          flatItems.push({ travelerName: t.name.split(' ')[0], item: m });
        }
      });
      perTravelerTotals[t.id] = sub;
      totalInr += sub;
    });

    return { totalInr, totalUnits, perTravelerTotals, flatItems };
  }, [travelers, medsByTraveler]);

  const currencyMeta = CURRENCY_CONFIG[targetCurrency];
  const formatConverted = (inrAmount: number) => {
    const converted = inrAmount * currencyMeta.rateFromInr;
    const decimals = targetCurrency === 'JPY' || targetCurrency === 'INR' ? 0 : 2;
    return `${currencyMeta.symbol}${converted.toFixed(decimals)}`;
  };

  const langMeta = LANGUAGE_META[targetLanguage];

  const handleSpeakPharmacyList = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const lines = billSummary.flatItems.map(({ item }) => {
      const localizedName = langMeta.terms[item.categoryKey] || item.name;
      return `${item.qty} × ${localizedName}`;
    });
    const utteranceText = `${langMeta.header}. ${langMeta.pleaseGive} ${lines.join(', ')}.`;
    const utter = new SpeechSynthesisUtterance(utteranceText);
    utter.lang = langMeta.bcp47;
    utter.rate = 0.92;
    utter.onstart = () => setIsSpeaking(true);
    utter.onend = () => setIsSpeaking(false);
    utter.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utter);
  };

  const handleLogBillToBudget = () => {
    if (billSummary.totalInr <= 0) return;
    const splitBetween = (travelers || []).map((t) => t.id);
    addExpense({
      category: 'activitiesAndBuffer',
      amount: Math.round(billSummary.totalInr),
      description: `Med Kit & Pharmacy (${billSummary.totalUnits} items · ${activeDestination.name})`,
      dayIndex: activeDay,
      paidBy: paidBy || splitBetween[0],
      splitMode,
      splitBetween,
      ...(splitMode === 'custom' ? { customSplits: billSummary.perTravelerTotals } : {}),
    });
    setBudgetLoggedMsg(`LOGGED ₹${Math.round(billSummary.totalInr).toLocaleString()} TO 02 // BUDGET ✓`);
  };

  return (
    <div className="relative w-full space-y-5 pb-12 font-mono text-[13px] select-none">
      {isRerouting && (
        <CompassLoader
          variant="overlay"
          theme={theme}
          statusText={
            isStormDisrupted
              ? 'REROUTING OUTDOOR NODES INDOORS...'
              : 'RESTORING CLEAR SKY CORRIDOR...'
          }
        />
      )}

      {/* Live OpenWeatherMap Forecast, Festival/Closure Advisories & 1-Click Indoor Swap */}
      <div className="p-4 bg-[#121212] border border-ink-primary/30 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <CloudRain className="w-4 h-4 text-ink-primary shrink-0" />
              <span className="font-bold text-ink-primary text-[13px]">
                LIVE OPENWEATHERMAP DISRUPTION &amp; FESTIVAL / CLOSURE ADVISORIES
              </span>
            </div>
            <div className="text-[11px] text-semantic-nominal mt-1 uppercase">
              {destinationAdvisories?.weather_summary || weatherSummary || `${activeDestination.name} · ${outdoorStopsCount} outdoor nodes monitored`}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() =>
                void refreshDestinationAdvisories(
                  activeDestination.id,
                  activeDestination.name,
                  activeTrip.checkInDate,
                  activeTrip.checkOutDate,
                  routeStops
                )
              }
              className="px-3 py-1.5 border border-[rgba(242,240,235,0.2)] text-[11px] text-ink-secondary hover:text-ink-primary cursor-pointer"
            >
              {advisoriesLoading ? 'SCANNING...' : 'REFRESH FORECAST'}
            </button>
            <PopButton
              onClick={handleToggleDisruption}
              size="md"
              variant={isStormDisrupted ? 'danger' : 'outline'}
              className="font-bold"
            >
              {isStormDisrupted ? 'INDOOR SWAP ACTIVE ✓' : '1-CLICK INDOOR SWAP'}
            </PopButton>
          </div>
        </div>

        {destinationAdvisories?.advisory_alerts && destinationAdvisories.advisory_alerts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {destinationAdvisories.advisory_alerts.map((al, i) => (
              <div
                key={`med-adv-${i}`}
                className={`p-2.5 border text-[11px] ${
                  al.severity === 'HIGH'
                    ? 'border-semantic-hazard/50 bg-semantic-hazard/10 text-semantic-hazard'
                    : 'border-semantic-caution/40 bg-semantic-caution/10 text-semantic-caution'
                }`}
              >
                <div className="font-bold uppercase">[{al.type}] {al.title}</div>
                <div className="font-sans mt-0.5 text-ink-primary">{al.detail}</div>
              </div>
            ))}
          </div>
        )}

        {destinationAdvisories?.stop_forecasts && destinationAdvisories.stop_forecasts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
            {destinationAdvisories.stop_forecasts.slice(0, 4).map((sf) => (
              <div key={sf.stop_id} className="p-2 bg-[#181818] border border-[rgba(242,240,235,0.1)] text-[11px]">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-semibold text-ink-primary truncate">{sf.stop_name}</span>
                  <span
                    className={`text-[9px] px-1 border ${
                      sf.risk_level === 'HIGH'
                        ? 'border-semantic-hazard text-semantic-hazard'
                        : sf.risk_level === 'MODERATE'
                        ? 'border-semantic-caution text-semantic-caution'
                        : 'border-semantic-nominal text-semantic-nominal'
                    }`}
                  >
                    {sf.risk_level}
                  </span>
                </div>
                <div className="text-[10px] text-ink-muted mt-0.5">
                  {sf.temp_c}°C · {sf.condition} ({sf.rain_prob}% rain)
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Per-Traveler Med Kit & Essentials Compartments */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[rgba(242,240,235,0.12)] pb-2">
          <div className="flex items-center gap-2 text-[11px] text-ink-muted uppercase tracking-widest">
            <ShieldAlert className="w-3.5 h-3.5 text-ink-primary" />
            <span>PER-TRAVELER MED KIT &amp; ESSENTIALS COMPARTMENTS ({travelers.length})</span>
          </div>
          <div className="text-[12px] font-bold text-semantic-nominal">
            COHORT PHARMACY BILL: ₹{Math.round(billSummary.totalInr).toLocaleString()} ({formatConverted(billSummary.totalInr)})
          </div>
        </div>

        {!travelers || travelers.length === 0 ? (
          <div className="p-5 bg-[#161616] border border-[rgba(242,240,235,0.12)] text-center text-[12px] text-ink-secondary">
            [ NO TRAVELERS IN COHORT — ADD PROFILES TO GENERATE INDIVIDUAL MED KITS ]
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {travelers.map((t) => {
              const meds = medsByTraveler[t.id] || [];
              const essentials = getEssentialsForTraveler(t, isStormDisrupted);
              const draft = customDrafts[t.id] || { name: '', qty: '1', price: '120' };
              const travelerSubtotal = billSummary.perTravelerTotals[t.id] || 0;

              return (
                <div
                  key={t.id}
                  className="p-4 bg-[#161616] border border-[rgba(242,240,235,0.14)] flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Traveler Header */}
                    <div className="flex items-start justify-between gap-2 pb-2 border-b border-[rgba(242,240,235,0.08)]">
                      <div>
                        <h3 className="font-serif text-xl text-ink-primary leading-tight">
                          {t.name}
                        </h3>
                        <div className="text-[11px] text-ink-secondary mt-0.5">
                          {t.mobility} · {t.medicalFlags.length > 0 ? t.medicalFlags.join(', ') : 'No medical flags'}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[10px] text-ink-muted uppercase">MED SUBTOTAL</div>
                        <div className="font-bold text-ink-primary text-[14px]">
                          ₹{Math.round(travelerSubtotal).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Essentials to Carry */}
                    <div>
                      <div className="flex items-center gap-1.5 text-[10px] text-ink-muted uppercase tracking-widest mb-1.5">
                        <Backpack className="w-3 h-3" />
                        <span>ESSENTIALS TO CARRY</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {essentials.map((ess) => (
                          <span
                            key={ess}
                            className="px-2 py-0.5 bg-[#1D1D1D] border border-[rgba(242,240,235,0.12)] text-[11px] text-ink-secondary"
                          >
                            {ess}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Medications / Drugs with Editable Qty & Price */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-[10px] text-ink-muted uppercase tracking-widest">
                        <Pill className="w-3 h-3" />
                        <span>MEDICATIONS &amp; PHARMACY BILLING</span>
                      </div>

                      <div className="space-y-1.5">
                        {meds.map((med) => (
                          <div
                            key={med.id}
                            className="p-2 bg-[#121212] border border-[rgba(242,240,235,0.1)] flex flex-wrap items-center justify-between gap-2"
                          >
                            <div className="min-w-0 flex-1">
                              <div
                                className={`text-[12px] font-semibold truncate ${
                                  med.isCritical ? 'text-semantic-hazard' : 'text-ink-primary'
                                }`}
                              >
                                {med.name}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {/* Quantity Stepper */}
                              <div className="flex items-center border border-[rgba(242,240,235,0.18)] bg-[#1A1A1A]">
                                <button
                                  type="button"
                                  onClick={() => updateMedQty(t.id, med.id, -1)}
                                  className="px-1.5 py-1 text-ink-secondary hover:text-ink-primary cursor-pointer"
                                  aria-label="Decrease quantity"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="px-2 text-[11px] font-bold text-ink-primary min-w-[22px] text-center">
                                  {med.qty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateMedQty(t.id, med.id, 1)}
                                  className="px-1.5 py-1 text-ink-secondary hover:text-ink-primary cursor-pointer"
                                  aria-label="Increase quantity"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>

                              {/* Editable Unit Price (INR) */}
                              <label className="flex items-center gap-1 border border-[rgba(242,240,235,0.18)] bg-[#1A1A1A] px-1.5 py-0.5 text-[11px]">
                                <span className="text-ink-muted">₹</span>
                                <input
                                  type="number"
                                  min={0}
                                  value={med.unitPriceInr}
                                  onChange={(e) =>
                                    updateMedPrice(t.id, med.id, parseFloat(e.target.value) || 0)
                                  }
                                  aria-label={`${med.name} unit price`}
                                  className="w-14 bg-transparent text-ink-primary font-mono text-[11px] focus:outline-none text-right"
                                />
                              </label>

                              <button
                                type="button"
                                onClick={() => removeMedItem(t.id, med.id)}
                                className="p-1 text-ink-muted hover:text-semantic-hazard cursor-pointer"
                                title="Remove item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* + Add Custom Medicine / Item */}
                      <div className="pt-1.5 flex flex-wrap sm:flex-nowrap items-center gap-1.5">
                        <input
                          type="text"
                          value={draft.name}
                          onChange={(e) =>
                            setCustomDrafts((prev) => ({
                              ...prev,
                              [t.id]: { ...draft, name: e.target.value },
                            }))
                          }
                          placeholder="+ Custom medicine / item..."
                          className="flex-1 min-w-[140px] bg-[#121212] border border-[rgba(242,240,235,0.18)] px-2.5 py-1.5 text-[11px] text-ink-primary focus:border-ink-primary focus:outline-none"
                        />
                        <input
                          type="number"
                          min={1}
                          value={draft.qty}
                          onChange={(e) =>
                            setCustomDrafts((prev) => ({
                              ...prev,
                              [t.id]: { ...draft, qty: e.target.value },
                            }))
                          }
                          aria-label="Custom medicine quantity"
                          className="w-12 bg-[#121212] border border-[rgba(242,240,235,0.18)] px-2 py-1.5 text-[11px] text-ink-primary text-center focus:outline-none"
                        />
                        <input
                          type="number"
                          min={0}
                          value={draft.price}
                          onChange={(e) =>
                            setCustomDrafts((prev) => ({
                              ...prev,
                              [t.id]: { ...draft, price: e.target.value },
                            }))
                          }
                          aria-label="Custom medicine unit price INR"
                          className="w-16 bg-[#121212] border border-[rgba(242,240,235,0.18)] px-2 py-1.5 text-[11px] text-ink-primary text-right focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddCustomMed(t.id)}
                          className="px-2.5 py-1.5 bg-ink-primary text-canvas font-bold text-[11px] hover:bg-white cursor-pointer shrink-0"
                        >
                          + ADD
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pharmacy Translator, Currency Converter & Direct Log to Budget */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Pharmacy Translator & Currency Converter */}
        <div className="lg:col-span-7 p-4 bg-[#161616] border border-[rgba(242,240,235,0.14)] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[rgba(242,240,235,0.08)]">
            <div className="flex items-center gap-1.5 text-[11px] text-ink-muted uppercase tracking-widest">
              <Languages className="w-3.5 h-3.5 text-ink-primary" />
              <span>PHARMACY TRANSLATOR &amp; CURRENCY CONVERTER</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Target Pharmacy Language"
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value as TargetLanguage)}
                className="bg-[#121212] border border-[rgba(242,240,235,0.22)] px-2 py-1 text-[11px] text-ink-primary focus:outline-none cursor-pointer"
              >
                {(Object.keys(LANGUAGE_META) as TargetLanguage[]).map((lang) => (
                  <option key={lang} value={lang}>
                    LANG: {lang.toUpperCase()}
                  </option>
                ))}
              </select>

              <select
                aria-label="Target Pharmacy Currency"
                value={targetCurrency}
                onChange={(e) => setTargetCurrency(e.target.value as TargetCurrency)}
                className="bg-[#121212] border border-[rgba(242,240,235,0.22)] px-2 py-1 text-[11px] text-ink-primary focus:outline-none cursor-pointer"
              >
                {(Object.keys(CURRENCY_CONFIG) as TargetCurrency[]).map((cur) => (
                  <option key={cur} value={cur}>
                    {cur} ({CURRENCY_CONFIG[cur].symbol})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleSpeakPharmacyList}
                disabled={billSummary.flatItems.length === 0}
                className="px-2.5 py-1 bg-ink-primary text-canvas font-bold text-[11px] flex items-center gap-1 cursor-pointer disabled:opacity-40"
              >
                <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? 'animate-pulse' : ''}`} />
                <span>▶ LISTEN</span>
              </button>
            </div>
          </div>

          <div className="p-3 bg-[#121212] border border-[rgba(242,240,235,0.1)] space-y-2">
            <div className="text-[13px] font-bold text-ink-primary">{langMeta.header}</div>
            <div className="text-[11px] text-ink-secondary">{langMeta.pleaseGive}</div>
            {billSummary.flatItems.length === 0 ? (
              <div className="text-[11px] text-ink-muted py-2">
                No active medication quantities selected above.
              </div>
            ) : (
              <div className="divide-y divide-[rgba(242,240,235,0.06)] max-h-52 overflow-y-auto">
                {billSummary.flatItems.map(({ travelerName, item }) => {
                  const localized = langMeta.terms[item.categoryKey] || item.name;
                  const lineInr = item.qty * item.unitPriceInr;
                  return (
                    <div
                      key={`tr-${item.id}`}
                      className="py-1.5 flex items-center justify-between gap-2 text-[12px]"
                    >
                      <div className="min-w-0">
                        <div className="text-ink-primary font-semibold truncate">
                          {item.qty}× {localized}
                        </div>
                        <div className="text-[10px] text-ink-muted truncate">
                          {travelerName} · {item.name}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-ink-primary font-bold">{formatConverted(lineInr)}</div>
                        {targetCurrency !== 'INR' && (
                          <div className="text-[10px] text-ink-muted">₹{Math.round(lineInr)}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Direct Log to Budget + ASI Etiquette */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="p-4 bg-[#161616] border border-[rgba(242,240,235,0.14)] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[rgba(242,240,235,0.08)]">
              <div className="flex items-center gap-1.5 text-[11px] text-ink-muted uppercase tracking-widest">
                <Receipt className="w-3.5 h-3.5 text-ink-primary" />
                <span>DIRECT LOG TO 02 // LIVE BUDGET</span>
              </div>
              <span className="font-bold text-ink-primary text-[14px]">
                ₹{Math.round(billSummary.totalInr).toLocaleString()}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-ink-muted uppercase mb-1">PAID BY</label>
                <select
                  aria-label="Pharmacy Bill Paid By"
                  value={paidBy}
                  onChange={(e) => setPaidBy(e.target.value)}
                  className="w-full bg-[#121212] border border-[rgba(242,240,235,0.2)] px-2 py-1.5 text-[11px] text-ink-primary focus:outline-none"
                >
                  {travelers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-ink-muted uppercase mb-1">SPLIT MODE</label>
                <div className="grid grid-cols-2 border border-[rgba(242,240,235,0.2)]">
                  {(['equal', 'custom'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setSplitMode(mode)}
                      className={`py-1.5 text-[10px] font-bold uppercase cursor-pointer ${
                        splitMode === mode
                          ? 'bg-ink-primary text-canvas'
                          : 'bg-[#121212] text-ink-secondary hover:text-ink-primary'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogBillToBudget}
              disabled={billSummary.totalInr <= 0}
              className="w-full py-2 px-3 bg-ink-primary text-canvas font-bold text-[12px] hover:bg-white transition-colors cursor-pointer disabled:opacity-40"
            >
              [ LOG MED BILL TO BUDGET ]
            </button>

            {budgetLoggedMsg && (
              <div className="flex items-center gap-1.5 text-[11px] text-semantic-nominal font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{budgetLoggedMsg}</span>
              </div>
            )}
          </div>

          <div className="p-4 bg-[#161616] border border-[rgba(242,240,235,0.12)] flex-1 flex flex-col justify-between">
            <div>
              <div className="text-[11px] text-ink-muted uppercase tracking-widest mb-2 pb-1.5 border-b border-[rgba(242,240,235,0.08)]">
                REGIONAL HERITAGE &amp; SAFETY RULES // {activeDestination.name.toUpperCase()}
              </div>
              <ul className="space-y-1.5 text-[11px] text-ink-secondary font-sans leading-relaxed">
                <li>• <span className="text-ink-primary font-semibold">Sanctum Footwear Rule:</span> Footwear prohibited inside consecrated shrines.</li>
                <li>• <span className="text-ink-primary font-semibold">Water &amp; Monsoon Currents:</span> Mandatory certified life-vests during river crossings.</li>
                <li>• <span className="text-ink-primary font-semibold">Hydration &amp; Terrain:</span> Granite boulder heat &amp; humidity elevate midday exertion strain.</li>
              </ul>
            </div>

            <div className="pt-2.5 border-t border-[rgba(242,240,235,0.08)] text-[10px] text-ink-muted mt-3 flex justify-between">
              <span>SOURCE: ASI &amp; SAFETY PROTOCOL</span>
              <span>EMERGENCY: {activeDestination.country === 'Japan' ? '110 / 119' : '112'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
