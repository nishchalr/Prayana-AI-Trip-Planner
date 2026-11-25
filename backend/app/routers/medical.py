"""
Medical & Dietary Intelligence Router — /api/v1/medical/*
=========================================================
Provides a structured 110+ item travel medicine, mobility, and global
allergen/dietary database with fuzzy search (`GET /api/v1/medical/search`)
and custom Gemini + deterministic classifier (`POST /api/v1/medical/classify`).
"""

from __future__ import annotations

import json
import os
import re
import sys
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

router = APIRouter()


class MedicalConditionEntry(BaseModel):
    id: str
    name: str
    category: str  # "medical" | "mobility" | "dietary"
    subcategory: str
    aliases: List[str] = Field(default_factory=list)
    c_card: float = 0.0
    c_resp: float = 0.0
    c_mob: float = 0.0
    dietary_keywords: List[str] = Field(default_factory=list)
    recommended_kit_items: List[str] = Field(default_factory=list)
    route_advisory: str = ""
    source: str = "curated_catalog"


class MedicalSearchResponse(BaseModel):
    query: str
    count: int
    total_catalog_size: int
    results: List[MedicalConditionEntry]


class MedicalClassifyRequest(BaseModel):
    condition: str = Field(min_length=2, max_length=160)
    preferred_category: Optional[str] = Field(default=None, description="'medical' | 'mobility' | 'dietary'")


# ---------------------------------------------------------------------------
# Curated 112-Entry Travel Medical, Mobility & Dietary Database
# ---------------------------------------------------------------------------

def _m(
    cid: str,
    name: str,
    sub: str,
    aliases: List[str],
    c_card: float = 0.0,
    c_resp: float = 0.0,
    c_mob: float = 0.0,
    kit: Optional[List[str]] = None,
    advisory: str = "",
) -> Dict[str, Any]:
    return {
        "id": cid,
        "name": name,
        "category": "mobility" if c_mob >= 0.35 and c_card == 0 and c_resp == 0 else "medical",
        "subcategory": sub,
        "aliases": aliases,
        "c_card": c_card,
        "c_resp": c_resp,
        "c_mob": c_mob,
        "dietary_keywords": [],
        "recommended_kit_items": kit or ["Emergency medication list"],
        "route_advisory": advisory or "Monitor exertion and keep medication accessible.",
        "source": "curated_catalog",
    }


def _d(
    cid: str,
    name: str,
    sub: str,
    aliases: List[str],
    keywords: List[str],
    kit: Optional[List[str]] = None,
    advisory: str = "",
) -> Dict[str, Any]:
    return {
        "id": cid,
        "name": name,
        "category": "dietary",
        "subcategory": sub,
        "aliases": aliases,
        "c_card": 0.0,
        "c_resp": 0.0,
        "c_mob": 0.0,
        "dietary_keywords": keywords,
        "recommended_kit_items": kit or ["Printed dietary allergy translation card"],
        "route_advisory": advisory or "Screen menus with Tesseract OCR & confirm kitchen preparation.",
        "source": "curated_catalog",
    }


