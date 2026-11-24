# PRAYANA — AI-Powered Architectural Travel Operating System

> **Academic Foundation:** Dayananda Sagar University, Department of Computer Science & Engineering, Major Project Phase-I Report (Batch 2026–2027) by *Nishchal Gowda R (ENG23CS0126), Preetham H S (ENG23CS0144), S Shreenidhi (ENG23CS0169), G Nithesh (ENG23CS0066)* under the supervision of *Dr. Savitha Hiremath*.
>
> **Design Philosophy:** **Brutalist Architectural Noir** inspired by Stripe Press (`stripe.press`), Braun optical apparatuses, and museum archival catalogues.
> **Negative Constraints:** Zero glassmorphism, zero neon purple/cyan gradients, zero generic rounded bento boxes, zero cluttered SaaS dashboards.

---

## 🏛️ System Architecture & Capability Matrix

### 0. Authentication Gate & Interactive Mechanical Grid (`AUTH` View)
- **Cursor-Driven Mechanical Drafting Grid (`MechanicalGrid.tsx`):**
  - Full-screen, GPU-accelerated 60fps `<canvas>` rendered at `window.devicePixelRatio` sharpness.
  - $48\text{px} \times 48\text{px}$ hairline coordinate grid on `#0E0E0E`.
  - Magnetic nodal intersection points mechanically rotate up to $45^\circ$, align to cursor azimuth, scale up, and brighten from `rgba(242,240,235,0.12)` to crisp `#F2F0EB` within a $220\text{px}$ radius.
  - Live drafting coordinate reticle with dashed hairline crosshairs and real-time badge: `[ X: 0412 · Y: 0289 ]`.
  - **Zero Performance Lag:** Pure `requestAnimationFrame` render loop with mutable pointer refs (zero React re-renders on mousemove).
- **Architectural Auth Panel (`AuthScreen.tsx`):**
  - Unrounded $1\text{px}$ hairline card (`#121212`) floating above the mechanical grid.
  - Prayana compass medallion with status indicator: `<span class="bg-emerald-400"></span> [ AUTH_READY ]`.
  - Smooth Framer Motion tab switcher (`SIGN IN` ↔ `CREATE ACCOUNT`) with sliding underline `layoutId="authTabIndicator"`.
  - Firebase Auth integration with Email/Password sign-in, account creation with baseline mobility selector (`Full Mobility / Assisted / Wheelchair`), Google Sign-In, and instant `[ DEMO BYPASS: ENTER AS COORG COHORT → ]`.
  - Monospace error and loading badges with seamless offline mock fallback.

### 1. 3D Architectural Stage & Explore View (`EXPLORE` View)
- **Liquid Silver Chrome & Machined Steel 3D Monuments (`@react-three/fiber`):**
  - **Hampi:** Vitthala Stone Chariot with stepped plinth adhisthana, carved wheels, mandapa sanctum, and kalasha finial.
  - **Coorg:** Raja's Seat arched stone pavilion & royal gazebo.
  - **Kyoto:** Five-story timber pagoda with flared eave roofs and brass sorin spire.
  - **Varanasi:** Kashi Ghat temple pavilion with curvilinear shikhara and riverfront stone steps.
- **Physical Shading & Studio Lighting:**
  - `meshPhysicalMaterial` with `metalness: 1.0`, `roughness: 0.09`, `clearcoat: 1.0`, and HDR Lightformer environment strips creating razor-sharp specular streaks.
  - Upward sweeping wireframe scan grid ring on assembly with damped spring overshoot.
  - Soft dark circular studio pedestal and ground contact shadows.
- **Preloader & Smooth 60fps Reveal:**
  - Full-screen opaque `#0E0E0E` overlay (`z-[100]`) with rotating compass rose and medallion.
  - Three.js scene pre-warms silently behind the curtain from $t = 0$.
  - Continuous `requestAnimationFrame` progress bar using GPU `transform: scaleX` (zero layout reflows) and single-layer upward GPU curtain wipe (`y: "0%" → "-100%"`).
- **Stripe Press-Inspired Vertical Monolith Shelves:** Left & right racks of vertical slabs/book spines in perspective. Hovering springs slabs forward revealing elevation $\Delta h$, slope $\theta$, dwell times, and vibe tags.

### 2. Passenger Profiling & Wearable Telemetry (`PROFILES` View)
- **Passenger & Medical Profile Hub:**
  - Hairline architectural grid of traveler cards displaying biometrics, mobility level, medical flags, dietary/allergy tags, and wearable sync status.
- **Google Health API Telemetry Adapter (`src/services/googleHealthService.ts`):**
  - Evaluates Prayana's mathematical heuristic segment penalty (Chapter 4, Eq 4.1 & 4.2):
    $$\psi_{ij}(u_k) = \alpha_k \cdot (1 + \beta_k) \cdot d_{ij} \cdot \exp\left( \gamma_1 (1 + c_k^{\text{mob}}) \max(0, \tan \theta_{ij}) + \gamma_2 c_k^{\text{card}} \left(\frac{\Delta h_{ij}^+}{100}\right) + \gamma_3 c_k^{\text{resp}} \Phi(W_{ij}) \right)$$
  - **Live Wearable Telemetry Simulator:** Heart Rate (55–165 BPM), SpO2 (85–100%), Ambient WBGT (20–40°C), and automated strain classification (`LOW`, `MODERATE`, `ELEVATED`).
