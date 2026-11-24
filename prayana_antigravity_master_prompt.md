# PRAYANA — Antigravity End-to-End Master Build Prompt

> **How to use this in Antigravity:**
> 1. Download **Option B (Brutalist Architectural Noir)** from our chat and attach it to your new Antigravity conversation as the **visual & layout reference image**.
> 2. Paste **Prompt 1 (Master Architecture & Visual System)** first so Antigravity scaffolds the project, design tokens, and interactive 3D monument stage cleanly.
> 3. After Antigravity finishes each stage and you preview it, paste the corresponding follow-up stage prompt (Stages 2–4 below) to wire every plugin and module end-to-end.

---

## Stage 1 — Master Prompt (Copy & Paste into Antigravity with Option B Image Attached)

```text
Act as a Principal Creative Technologist, Staff Frontend Architect, and Systems Engineer.
Build **PRAYANA** — an AI-Powered Dynamic Trip Planner — end to end using my installed Antigravity plugins (`Modern Web Guidance`, `Firebase`, `Gemini API`, `Google Maps Platform`, `Google Health Developer`, and `Chrome DevTools`).

Use the attached image (**Brutalist Architectural Noir**) as the strict visual, typographic, and layout reference for the entire application.

=====================================================================
1. STRICT DESIGN SYSTEM & VISUAL IDENTITY (ZERO AI-SLOP RULE)
=====================================================================
- **Aesthetic Direction:** Brutalist Architectural Noir inspired by Stripe Press (`stripe.press`) and museum exhibition catalogues.
- **STRICT NEGATIVE CONSTRAINTS:** NO glassmorphism, NO backdrop-blur neon cards, NO glowing purple/cyan SaaS gradients, NO generic rounded bento boxes, NO cluttered dashboards.
- **Color Palette (Exact Tokens):**
  - Primary Canvas: `#0E0E0E` (Matte gallery obsidian)
  - Elevated Surface: `#151515` (Architectural charcoal)
  - Primary Ink: `#F2F0EB` (Bone white)
  - Secondary Ink: `#8A8882` (Muted warm stone)
  - Structural Grid Hairlines: `1px solid rgba(242, 240, 235, 0.12)`
  - Restrained Semantic Accents (used ONLY for live safety/status dots and alerts):
    - Nominal / Vitals OK: `#10B981`
    - Health / Weather Caution: `#D97706`
    - Severe Allergy / Hazard Alert: `#DC2626`
- **Typography:**
  - Display & Destination Titles: High-contrast editorial serif (`Instrument Serif` or `Cormorant Garamond`, tight tracking, crisp bone white for active item, `#4A4945` for inactive neighbors).
  - Body & Forms: Clean neutral grotesque (`Inter` or `Geist`).
  - HUD Rails, Brackets, Metrics & Controls: Monospace (`JetBrains Mono`), uppercase, letter-spaced (`0.08em`), bracketed syntax like `[ HR 74 BPM · STRAIN LOW ]`, `[ GROUP 4 ]`, `OPEN ITINERARY [+]`.

=====================================================================
2. SIGNATURE 3D MONUMENT STAGE & INTERACTION ARCHITECTURE
=====================================================================
Build the Home / Discovery view around the exact Stripe Press-inspired spatial layout shown in the reference image:
- **Top Hairline Monospace Rail (48px height, `border-b`):**
  - Left: `PRAYANA` wordmark (minimalist serif/mono lockup).
  - Right: Live Google Health vitals pill `[ HR 74 BPM · STRAIN LOW ]` (clickable to open live wearable telemetry drawer), active traveler switcher `[ GROUP 4 · AARAV ]`, and `PLAN TRIP [+]`.
- **Editorial Destination Carousel Header:**
  - Large horizontal serif destination marquee (`Coorg`, `Hampi`, `Kyoto`, `Varanasi`, `Goa`).
  - Active destination is centered in sharp bone white; adjacent destinations fade into muted stone. Clicking or pressing Left/Right arrow keys smoothly glides the carousel and swaps the 3D monument stage.