MEDICAL_CATALOG: List[Dict[str, Any]] = [
    # --- Cardiac & Vascular (14) ---
    _m("med-hypertension", "Hypertension", "Cardiac", ["high blood pressure", "bp", "htn"], c_card=0.45, kit=["Digital BP cuff", "Daily antihypertensives"], advisory="Avoid sudden high-heat exertion & steep climbs at noon."),
    _m("med-cad", "Coronary Artery Disease", "Cardiac", ["cad", "ischemic heart", "stent", "bypass"], c_card=0.75, kit=["Nitroglycerin spray", "Aspirin 325mg", "Cardiologist summary"], advisory="Enforce low-slope shaded pacing and short transit intervals."),
    _m("med-angina", "Stable Angina", "Cardiac", ["chest pain", "angina pectoris"], c_card=0.70, kit=["Sublingual nitrates", "Rest alert timer"], advisory="Exclude steep elevation changes and rushing between sites."),
    _m("med-arrhythmia", "Cardiac Arrhythmia / AFib", "Cardiac", ["afib", "atrial fibrillation", "palpitations", "svt"], c_card=0.55, kit=["Anticoagulant card", "Pulse oximeter"], advisory="Flag sustained HR > 110 BPM immediately."),
    _m("med-chf", "Congestive Heart Failure", "Cardiac", ["chf", "heart failure", "cardiomyopathy"], c_card=0.80, kit=["Diuretics", "Daily fluid tracker"], advisory="Strictly flat accessible corridors, frequent rest benches."),
    _m("med-pacemaker", "Pacemaker / ICD Implant", "Cardiac", ["pacemaker", "icd", "defibrillator"], c_card=0.55, kit=["Device manufacturer ID card"], advisory="Request manual pat-down over magnetometer screening; avoid steep exertion."),
    _m("med-bradycardia", "Sinus Bradycardia", "Cardiac", ["low heart rate", "bradycardia"], c_card=0.35, kit=["ECG baseline note"], advisory="Watch for dizziness on stair ascents."),
    _m("med-pots", "POTS (Postural Tachycardia)", "Cardiac", ["pots", "dysautonomia", "orthostatic tachycardia"], c_card=0.55, kit=["ORS electrolyte packets", "Compression stockings"], advisory="Prioritize shaded paths, cold fluids, and seated transfers in heat."),
    _m("med-orthostatic", "Orthostatic Hypotension", "Cardiac", ["low bp", "dizzy standing", "hypotension"], c_card=0.40, kit=["Electrolyte sachets", "Compression socks"], advisory="Extend dwell buffer transitions between vehicle and walking legs."),
    _m("med-pad", "Peripheral Artery Disease", "Cardiac", ["claudication", "pad", "leg circulation"], c_card=0.40, c_mob=0.45, kit=["Supportive footwear"], advisory="Cap continuous walk legs under 600 m with bench stops."),
    _m("med-dvt", "DVT / Clotting Risk", "Cardiac", ["deep vein thrombosis", "blood clot", "factor v"], c_card=0.40, kit=["Graduated compression socks", "Anticoagulant dose alarm"], advisory="Schedule movement breaks on transit legs exceeding 90 minutes."),
    _m("med-varicose", "Chronic Venous Insufficiency", "Cardiac", ["varicose veins", "edema", "leg swelling"], c_card=0.20, c_mob=0.25, kit=["Compression sleeves"], advisory="Alternate standing museum waits with seated resting points."),
    _m("med-valve", "Valvular Heart Disease", "Cardiac", ["mitral valve", "aortic stenosis", "murmur"], c_card=0.60, kit=["Antibiotic prophylaxis letter"], advisory="Cap maximum altitude and midday WBGT exposure."),
    _m("med-raynaud", "Raynaud's Phenomenon", "Cardiac", ["cold fingers", "vasospasm", "raynauds"], c_card=0.20, kit=["Insulated glove liners"], advisory="Carry thermal hand warmers in misted hill stations."),

    # --- Respiratory & Altitude (12) ---
    _m("med-asthma", "Asthma", "Respiratory", ["bronchial asthma", "inhaler", "wheezing"], c_resp=0.55, kit=["Salbutamol rescue inhaler", "Spacer", "Dust mask"], advisory="Avoid high-dust construction routes and steep humid stairs."),
    _m("med-copd", "COPD", "Respiratory", ["chronic obstructive pulmonary disease", "emphysema", "chronic bronchitis"], c_resp=0.80, kit=["Bronchodilator inhaler", "Portable pulse oximeter", "Oxygen clearance"], advisory="Strictly avoid high-slope trails and cap altitude < 1,500 m."),
    _m("med-bronchiectasis", "Bronchiectasis", "Respiratory", ["chronic lung infection", "sputum clearance"], c_resp=0.65, kit=["Airway clearance device", "Standby antibiotics note"], advisory="Favor clean indoor air and unhurried morning walks."),
    _m("med-altitude", "Altitude Sensitivity / AMS", "Respiratory", ["mountain sickness", "ams", "high altitude", "hypoxia"], c_resp=0.60, kit=["Acetazolamide (consult MD)", "SpO2 finger monitor"], advisory="Enforce gradual ascent stages and track SpO2 < 94%."),
    _m("med-sleep-apnea", "Obstructive Sleep Apnea", "Respiratory", ["osa", "cpap", "sleep apnea"], c_resp=0.35, kit=["Travel CPAP + universal adapter", "Distilled water check"], advisory="Verify stay accommodations have continuous bedside power."),
    _m("med-ild", "Interstitial Lung Disease", "Respiratory", ["pulmonary fibrosis", "ild"], c_resp=0.80, kit=["Portable O2 plan", "N95 filter masks"], advisory="Minimize walking slope; keep SpO2 threshold strict at 92%."),
    _m("med-pulm-htn", "Pulmonary Hypertension", "Respiratory", ["pah", "pulmonary pressure"], c_card=0.50, c_resp=0.75, kit=["Specialist emergency contact"], advisory="Zero steep ascents; vehicle-to-gate drop-offs only."),
    _m("med-allergic-rhinitis", "Severe Allergic Rhinitis / Sinusitis", "Respiratory", ["sinus", "hay fever", "pollen"], c_resp=0.25, kit=["Antihistamines", "Saline nasal spray"], advisory="Carry N95 mask near dusty bazaar corridors."),
    _m("med-vocal-cord", "Vocal Cord Dysfunction", "Respiratory", ["vcd", "stridor", "laryngeal spasm"], c_resp=0.35, kit=["Throat lozenges", "Water flask"], advisory="Avoid smoky temple incense interiors when congested."),
    _m("med-post-pneumonia", "Post-Pneumonia / COVID Recovery", "Respiratory", ["long covid", "lung recovery", "dyspnea"], c_resp=0.50, kit=["Finger oximeter", "Electrolytes"], advisory="Insert 15-minute rest buffers between consecutive monuments."),
    _m("med-cystic-fibrosis", "Cystic Fibrosis", "Respiratory", ["cf", "pancreatic enzymes"], c_resp=0.75, kit=["Pancreatic enzymes", "Salt tablets", "Nebulizer"], advisory="Ensure cold-chain storage at hotel and high hydration."),
    _m("med-hyperventilation", "Chronic Hyperventilation / Panic", "Respiratory", ["breathlessness", "panic breathing"], c_resp=0.30, kit=["Breathing pace timer"], advisory="Prefer low-crowd hours and calm heritage courtyards."),

    # --- Metabolic & Endocrine (11) ---
    _m("med-t1d", "Type 1 Diabetes", "Metabolic", ["t1d", "insulin dependent", "type one diabetes", "cgm"], c_card=0.35, kit=["Insulin pens + Frio cooling pouch", "Glucose tabs", "Extra CGM sensors"], advisory="Schedule predictable meal stops every 3-4 hours; avoid heat hypoglycemia."),
    _m("med-t2d", "Type 2 Diabetes", "Metabolic", ["t2d", "diabetes", "diabetic", "metformin", "sugar"], c_card=0.30, kit=["Glucometer", "Emergency carbs", "Breathable seamless socks"], advisory="Protect feet with cushioned shoes; schedule regular dining breaks."),
    _m("med-hypoglycemia", "Reactive Hypoglycemia", "Metabolic", ["low blood sugar", "sugar crash"], c_card=0.25, kit=["Fast-acting glucose gel", "Mixed seed bars"], advisory="Never skip lunch blocks during long bus or train transfers."),
    _m("med-gestational-dm", "Gestational Diabetes", "Metabolic", ["pregnancy diabetes", "gdm"], c_card=0.30, c_mob=0.35, kit=["Glucometer strips", "Low-GI snacks"], advisory="Frequent seated meal intervals & low physical strain."),
    _m("med-hypothyroid", "Hypothyroidism", "Metabolic", ["thyroid", "levothyroxine", "hashimotos"], c_card=0.15, kit=["Morning thyroid dose organizer"], advisory="Factor cold sensitivity in misty hills & morning fatigue buffers."),
    _m("med-hyperthyroid", "Hyperthyroidism / Graves'", "Metabolic", ["graves disease", "overactive thyroid"], c_card=0.40, kit=["Beta blocker if prescribed", "Cooling towel"], advisory="Tight heat threshold (WBGT > 26°C) due to tachycardia risk."),
    _m("med-adrenal", "Adrenal Insufficiency / Addison's", "Metabolic", ["addisons", "steroid dependent", "cortisol"], c_card=0.50, kit=["Hydrocortisone emergency injection kit", "Medical ID bracelet"], advisory="Monitor heat & GI stress closely; double-dose guidance on hand."),
    _m("med-gout", "Gout / Hyperuricemia", "Metabolic", ["uric acid", "toe flare", "gouty arthritis"], c_mob=0.45, kit=["Anti-inflammatory flare meds", "Wide-toe sandals"], advisory="Avoid excessive steep steps during flare; maintain high water intake."),
    _m("med-pcos", "PCOS / Insulin Resistance", "Metabolic", ["pcos"], c_card=0.10, kit=["Routine prescriptions"], advisory="Low-GI meal planning and hydration breaks."),
    _m("med-osteomalacia", "Vitamin D / Bone Fragility", "Metabolic", ["rickets", "osteopenia", "weak bones"], c_mob=0.35, kit=["Grip-sole walking shoes"], advisory="Prefer paved steps with handrails on uneven boulders."),
    _m("med-pku", "Phenylketonuria (PKU)", "Metabolic", ["pku", "aspartame avoid"], c_card=0.10, kit=["Low-protein medical formula"], advisory="Strict protein & aspartame food screening."),

    # --- Neurological & Vestibular (12) ---
    _m("med-epilepsy", "Epilepsy / Seizure Disorder", "Neurological", ["seizures", "anticonvulsant"], c_card=0.35, kit=["Anti-epileptic supply (+5 days spare)", "Emergency seizure protocol"], advisory="Ensure regular sleep rhythm and shade from strobing sunlight."),
    _m("med-migraine", "Chronic Migraine / Photophobia", "Neurological", ["headache", "aura", "light sensitivity"], c_card=0.15, c_mob=0.20, kit=["Triptans", "Polarized sunglasses", "Electrolyte hydration"], advisory="Schedule bright outdoor ruins before 10:30 AM."),
    _m("med-vertigo", "Vertigo / BPPV", "Neurological", ["dizziness", "spinning", "labyrinthitis", "inner ear"], c_mob=0.45, kit=["Meclizine / Betahistine", "Trekking pole"], advisory="Exclude narrow cliff ledges, steep stone drops, and swinging bridges."),
    _m("med-motion-sickness", "Motion Sickness", "Neurological", ["car sick", "kinetosis", "sea sick", "nausea"], c_card=0.05, kit=["Ginger chews", "Scopolamine patch / Ondansetron", "Acupressure bands"], advisory="Request front-seat ghat road positioning and short boat segments."),
    _m("med-meniere", "Meniere's Disease", "Neurological", ["tinnitus vertigo", "ear pressure"], c_mob=0.40, kit=["Low-sodium snacks", "Vestibular rescue meds"], advisory="Avoid sudden altitude shifts and high-salt restaurant broths."),
    _m("med-neuropathy", "Peripheral Neuropathy", "Neurological", ["numb feet", "nerve pain", "tingling"], c_mob=0.50, kit=["Blister inspection mirror", "Cushioned orthopedic shoes"], advisory="Avoid uneven cobblestone trails in low light."),
    _m("med-parkinsons", "Parkinson's Disease", "Neurological", ["tremor", "bradykinesia", "freezing gait"], c_mob=0.65, kit=["Timed dopaminergic pill alarm", "Collapsible cane"], advisory="Keep timing synced to ON-medication windows & flat accessible ramps."),
    _m("med-ms", "Multiple Sclerosis (Heat-Sensitive)", "Neurological", ["ms", "uhthoff", "nerve fatigue"], c_card=0.25, c_mob=0.55, kit=["Phase-change cooling vest", "Portable neck fan"], advisory="Strict thermal cap (WBGT > 26°C routes indoor/morning only)."),
    _m("med-stroke", "Post-Stroke Hemiparesis Recovery", "Neurological", ["tia", "cva recovery", "weak side"], c_card=0.50, c_mob=0.70, kit=["Antiplatelets", "Handrail route preference"], advisory="Enforce wheelchair/ramp-compatible step-free itineraries."),
    _m("med-essential-tremor", "Essential Tremor", "Neurological", ["hand tremor"], c_mob=0.15, kit=["Weighted travel utensil"], advisory="Plan calm unhurried dining & photography pauses."),
    _m("med-narcolepsy", "Narcolepsy / Hypersomnia", "Neurological", ["sleep attack", "cataplexy"], c_card=0.15, kit=["Scheduled alertness breaks"], advisory="Do not assign solo self-driving responsibility."),
    _m("med-claustrophobia", "Severe Claustrophobia / Crowd Anxiety", "Neurological", ["crowd panic", "enclosed space fear"], c_card=0.15, kit=["Noise-canceling earbuds"], advisory="Avoid tight subterranean sanctum queues; prioritize open pavilions."),

    # --- Musculoskeletal & Mobility (16) ---
    _m("mob-wheelchair", "Wheelchair User (Full-Time)", "Mobility", ["paraplegia", "manual wheelchair", "power chair"], c_mob=0.95, kit=["Spare tire patch / Allen tool", "Transfer board"], advisory="Hard filter: exclude slopes > 5.0° and un-ramped multi-tier stairs."),
    _m("mob-assisted", "Assisted / Walker Mobility", "Mobility", ["rollator", "walking frame", "assisted mobility"], c_mob=0.65, kit=["Foldable seat rollator", "Anti-slip rubber tips"], advisory="Filter out gravel steep grades; keep segment distances brief."),
    _m("mob-cane", "Single-Point Cane User", "Mobility", ["walking stick", "cane", "balance support"], c_mob=0.45, kit=["Shock-absorbing cane tip"], advisory="Prioritize monuments with paved pathways and seating."),
    _m("mob-arthritis", "Osteoarthritis / Joint Pain", "Mobility", ["arthritis", "knee pain", "joint inflammation"], c_mob=0.45, kit=["Topical diclofenac gel", "Knee sleeves", "NSAIDs"], advisory="Reduce stair ascent count and elevation delta per day."),
    _m("mob-ra", "Rheumatoid Arthritis", "Mobility", ["autoimmune arthritis", "ra flare"], c_card=0.20, c_mob=0.55, kit=["Warm joint wraps", "Immunomodulator travel letter"], advisory="Protect morning stiffness window; start sightseeing after 09:00 AM."),
    _m("mob-knee-replace", "Knee Replacement (TKR Recovery)", "Mobility", ["knee surgery", "tkr", "arthroplasty"], c_mob=0.70, kit=["Collapsible gel ice pack", "Walking pole"], advisory="Prohibit deep kneeling & long step descents; favor level drives."),
    _m("mob-hip-replace", "Hip Replacement Recovery", "Mobility", ["hip surgery", "thr", "hip precautions"], c_mob=0.70, kit=["Portable raised seat cushion", "Long-handled shoehorn"], advisory="Ensure accessible western restrooms & low-step vehicle entry."),
    _m("mob-acl", "Post-ACL / Ligament Surgery Recovery", "Mobility", ["acl", "meniscus tear", "knee brace"], c_mob=0.70, kit=["Hinged knee brace", "Compression wrap"], advisory="Block slippery wet granite & uneven boulder scrambling."),
    _m("mob-sciatica", "Sciatica / Lumbar Herniated Disc", "Mobility", ["slip disc", "back pain", "radiculopathy", "l4 l5"], c_mob=0.55, kit=["Lumbar travel pillow", "Muscle relaxants"], advisory="Break road transit every 45 min; limit jarring auto-rickshaw rides."),
    _m("mob-stenosis", "Spinal Stenosis", "Mobility", ["spinal narrowing", "neurogenic claudication"], c_mob=0.60, kit=["Foldable lightweight stool"], advisory="Ensure frequent resting benches every 300 m."),
    _m("mob-ankle", "Ankle Instability / Sprain Recovery", "Mobility", ["twisted ankle", "achilles tendinitis"], c_mob=0.50, kit=["Lace-up ankle stabilizer", "Instant cold pack"], advisory="Require flat paved corridors; skip rocky hills."),
    _m("mob-plantar", "Plantar Fasciitis / Heel Spur", "Mobility", ["foot arch pain", "heel pain"], c_mob=0.35, kit=["Orthotic insoles", "Foot roller ball"], advisory="Keep daily cumulative walking distance below 5 km."),
    _m("mob-prosthetic", "Lower-Limb Prosthetic User", "Mobility", ["amputee", "prosthesis"], c_mob=0.65, kit=["Spare liner", "Chafing balm", "Backup charger"], advisory="Avoid high heat/sweat steep climbs causing liner friction."),
    _m("mob-fibromyalgia", "Fibromyalgia / Chronic Fatigue", "Mobility", ["cfs", "me/cfs", "widespread pain"], c_mob=0.50, kit=["Pacing timer", "Heat patches"], advisory="Enforce balanced pace with mandatory afternoon downtime."),
    _m("mob-osteoporosis", "Severe Osteoporosis", "Mobility", ["bone density", "fracture risk"], c_mob=0.45, kit=["High-traction sole shoes"], advisory="Strict fall prevention — avoid mossy steps during monsoon."),
    _m("mob-dystrophy", "Muscular Dystrophy / Myopathy", "Mobility", ["muscle weakness", "myasthenia gravis"], c_card=0.30, c_mob=0.80, kit=["Motorized mobility aid battery", "MedicAlert tag"], advisory="Require step-free accessible routes and climate-controlled rest."),

    # --- Systemic, Hematologic, GI, Sensory & Senior (19) ---
    _m("med-anemia", "Severe Anemia", "Hematologic", ["low hemoglobin", "iron deficiency"], c_card=0.35, c_resp=0.35, kit=["Iron supplements", "Pulse oximeter"], advisory="Lower aerobic effort budget due to faster fatigue on inclines."),
    _m("med-sickle-cell", "Sickle Cell Disease / Trait", "Hematologic", ["sickle cell anemia", "vaso-occlusive"], c_card=0.45, c_resp=0.55, kit=["Hydration pack (3L)", "Pain crisis plan"], advisory="Strictly avoid high altitude, dehydration, and extreme temperature swings."),
    _m("med-hemophilia", "Hemophilia / Bleeding Disorder", "Hematologic", ["bleeding risk", "warfarin", "factor viii"], c_card=0.30, c_mob=0.25, kit=["Clotting factor concentrates", "Hospital hematology note"], advisory="Exclude high-slip boulders and crowded festival crush zones."),
    _m("med-ckd", "Chronic Kidney Disease", "Renal", ["kidney failure", "renal", "dialysis"], c_card=0.55, kit=["Renal medication list", "Fluid limit log"], advisory="Monitor heat fluid balance and restrict high-potassium/sodium street food."),
    _m("med-ibs", "IBS / Crohn's / Ulcerative Colitis", "GI", ["ibd", "crohns", "colitis", "stomach cramp"], c_mob=0.20, kit=["Loperamide", "Oral rehydration salts", "Clean restroom map"], advisory="Prioritize stops with verified modern restroom facilities."),
    _m("med-gerd", "Severe GERD / Acid Reflux", "GI", ["heartburn", "hiatal hernia", "ulcer"], c_card=0.05, kit=["Antacids / PPI"], advisory="Avoid very late heavy spicy dinners right before transit."),
    _m("med-preg-1", "Pregnancy (First Trimester)", "Maternal", ["pregnant", "morning sickness", "trimester 1"], c_mob=0.30, kit=["Folic acid", "Ginger lozenges", "OB clearance note"], advisory="Avoid bumpy off-road jeeps; carry bottled hydration & motion nausea kit."),
    _m("med-preg-2", "Pregnancy (Second Trimester)", "Maternal", ["pregnant", "trimester 2"], c_mob=0.40, kit=["Maternity support belt", "Electrolytes"], advisory="Prioritize accessible restrooms and moderate shaded pacing."),
    _m("med-preg-3", "Pregnancy (Third Trimester)", "Maternal", ["late pregnancy", "trimester 3"], c_card=0.35, c_mob=0.65, kit=["Hospital birth file", "Maternity cushion"], advisory="Keep itinerary within 20 min of accredited hospital; minimal walking slope."),
    _m("med-immuno", "Immunocompromised / Post-Transplant", "Immune", ["chemotherapy", "transplant", "biologics", "low wbc"], c_card=0.25, c_resp=0.35, kit=["KN95 masks", "Hand sanitizer", "Boiled/sealed water strictly"], advisory="Strict food hygiene — avoid raw street chutneys, ice, and open buffets."),
    _m("med-heat-intol", "Severe Heat Intolerance / Anhidrosis", "Thermal", ["heat exhaustion risk", "cannot sweat"], c_card=0.40, c_resp=0.25, kit=["Ice neck wraps", "Electrolytes"], advisory="Mandatory indoor AC rerouting above 26°C WBGT."),
    _m("med-uv-lupus", "Lupus (SLE) / Extreme Photosensitivity", "Immune", ["lupus", "photodermatitis", "albinism"], c_card=0.25, c_mob=0.25, kit=["SPF 50+ sunscreen", "UPF 50 wide hat & sleeves"], advisory="Schedule outdoor heritage visits strictly near dawn/dusk."),
    _m("med-low-vision", "Low Vision / Blindness", "Sensory", ["visually impaired", "glaucoma", "macular degeneration"], c_mob=0.40, kit=["Audio descriptive guide", "High-contrast flashlight"], advisory="Highlight tactile ruins/music halls and smooth flagged pathways."),
    _m("med-hearing", "Deafness / Hearing Impairment", "Sensory", ["hard of hearing", "cochlear implant"], c_mob=0.10, kit=["Spare hearing aid batteries", "Visual alert card"], advisory="Use visual text chat / offline Bhashini screen translation everywhere."),
    _m("med-senior-70", "Senior Stamina Conservation (70+)", "Geriatric", ["elderly", "senior citizen", "frail"], c_card=0.35, c_mob=0.50, kit=["Foldable seat cane", "Electrolyte pack"], advisory="Lower daily ω effort budget with midday siesta break."),
    _m("med-eczema", "Severe Atopic Dermatitis / Eczema", "Dermatologic", ["skin flare", "eczema"], c_card=0.05, kit=["Barrier emollient cream", "Cotton clothing"], advisory="Carry personal fragrance-free toiletries; avoid harsh midday humidity."),
    _m("med-g6pd", "G6PD Deficiency", "Hematologic", ["favism", "fava bean avoid"], c_card=0.20, kit=["Unsafe drug/fava list card"], advisory="Avoid fava beans, tonic water quinine, and naphthalene exposures."),
    _m("med-hemochromatosis", "Hemochromatosis", "Hematologic", ["iron overload"], c_card=0.25, kit=["Routine checkup note"], advisory="Avoid raw shellfish (Vibrio risk) and iron-fortified supplements."),
    _m("med-tdiarrhea", "GI Sensitivity / Traveler's Diarrhea Risk", "GI", ["sensitive stomach", "delhi belly"], c_mob=0.10, kit=["ORS sachets", "Bismuth subsalicylate", "Water filter straw"], advisory="Stick strictly to freshly cooked piping-hot dishes and sealed water."),

    # --- Global Allergens & Dietary Restrictions (40) ---
    _d("diet-anaphylaxis", "Severe Anaphylaxis Risk (EpiPen Carrier)", "Critical Allergen", ["epipen", "anaphylactic shock"], ["peanut", "cashew", "almond", "walnut", "pistachio", "prawn", "shrimp", "crab", "sesame"], kit=["2x Epinephrine auto-injectors", "Antihistamine liquid", "Local ER coordinates"], advisory="Mandatory OCR check + strict verbal kitchen briefing prior to every meal."),
    _d("diet-peanut", "Peanut Allergy", "Top Allergen", ["groundnut", "moongphali", "peanut oil"], ["peanut", "peanuts", "groundnut", "moongphali", "singdana", "satay", "peanuf"], kit=["EpiPen / Cetirizine", "Peanut allergy card"]),
    _d("diet-treenut", "Tree Nut Allergy", "Top Allergen", ["nut allergy", "cashew", "almond", "walnut", "pistachio", "kaju", "badam"], ["cashew", "kaju", "almond", "badam", "walnut", "akhrot", "pistachio", "pista", "hazelnut", "pecan", "macadamia", "pine nut", "nut", "nuts", "praline", "marzipan"], kit=["EpiPen", "Tree-nut allergy card (watch Indian gravies: korma/pasanda!)"]),
    _d("diet-shellfish", "Shellfish Allergy", "Top Allergen", ["prawn", "shrimp", "crab", "lobster", "crustacean"], ["prawn", "prawns", "shrimp", "crab", "lobster", "crayfish", "krill", "shellfish", "scampi", "jhinga"], kit=["EpiPen", "Antihistamine"]),
    _d("diet-molluscs", "Mollusc Allergy", "Top Allergen", ["clam", "mussel", "oyster", "squid", "octopus", "calamari"], ["clam", "mussel", "oyster", "squid", "calamari", "octopus", "scallop", "snail", "abalone"], kit=["Oyster sauce translation warning (Kyoto/Asian dishes)"]),
    _d("diet-fish", "Fin Fish Allergy", "Top Allergen", ["fish", "seafood", "dashi", "bonito", "anchovy", "fish sauce"], ["fish", "salmon", "tuna", "cod", "mackerel", "sardine", "anchovy", "pomfret", "surmai", "dashi", "bonito", "katsuobushi", "worcestershire"], kit=["Watch hidden bonito/dashi stock in vegetarian-looking Japanese broths!"]),
    _d("diet-dairy", "Milk / Dairy Allergy", "Top Allergen", ["dairy free", "casein", "whey", "paneer", "ghee"], ["milk", "cream", "butter", "cheese", "paneer", "ghee", "curd", "yogurt", "dahi", "lassi", "khoya", "mawa", "malai", "casein", "whey", "lactose"], kit=["Watch hidden ghee & paneer in Indian restaurant curries!"]),
    _d("diet-lactose", "Lactose Intolerance", "Intolerance", ["lactase", "milk sugar"], ["milk", "cream", "ice cream", "paneer", "curd", "yogurt", "lassi", "cheese", "buttermilk", "chaas"], kit=["Lactase enzyme chewables"]),
    _d("diet-egg", "Egg Allergy", "Top Allergen", ["egg free", "eggs", "ovalbumin", "mayo"], ["egg", "eggs", "omelette", "bhurji", "mayo", "mayonnaise", "meringue", "custard", "brioche", "albumen"], kit=["Eggless bakery verification card"]),
    _d("diet-soy", "Soy Allergy", "Top Allergen", ["soya", "tofu", "edamame", "miso", "shoyu"], ["soy", "soya", "soybean", "tofu", "edamame", "miso", "tempeh", "shoyu", "tamari", "teriyaki", "lecithin"], kit=["Watch hidden soy sauce across Kyoto eateries!"]),
    _d("diet-sesame", "Sesame Allergy", "Top Allergen", ["til", "tahini", "gingelly", "sesame oil"], ["sesame", "til", "tahini", "gingelly", "goma", "halva", "hummus", "baba ganoush"], kit=["Verify temple prasadam & South Indian cooking oils (gingelly/sesame oil)!"]),
    _d("diet-celiac", "Celiac Disease (Strict Gluten-Free)", "Autoimmune Diet", ["celiac", "gluten free", "wheat", "maida", "barley", "rye"], ["wheat", "maida", "atta", "flour", "roti", "naan", "paratha", "chapati", "bread", "semolina", "rava", "sooji", "gluten", "barley", "rye", "seitan", "udon", "ramen", "soba", "malt"], kit=["Dedicated gluten-free frying surface card"]),
    _d("diet-wheat", "Wheat Allergy", "Top Allergen", ["atta", "maida", "gluten"], ["wheat", "maida", "atta", "flour", "roti", "naan", "bread", "pasta", "pastry", "semolina", "rava"], kit=["Rice/millet flatbread backup card"]),
    _d("diet-mustard", "Mustard Allergy", "Top Allergen", ["rai", "sarson", "mustard oil"], ["mustard", "rai", "sarson", "kasundi", "dijon", "karashi"], kit=["Check South Indian tadka/tempering (black mustard seeds ubiquitous in chutneys)!"]),
    _d("diet-sulfite", "Sulfite Sensitivity", "Intolerance", ["sulphite", "wine preservative", "dried fruit"], ["sulfite", "sulphite", "wine", "vinegar", "dried fruit", "molasses"], kit=["Bronchodilator if asthmatic"]),
    _d("diet-corn", "Corn / Maize Allergy", "Allergen", ["maize", "cornstarch", "makki"], ["corn", "maize", "cornstarch", "cornmeal", "makki", "polenta", "popcorn", "hfcs"], kit=["Check soup/gravy thickeners (cornstarch common)"]),
    _d("diet-buckwheat", "Buckwheat Allergy (Soba Risk)", "Critical Allergen", ["soba", "kuttu"], ["buckwheat", "soba", "kuttu", "kasha"], kit=["Critical alert for Kyoto soba noodle kitchens!"]),
    _d("diet-lupin", "Lupin Flour Allergy", "Allergen", ["lupine"], ["lupin", "lupine", "lupini"], kit=["Check European-style bakery gluten-free flour blends"]),
    _d("diet-celery", "Celery / Celeriac Allergy", "Allergen", ["celery seed", "ajwain"], ["celery", "celeriac", "bouillon"], kit=["Verify soup stocks & spice mixes"]),
    _d("diet-alphagal", "Alpha-Gal Syndrome (Red Meat Allergy)", "Critical Allergen", ["mammalian meat", "tick bite meat", "beef", "pork", "lamb"], ["beef", "pork", "lamb", "mutton", "goat", "veal", "venison", "steak", "bacon", "ham", "sausage", "gelatin", "lard", "tallow"], kit=["EpiPen", "Dairy/mammalian gelatin watch card"]),
    _d("diet-legume", "Legume / Chickpea / Lentil Allergy", "Allergen", ["besan", "dal", "chana", "lentil"], ["lentil", "dal", "chickpea", "chana", "besan", "pea", "beans", "rajma", "sambar", "hummus"], kit=["Screen Indian batters (papad/besan/sambar use lentils)!"]),
    _d("diet-nightshade", "Nightshade Sensitivity", "Sensitivity", ["tomato", "potato", "chili", "eggplant", "brinjal"], ["tomato", "potato", "chili", "chilli", "pepper", "paprika", "eggplant", "brinjal", "capsicum", "aloo"]),
    _d("diet-allium", "Allium Allergy (No Onion / Garlic)", "Allergen / Cultural", ["onion free", "garlic free", "fodmap allium"], ["onion", "pyaz", "garlic", "lahsun", "leek", "shallot", "chive", "scallion"]),
    _d("diet-coconut", "Coconut Allergy", "Allergen", ["nariyal", "coconut oil", "coconut milk"], ["coconut", "nariyal", "copra"], kit=["Check Kerala/Hampi/Coorg curries & chutneys!"]),
    _d("diet-latex-fruit", "Latex-Fruit Cross-Reactivity", "Allergen", ["banana", "avocado", "kiwi", "chestnut"], ["banana", "avocado", "kiwi", "chestnut", "papaya", "fig"]),
    _d("diet-histamine", "Histamine Intolerance", "Intolerance", ["fermented food", "aged cheese"], ["aged cheese", "fermented", "pickled", "vinegar", "kimchi", "miso", "salami", "wine", "spinach"]),
    _d("diet-fructose", "Fructose Malabsorption", "Intolerance", ["high fructose", "honey", "apple"], ["honey", "hfcs", "apple", "pear", "mango", "watermelon", "agave"]),
    _d("diet-fodmap", "Low-FODMAP Diet", "GI Diet", ["ibs diet", "low fodmap"], ["onion", "garlic", "wheat", "milk", "honey", "beans", "chickpea", "lentil"]),
    _d("diet-caffeine", "Severe Caffeine Sensitivity", "Sensitivity", ["no coffee", "no matcha", "decaf"], ["coffee", "espresso", "matcha", "green tea", "chai", "tea", "caffeine", "cola", "chocolate"]),
    _d("diet-pure-veg", "Pure Vegetarian", "Dietary Lifestyle", ["veg", "lacto vegetarian", "shakahari"], ["chicken", "mutton", "beef", "pork", "lamb", "fish", "prawn", "shrimp", "crab", "meat", "egg", "omelette", "gelatin", "dashi", "lard"], advisory="Exclude meat/seafood kitchens or require dedicated vegetarian kitchenware."),
    _d("diet-vegan", "Vegan (Plant-Based)", "Dietary Lifestyle", ["plant based", "no dairy", "no egg"], ["chicken", "mutton", "beef", "pork", "fish", "prawn", "meat", "egg", "milk", "cheese", "paneer", "ghee", "butter", "cream", "curd", "yogurt", "honey", "gelatin", "dashi"], advisory="Flag dairy/ghee, honey, eggs, and fish broths in OCR scans."),
    _d("diet-jain", "Jain Vegetarian (Strict)", "Dietary Lifestyle", ["jain", "no root vegetables", "no onion garlic"], ["chicken", "mutton", "beef", "pork", "fish", "egg", "meat", "onion", "garlic", "potato", "aloo", "carrot", "beetroot", "radish", "ginger", "honey", "mushroom"], advisory="Screen out meat AND underground root vegetables (potato, onion, garlic, carrot)."),
    _d("diet-halal", "Halal", "Dietary Lifestyle", ["zabiha", "no pork", "no alcohol"], ["pork", "bacon", "ham", "lard", "gelatin", "alcohol", "wine", "beer", "rum", "whisky", "mirin", "sake"], kit=["Verify Halal certification & mirin/sake alcohol-free prep in Kyoto!"]),
    _d("diet-kosher", "Kosher", "Dietary Lifestyle", ["parve", "kashrut"], ["pork", "bacon", "ham", "shellfish", "prawn", "shrimp", "crab", "lobster", "oyster", "clam"], kit=["Arrange sealed Kosher meal deliveries ahead in heritage regions."]),
    _d("diet-pescatarian", "Pescatarian", "Dietary Lifestyle", ["fish ok no meat"], ["chicken", "mutton", "beef", "pork", "lamb", "duck", "bacon", "ham", "steak", "meat"]),
    _d("diet-sattvic", "Sattvic Diet", "Dietary Lifestyle", ["ayurvedic veg", "no onion garlic"], ["meat", "chicken", "fish", "egg", "onion", "garlic", "mushroom", "alcohol", "vinegar", "coffee"]),
    _d("diet-keto", "Ketogenic Diet", "Therapeutic Diet", ["keto", "very low carb"], ["sugar", "rice", "bread", "roti", "naan", "pasta", "noodle", "potato", "sweet", "halwa", "dessert"]),
    _d("diet-low-sodium", "Low-Sodium Heart / Renal Diet", "Medical Diet", ["low salt", "no msg"], ["pickle", "achaar", "papad", "soy sauce", "shoyu", "miso", "salted", "cured", "bacon", "broth"]),
    _d("diet-low-sugar", "Low-Glycemic / Diabetic Diet", "Medical Diet", ["sugar free", "diabetic meal"], ["halwa", "kheer", "gulab", "jalebi", "laddu", "syrup", "sugar", "cake", "pastry", "sweet"]),
    _d("diet-alcohol-free", "Strict Alcohol-Free (Culinary Included)", "Lifestyle / Med Conflict", ["no mirin", "no sake", "no wine sauce"], ["wine", "beer", "rum", "brandy", "whisky", "vodka", "mirin", "sake", "liquor", "bourbon"]),
]