- **4-Step Traveler Intake Modal:** Biometrics, dietary/allergy flags, landscape/pacing preferences, and emergency insurance policy credentials.

### 3. Route Workspace & Operations Cockpit (`ITINERARY` View)
- **Dual-Mode Interactive Route Map:**
  - **Architectural Node Graph (SVG):** Connected monochrome route nodes displaying inter-stop transit time, distance, and effort strain indicator with inline node management.
  - **Monochrome Google Maps View:** Custom dark-styled map with transit polyline and elevation badges.
- **Synchronized Drag-and-Drop Daily Timeline:** Reorderable timeline cards that instantaneously sync with the route map.
- **Tabbed Operations Cockpit:**
  - **Tab 1 (Live Budget & Rebalancing):** 4-tier expense logger (`Stays 35%`, `Food 25%`, `Transit 20%`, `Buffer 20%`), overspend detection, and 1-click compensatory rebalancing implementing:
    $$\Delta B_c = \text{Overspend} \times \omega_c \quad (\omega_{\text{act\_buf}} = 0.50, \omega_{\text{food}} = 0.30, \omega_{\text{stay}} = 0.15, \omega_{\text{transit}} = 0.05)$$
  - **Tab 2 (Smart Dining & Stays):** Allergen safety filters (*Shellfish & Nut allergies*) and cost caps.
  - **Tab 3 (Offline Toolkit & Menu Allergen Scanner):** Bhashini offline language pack downloader, camera viewfinder simulator, local OCR fuzzy Levenshtein distance matcher ($\epsilon = 0.20$), and strict safety disclaimers.
  - **Tab 4 (Disruption Reroute & Medical Kit):** Weather disruption simulation swapping outdoor trails for covered heritage halls, customized medical kit, and ASI heritage rules.

### 4. Gemini Copilot, Bucket List & Archival Dispatch
- **Gemini AI Trip Copilot (`Cmd/Ctrl + K`):** Structured JSON actions mutating route state live (dwell time extension, indoor reroute, allergen-safe dining selection, dropping high-strain legs) with local deterministic fallback.
- **Personal Bucket List Drawer:** Saved POIs with 1-click `INSERT INTO ROUTE [+]`.
- **Trip Summary & Offline Share Hub (`DISPATCH`):** Archival printable summary (`window.print()`), generated offline sync QR code, language pack status, and emergency insurance card.
- **Firebase Persistence (`src/services/firebase.ts`):** Auth & Firestore cloud sync with offline `localStorage` fallback.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Core Framework** | React 18, TypeScript 5.6, Vite 5.4 |
| **3D Rendering & Shaders** | Three.js, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing` |
| **Animation & Gestures** | Framer Motion 11 |
| **Styling & Design Tokens** | Tailwind CSS 3.4, Custom CSS Architecture |
| **Cloud & Persistence** | Firebase 13 (Auth + Cloud Firestore), `localStorage` Offline Sync |
| **Health & Telemetry** | Google Health API Adapter, Android Health Connect BLE Simulator |
| **AI & Copilot** | Google Gemini API with structured JSON function calling |
| **Typography** | `Instrument Serif`, `Cormorant Garamond`, `Inter`, `JetBrains Mono` |
| **Icons & QR** | `lucide-react`, `qrcode.react` |

---

## 🚀 Getting Started

### Prerequisites
- Node.js `v18+` or `v20+` or `v24+`
- npm `v9+` or `v10+` or `v11+`

### Installation

```bash
# Clone the repository
git clone https://github.com/nishchalr/Prayana-AI-Trip-Planner.git
cd Prayana-AI-Trip-Planner

# Install dependencies
npm install

# Start local development server
npm run dev
```

Open [http://localhost:5173/](http://localhost:5173/) in your browser.

### Building for Production

```bash
npm run build
npm run preview
```

---

## ⚙️ Environment Variables (`.env`)

Create a `.env` file in the root directory (refer to `.env.example`):

```ini
# Google Gemini API Key (optional: deterministic local fallback is active by default)
VITE_GEMINI_API_KEY=

# Google Maps Platform API Key (optional: styled SVG node graph fallback is active by default)
VITE_GOOGLE_MAPS_API_KEY=

# Firebase Configuration (optional: offline localStorage fallback is active by default)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

---

## ⌨️ Keyboard Shortcuts & Navigation

| Shortcut | Action |
|---|---|
| `Cmd + K` / `Ctrl + K` | Open Gemini AI Trip Copilot |
| `←` / `→` | Cycle destinations on the 3D Discovery stage |
| `Escape` | Close active drawers, modals, and menus |
| `Click anywhere` | Skip initial boot sequence preloader |

---

## 👥 Authors & Academic Credits

- **Nishchal Gowda R** ([@nishchalr](https://github.com/nishchalr)) — *ENG23CS0126*
- **Preetham H S** — *ENG23CS0144*
- **S Shreenidhi** — *ENG23CS0169*
- **G Nithesh** — *ENG23CS0066*

**Supervisor:** Dr. Savitha Hiremath  
**Department:** Computer Science & Engineering, Dayananda Sagar University (DSU), Bengaluru  
**Batch:** 2026–2027

---

## 📄 License

Academic research prototype developed for educational and experimental evaluation under the MIT License.