- **Center Stage (3-Column Hairline Structural Grid):**
  - **Center Column (Interactive 3D Monument Stage):** Built with `@react-three/fiber` + `@react-three/drei`. Renders a dramatically studio-lit, matte sculpted monochrome stone 3D architectural miniature for the active destination (e.g., Hampi Stone Chariot, Madikeri Heritage Pavilion, Kyoto Pagoda, Varanasi Ghat Temple — build clean procedural architectural geometry in Three.js with rim lighting and subtle stone roughness so it loads instantaneously with zero broken external URLs, while supporting `.glb` model drop-ins). Users can drag to rotate 360°, enjoy subtle cursor parallax, and zoom smoothly.
  - **Left & Right Columns (Interactive Destination Monolith Shelf):** Inspired by Stripe Press's 3D book spines — vertical monochrome destination/stop slabs standing edge-on in perspective. Hovering a slab smoothly slides it forward (`translateZ` / 3D rotateY spring physics via Framer Motion) revealing its terrain/vibe match tag; clicking swings it into the center stage.
- **Bottom Hairline Monospace Rail (48px height, `border-t`):**
  - Left: `[▸] HAMPI HERITAGE ROUTE — DAY 01 / 04 · 96% VIBE MATCH`
  - Right: `OPEN ITINERARY [+]`  `VITALS & HEALTH [+]`  `BUDGET & COPILOT [+]`

=====================================================================
3. MICRO-INTERACTIONS & PAGE TRANSITIONS (BEST-IN-CLASS UX)
=====================================================================
- Use **Framer Motion** (`AnimatePresence`, `layoutId`, custom spring curves `stiffness: 260, damping: 28`) across all views.
- Hairline curtain wipe transitions between major views (`GALLERY HOME`, `PROFILES`, `PLANNER WIZARD`, `ITINERARY WORKSPACE`).
- Tactile hover states: subtle horizontal text shift on monospace buttons, crisp inverted ink hover (`bg-[#F2F0EB] text-[#0E0E0E]`), magnetic pointer feedback on primary triggers, and smooth shared-element transitions when opening a destination from the 3D stage into the full Itinerary Workspace.
- Full keyboard navigation (`←` / `→` to cycle destinations on the 3D stage, `Esc` to close drawers, `Cmd/Ctrl + K` to summon the Gemini AI Copilot).

=====================================================================
4. TECHNICAL STACK & PLUGIN ARCHITECTURE
=====================================================================
- **Frontend:** Vite + React 19 + TypeScript + Tailwind CSS + Framer Motion + Three.js (`@react-three/fiber`, `@react-three/drei`) + `lucide-react`.
- **State Management:** Centralized TypeScript React Context (`PrayanaContext`) synced with **Firebase** (Auth + Firestore, with instant pre-loaded offline demo state for the 4-person Coorg/Hampi cohort so the app is immediately testable without login walls).
- **Plugins to scaffold cleanly with `.env.example` + graceful mock fallbacks:**
  1. **Google Health Developer (`Google Health API / Health Connect`)**: Wearable telemetry service fetching Heart Rate (BPM), SpO2 (%), Daily Steps, and Recovery/Strain level from connected fitbands/smartwatches, plus a clean "Live Fitband Simulator" toggle inside the Vitals Drawer for desktop testing. Live biometrics dynamically update each traveler's effort strain indicator (`LOW / MODERATE / ELEVATED`) and trigger gentle itinerary pacing warnings.
  2. **Google Maps Platform**: Custom dark monochrome-styled map view in the Itinerary Workspace + Elevation/Directions service wrapper to compute real distance, transit duration, and elevation gain (`Δh`, slope `θ`).
  3. **Gemini API**: Powers the slide-over **AI Copilot** drawer with real natural-language trip modifications returning structured JSON actions (e.g., relaxing pacing, swapping outdoor stops for indoor landmarks, finding allergy-safe dining).
  4. **Firebase**: Auth + Firestore persistence for traveler profiles, active trips, bucket list POIs, and expense logs.

=====================================================================
5. PHASED EXECUTION PLAN — START WITH STAGE 1 NOW
=====================================================================
Do NOT rush everything into one messy file. Build cleanly in 4 modular stages:
- **Stage 1 (Execute Now):** Scaffold the Vite + React + TypeScript + Tailwind project, configure the Brutalist Architectural Noir design tokens & Google Fonts (`Instrument Serif`, `Inter`, `JetBrains Mono`), build `PrayanaContext` with rich pre-loaded data (4 travelers: Aarav, Neha, Kabir, Devika; 4 destinations: Hampi, Coorg, Kyoto, Varanasi), and implement the **3D Monument Gallery Home** with the interactive Three.js 3D monument stage, the Stripe-Press-inspired vertical monolith shelf, top/bottom monospace HUD rails, and smooth Framer Motion transitions.
- Stop after Stage 1, verify in Chrome DevTools that there are zero console errors and 60fps animations, and wait for my confirmation before Stage 2.
```

---

## Stage 2 Prompt — Passenger Profiling, Google Health Fitband Sync & 3-Step Trip Wizard

*(Paste this into Antigravity after Stage 1 looks clean in your browser)*

```text
Stage 1 looks great. Now build **Stage 2** strictly following the same Brutalist Architectural Noir aesthetic (matte `#0E0E0E`, bone `#F2F0EB`, 1px hairline grids, editorial serifs + monospace HUD, zero glassmorphism):