def _levenshtein(a: str, b: str) -> int:
    la, lb = len(a), len(b)
    if la == 0:
        return lb
    if lb == 0:
        return la
    prev = list(range(lb + 1))
    for i in range(1, la + 1):
        curr = [i] + [0] * lb
        for j in range(1, lb + 1):
            cost = 0 if a[i - 1] == b[j - 1] else 1
            curr[j] = min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
        prev = curr
    return prev[lb]


@router.get("/search", response_model=MedicalSearchResponse, summary="Fuzzy Search 110+ Medical & Dietary Conditions")
def search_medical_conditions(
    q: str = Query(default="", description="Condition, symptom, allergen, or dietary term"),
    category: str = Query(default="all", description="'all' | 'medical' | 'mobility' | 'dietary'"),
    limit: int = Query(default=25, ge=1, le=60),
) -> MedicalSearchResponse:
    cat = category.lower().strip()
    pool = [
        item for item in MEDICAL_CATALOG
        if cat == "all"
        or (cat == "medical" and item["category"] in ("medical", "mobility"))
        or item["category"] == cat
    ]

    query = q.strip().lower()
    if not query:
        return MedicalSearchResponse(
            query=q,
            count=min(limit, len(pool)),
            total_catalog_size=len(MEDICAL_CATALOG),
            results=[MedicalConditionEntry(**item) for item in pool[:limit]],
        )

    scored: List[tuple[float, Dict[str, Any]]] = []
    q_tokens = [t for t in re.split(r"[\s,/()-]+", query) if len(t) >= 2]

    for item in pool:
        name_l = item["name"].lower()
        sub_l = item["subcategory"].lower()
        aliases_l = [a.lower() for a in item["aliases"]]
        score = 0.0

        if name_l == query or any(a == query for a in aliases_l):
            score = 100.0
        elif name_l.startswith(query) or any(a.startswith(query) for a in aliases_l):
            score = 90.0
        elif query in name_l or any(query in a for a in aliases_l):
            score = 80.0
        elif query in sub_l:
            score = 60.0
        else:
            # Fuzzy word-level similarity across name & aliases
            words = re.split(r"[\s,/()-]+", name_l + " " + " ".join(aliases_l))
            best_sim = 0.0
            for qt in q_tokens or [query]:
                for w in words:
                    if len(w) < 2:
                        continue
                    if w.startswith(qt) or qt in w:
                        best_sim = max(best_sim, 0.85)
                    else:
                        dist = _levenshtein(qt, w)
                        norm = 1.0 - (dist / max(len(qt), len(w), 1))
                        if norm >= 0.65:
                            best_sim = max(best_sim, norm)
            if best_sim >= 0.65:
                score = best_sim * 55.0

        if score > 0:
            scored.append((score, item))

    scored.sort(key=lambda pair: (-pair[0], pair[1]["name"]))
    top = [MedicalConditionEntry(**pair[1]) for pair in scored[:limit]]

    return MedicalSearchResponse(
        query=q,
        count=len(top),
        total_catalog_size=len(MEDICAL_CATALOG),
        results=top,
    )


def _deterministic_classify(condition: str, preferred_category: Optional[str]) -> MedicalConditionEntry:
    low = condition.lower().strip()
    stop_words = {"allergy", "allergic", "intolerance", "sensitivity", "diet", "free", "avoid", "post", "chronic", "mild", "severe", "syndrome", "disease", "disorder", "recovery"}
    raw_words = [w for w in re.split(r"[^a-z0-9-]+", low) if len(w) >= 3 and w not in stop_words]

    is_dietary = preferred_category == "dietary" or any(
        w in low for w in ("allerg", "intoleran", "diet", "free", "vegan", "veg", "celiac", "meat", "milk", "nut", "food", "spice", "sugar", "sodium")
    )

    c_card = 0.0
    c_resp = 0.0
    c_mob = 0.0
    kit = ["Personal medical directive card"]
    advisory = "Monitor traveler symptoms closely and adjust segment pacing."
    dietary_keywords: List[str] = []

    if is_dietary:
        cat = "dietary"
        if "alpha-gal" in low or "alpha gal" in low:
            dietary_keywords = ["beef", "pork", "lamb", "mutton", "steak", "bacon", "ham", "gelatin", "lard"]
            kit = ["Epinephrine auto-injector", "Mammalian meat & gelatin alert card"]
            advisory = "Strict mammalian meat/byproduct OCR filtering active."
        else:
            dietary_keywords = raw_words[:8] or [low]
            kit = ["Translated dietary restriction card", "Emergency antihistamine / EpiPen"]
            advisory = f"Added keywords ({', '.join(dietary_keywords)}) to OCR & dining verification."
    else:
        if any(w in low for w in ("heart", "card", "angina", "bp", "pots", "tachy", "syncope", "stroke", "clot", "thromb", "arrhyth")):
            c_card = 0.55
            kit = ["Cardiovascular rescue meds", "Electrolyte ORS sachets"]
            advisory = "Avoid steep afternoon climbs; keep resting heart rate monitored."
        if any(w in low for w in ("lung", "asthma", "copd", "breath", "resp", "oxygen", "apnea", "sinus", "altitude", "pneumon")):
            c_resp = 0.55
            kit = ["Rescue inhaler / SpO2 oximeter", "Dust mask"]
            advisory = "Restrict steep elevation gains and high-dust corridors."
        if any(w in low for w in ("acl", "knee", "hip", "ankle", "foot", "spine", "back", "sciatica", "fracture", "surgery", "wheelchair", "cane", "walker", "arthr", "joint", "sprain", "limb", "mobility")):
            c_mob = 0.70
            kit = ["Joint stabilizer / elastic brace", "Portable cold pack"]
            advisory = "Prioritize step-free paved access and minimize uneven stair climbs."
        if any(w in low for w in ("vertigo", "dizzy", "migraine", "epilep", "seizure", "diabet", "insulin", "pregnan")):
            c_card = max(c_card, 0.30)
            c_mob = max(c_mob, 0.40)
            kit = ["Condition-specific rescue medication", "Shaded rest timer"]
            advisory = "Exclude exposed ledges/noonday glare; maintain timed rest & nutrition stops."

        if c_card == 0 and c_resp == 0 and c_mob == 0:
            c_mob = 0.30
            c_card = 0.25

        cat = "mobility" if c_mob >= 0.50 and c_card == 0 and c_resp == 0 else "medical"

    slug = re.sub(r"[^a-z0-9]+", "-", low).strip("-")[:32] or "custom"
    return MedicalConditionEntry(
        id=f"custom-{slug}",
        name=condition.strip(),
        category=cat,
        subcategory="Custom / Classifier",
        aliases=[],
        c_card=round(c_card, 2),
        c_resp=round(c_resp, 2),
        c_mob=round(c_mob, 2),
        dietary_keywords=dietary_keywords,
        recommended_kit_items=kit,
        route_advisory=advisory,
        source="deterministic_classifier",
    )