1. **Passenger & Medical Profile Hub (`PROFILES` view + 4-Step Intake Modal):**
   - Hairline architectural grid of traveler cards displaying name, age, mobility level, medical flags, dietary/allergy tags, vibe profile, and connected wearable status.
   - 4-Step Intake Modal with crisp numbered hairline stepper:
     - Step 1: Name, Age, Mobility (`Full Mobility`, `Assisted`, `Wheelchair-Accessible`), and High-Risk Medical chips (`Asthma`, `Hypertension`, `Arthritis`, `Motion Sickness`, `Altitude Sensitivity`).
     - Step 2: Dietary & Allergy chips (`Pure Vegetarian`, `Vegan`, `Halal`, `Gluten-Free`, `Nut Allergy`, `Shellfish Allergy`) with a restrained amber/crimson advisory note when allergies are selected.
     - Step 3: Landscape preferences + Crowd Tolerance & Pacing sliders with live labels.
     - Step 4: Emergency Contact, Local Guardian, Travel Insurance Policy ID, and **Google Health Wearable Pairing**.
2. **Google Health Fitband Telemetry Drawer (`VITALS & HEALTH [+]`):**
   - Use the `Google Health Developer` plugin guidance to structure a clean Health Connect / Google Health API adapter (`src/services/googleHealthService.ts`) with OAuth config placeholders AND an interactive **Live Fitband Simulator** (Heart Rate BPM slider, SpO2 %, Steps, Ambient WBGT °C).
   - Compute each traveler's real-time effort strain score using Prayana's heuristic `ψ_ij(u_k)` incorporating `α_k`, `β_k`, `c_mob`, `c_card`, `c_resp`, slope, and live heart-rate elevation.
   - Surface contextual health advisories in the top rail and Home/Itinerary views whenever live heart rate spikes or terrain conflicts with a traveler's mobility/medical profile.
3. **3-Step Custom Trip Planner Wizard (`PLANNER WIZARD`):**
   - Step 1: Destination selector, check-in/check-out dates with auto-calculated duration, group size, total & daily per-person budget (₹), crisp monochrome segmented **4-tier budget bar** (`Stays 35%`, `Food & Dining 25%`, `Local Transit 20%`, `Activities & Buffer 20%`), and selectable nearby POIs.
   - Step 2: Multi-select traveler assignment from `userProfiles` + inline `+ Add Profile` trigger + dynamic Group Risk Warnings (e.g., motion sickness, asthma/altitude, assisted mobility).
   - Step 3: Transit mode (`Self-Drive` vs `Public Transport` with flight/train/hub fields) + external booking links (Skyscanner, Google Flights, IRCTC, MakeMyTrip) + `GENERATE ROUTE & WORKSPACE [→]` CTA.

Verify all transitions, keyboard accessibility, and zero console errors before stopping for Stage 3.
```

---

## Stage 3 Prompt — Interactive Route Workspace, Google Maps & Operations Cockpit

*(Paste this into Antigravity after Stage 2 is verified)*

```text
Now build **Stage 3**: the **Itinerary & Route Workspace (`ITINERARY_OUTPUT`)** and **Operations Cockpit** in the same Brutalist Architectural Noir design language:

1. **Dual-Mode Interactive Route Map:**
   - Toggle cleanly between:
     - **Architectural Node Graph (SVG):** Clean monochrome connected route nodes displaying inter-stop transit time, distance, and effort strain indicator. Clicking any node opens an inline architectural editor (rename, move earlier/later, pin/unpin, remove).
     - **Monochrome Google Maps View:** Using the `Google Maps Platform` plugin, embed a custom dark-monochrome Google Map plotting the active stops with polylines, elevation/slope badges, and fallback gracefully to the SVG graph if no Maps API key is configured yet.
2. **Synchronized Drag-and-Drop Daily Timeline:**
   - Right hairline column showing chronological stops, recommended visiting windows, dwell times, and pin/remove controls. Dragging rows smoothly reorders both the timeline and the route map instantaneously.