@router.post("/classify", response_model=MedicalConditionEntry, summary="Classify Any Custom Condition or Allergy via Gemini AI")
async def classify_custom_condition(req: MedicalClassifyRequest) -> MedicalConditionEntry:
    # 1. Exact/near-exact check against static catalog first
    q = req.condition.strip().lower()
    for item in MEDICAL_CATALOG:
        if item["name"].lower() == q or q in [a.lower() for a in item["aliases"]]:
            return MedicalConditionEntry(**item)

    # 2. Gemini classification when GEMINI_API_KEY configured
    api_key = os.getenv("GEMINI_API_KEY", "")
    if api_key:
        try:
            from google import genai  # type: ignore
            from google.genai import types as genai_types  # type: ignore

            client = genai.Client(
                api_key=api_key,
                http_options=genai_types.HttpOptions(
                    timeout=9000,
                    retry_options=genai_types.HttpRetryOptions(attempts=1),
                ),
            )
            sys_prompt = (
                "You are Prayana's Travel Medicine & Allergen Classifier. "
                "Given a user-entered medical condition, surgery, disability, or dietary allergy, "
                "return ONLY a valid JSON object with exact keys: "
                "name (string), category ('medical'|'mobility'|'dietary'), "
                "c_card (float 0.0-1.0), c_resp (float 0.0-1.0), c_mob (float 0.0-1.0), "
                "dietary_keywords (array of lowercase single/two-word menu ingredients to screen in OCR, empty [] if not food-related), "
                "recommended_kit_items (array of 1-3 short travel kit strings), "
                "route_advisory (single concise sentence)."
            )
            prompt = f"Classify: {req.condition.strip()}"
            if req.preferred_category:
                prompt += f" (User entered in {req.preferred_category} field)"

            preferred = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
            candidates = list(dict.fromkeys([
                preferred,
                "gemini-3.5-flash-lite",
                "gemini-2.5-flash",
                "gemini-2.0-flash",
            ]))
            response = None
            for mname in candidates:
                try:
                    response = client.models.generate_content(
                        model=mname,
                        contents=[prompt],
                        config=genai_types.GenerateContentConfig(
                            system_instruction=sys_prompt,
                            response_mime_type="application/json",
                            temperature=0.1,
                            max_output_tokens=320,
                        ),
                    )
                    break
                except Exception as exc:
                    print(f"[medical] Gemini model {mname} failed ({exc})", file=sys.stderr)

            if response and getattr(response, "text", None):
                parsed = json.loads(response.text.strip())
                slug = re.sub(r"[^a-z0-9]+", "-", q).strip("-")[:32] or "custom"
                return MedicalConditionEntry(
                    id=f"ai-{slug}",
                    name=str(parsed.get("name") or req.condition.strip()),
                    category=parsed.get("category") if parsed.get("category") in ("medical", "mobility", "dietary") else (req.preferred_category or "medical"),
                    subcategory="Gemini AI Classified",
                    aliases=[],
                    c_card=min(1.0, max(0.0, float(parsed.get("c_card", 0.0)))),
                    c_resp=min(1.0, max(0.0, float(parsed.get("c_resp", 0.0)))),
                    c_mob=min(1.0, max(0.0, float(parsed.get("c_mob", 0.0)))),
                    dietary_keywords=[str(k).lower() for k in parsed.get("dietary_keywords", []) if str(k).strip()],
                    recommended_kit_items=[str(k) for k in parsed.get("recommended_kit_items", []) if str(k).strip()][:3] or ["Medical alert card"],
                    route_advisory=str(parsed.get("route_advisory") or "Adjust pacing and keep required medication accessible."),
                    source="gemini_classifier",
                )
        except Exception as exc:
            print(f"[medical] Gemini classify fallback triggered: {exc}", file=sys.stderr)

    return _deterministic_classify(req.condition, req.preferred_category)