3. **Tabbed Operations Cockpit (Clean Hairline Sub-Navigation Below Map):**
   - **Tab 1 — Live Budget & Rebalancing:** Tracks actual spend across the 4 buckets (`Stays 35%`, `Food & Dining 25%`, `Local Transit 20%`, `Activities & Buffer 20%`). Includes a quick expense logger and an Overspend Alert Banner with 1-click `COMPENSATORY RE-PLAN [+]` implementing Prayana's non-negative rebalancing rule (`ω_act_buf = 0.50, ω_food = 0.30, ω_stay = 0.15, ω_transit = 0.05`) that swaps paid stops for free scenic viewpoints.
   - **Tab 2 — Smart Dining & Stays:** Displays nearby dining options strictly filtered by the group's combined dietary/allergy flags and per-meal cost-for-two caps.
   - **Tab 3 — Offline Toolkit & Menu Allergen Scanner:**
     - Destination language pack downloader (Bhashini-ready offline pack status).
     - Interactive Menu OCR Scanner (file upload + camera viewfinder demo + fuzzy Levenshtein keyword matcher `ϵ = 0.20`). **CRITICAL SAFETY RULE:** Never output `"SAFE"` or `"SAFE_PASS"`. Output either `HAZARD_ALERT` (listing matched allergens) or `NO_MATCH_DETECTED` with the mandatory disclaimer: *"No configured allergen keyword was detected in the scanned text. OCR can miss hidden ingredients, synonyms, or cross-contact — always verify with restaurant staff before eating."*
     - Two-way offline phrase/voice translator simulator.
   - **Tab 4 — Disruption Reroute, Medical Kit & Etiquette:**
     - `SIMULATE STORM / TRAFFIC DISRUPTION` toggle that swaps outdoor stops for indoor heritage landmarks and recalculates arrival times.
     - Group-customized Health & Medical Aid Kit (based on selected travelers' flags) + Regional Do's & Don'ts + Pre-departure regulatory checklist.

Verify responsive layout, drag-and-drop sync, and zero console errors before stopping for Stage 4.
```

---

## Stage 4 Prompt — Gemini AI Copilot, Bucket List, Share Hub & Firebase Persistence

*(Paste this into Antigravity after Stage 3 is verified)*

```text
Now complete **Stage 4** to finalize Prayana end to end:

1. **Gemini AI Copilot Slide-Over Drawer (`Cmd/Ctrl + K` or `BUDGET & COPILOT [+]`):**
   - Wire the `Gemini API` plugin (`src/services/geminiCopilotService.ts`) with structured function/JSON output so natural-language commands actually mutate `PrayanaContext` state live (with a clean local deterministic fallback if `VITE_GEMINI_API_KEY` is not yet set).
   - Include clickable monospace quick-command chips:
     - `[ MAKE DAY 2 MORE RELAXED ]` (increases dwell times and lowers pacing)
     - `[ SWAP OUTDOOR TREK FOR INDOOR MUSEUM ]` (triggers reroute)
     - `[ FIND ALLERGY-SAFE DINNER NEAR STOP 2 ]` (updates dining recommendations)
     - `[ ADJUST PLAN FOR ELEVATED HEART RATE ]` (reads live Google Health vitals and drops high-strain legs)
2. **Personal Bucket List Slide-Over Drawer:**
   - Displays saved/bookmarked POIs from the 3D Gallery and Discovery views with a 1-click `INSERT INTO ROUTE [+]` button that appends/re-orders the route cleanly.
3. **Trip Summary & Offline Share Hub Modal:**
   - Clean archival printable itinerary summary, generated QR code for offline sync, downloaded language pack status, live Google Health group summary, and a one-tap Emergency & Insurance Summary Card.
4. **Firebase Persistence (`Firebase` plugin):**
   - Configure `src/services/firebase.ts` (Auth + Firestore) to save/load `userProfiles`, `activeTrip`, `stops`, `expenses`, and `wishlist` per user, seamlessly falling back to `localStorage` + pre-loaded demo data when Firebase env vars are unset.
5. **Final Chrome DevTools Polish Pass:**
   - Audit with `Chrome DevTools`: verify 60fps 3D monument orbit and monolith shelf hover animations, check zero layout shift, confirm strict adherence to the `#0E0E0E` / `#F2F0EB` Brutalist Architectural Noir palette, and provide a concise `README.md` with `.env.example` setup instructions.
```
