# 🔍 Decode — Know What You Consume

**Decode** is an AI-powered ingredient analysis and product comparison platform for foods, beverages, supplements, and pharmaceuticals. It leverages multimodal computer vision (Google Gemini 3.5 Flash) and OpenFoodFacts catalog intelligence to dissect ingredient labels, calculate objective health risk scores (0–10), detect additive burdens, and recommend cleaner product swaps.

---

## 🌟 Key Capabilities

### 1. 📸 Multimodal Ingestion Engine
- **Photo & Camera OCR**: Upload packaging images or snap labels live on mobile (`capture="environment"`). Gemini 3.5 Flash natively extracts and analyzes text directly from curved bottles, boxes, and wrappers.
- **Client-Side Canvas Compression**: High-resolution mobile snapshots are automatically downsampled on the client (`maxDim: 1200px`, JPEG quality `0.85`), keeping upload payloads under 500KB for lightning-fast analysis.
- **Barcode Scanner**: Queries the OpenFoodFacts database for instant zero-token lookups, with an automatic fallback prompt to photo scanning if an unlisted or regional product is scanned.
- **Direct Text Input**: Paste raw comma-separated ingredient lists or chemical names with auto-growing textarea support.

### 2. 🔬 Deep Biochemical Breakdown & Scoring
- **0–10 Safety Index**: Aggregated score evaluating toxicity, processing degree, and carcinogenic/inflammatory risk.
- **Risk Classification**: High, Moderate, and Low concern categorization with visual badges.
- **Additive Profiling**: Uncovers origin (natural, synthetic, petroleum-derived), intended industry purpose, pros/cons, and long-term physiological exposure effects.
- **Active Counteractions**: AI-suggested dietary switches and neutralizing micronutrients (e.g. Vitamin C/antioxidants to counter synthetic preservatives).

### 3. ⚖️ Decode Versus (Product Comparison Mode)
- **Side-by-Side Comparison**: Compare **2 to 4 products** simultaneously in a dedicated comparison workspace (`/compare`).
- **Winner Determination**: AI evaluates composition purity to declare "The Winner" with a bold headline verdict and winning score.
- **Category Matrix**: Compares preservatives, gums/emulsifiers, sweeteners, and processing levels across all items.
- **Server-Side Quota Protection**: Built-in rate limiter capping comparisons to **2 comparisons per 24 hours** per user to preserve API quotas.

### 4. 📊 Cumulative Exposure & History
- **Exposure Tracker**: Tracks recurring additives across multiple scans to expose hidden compound accumulation.
- **Interactive Report Modals**: View past scan reports in full high-fidelity bento grid modals via React Portals.
- **Weekly Wellness Plan**: Aggregates exposure trends to generate personalized dietary swap recommendations.

---

## 🛠️ Architecture & Tech Stack

```text
┌────────────────────────────────────────────────────────┐
│                   Next.js 16 Client                    │
│   (React 19, Tailwind CSS v4, Motion, Phosphor Icons)  │
└───────────────┬────────────────────────┬───────────────┘
                │                        │
       [Photo / Text / Barcode]     [Auth Sessions]
                │                        │
                ▼                        ▼
┌───────────────────────────────┐ ┌──────────────────────┐
│  Next.js Server API Routes    │ │    Supabase Auth     │
│  - POST /api/scan             │ │  (Google OAuth +     │
│  - POST /api/compare          │ │   SSR Cookies)       │
│  - GET  /api/barcode          │ └──────────────────────┘
│  - GET  /api/weekly-plan      │
└───────┬───────────────┬───────┘
        │               │
        ▼               ▼
┌──────────────┐ ┌──────────────────────────────────────┐
│ Gemini 3.5   │ │ Supabase PostgreSQL (Prisma 7 ORM)   │
│ Flash Vision │ │ - User, Scan, Ingredient,            │
│ & Text AI    │ │   ExposureTracking, Comparison       │
└──────────────┘ └──────────────────────────────────────┘
```

- **Framework**: [Next.js](https://nextjs.org/) (v16 App Router)
- **UI & Styling**: [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/), [Motion](https://motion.dev/)
- **Database & ORM**: PostgreSQL hosted on [Supabase](https://supabase.com/), managed via [Prisma ORM](https://www.prisma.io/) with `@prisma/adapter-pg`
- **Authentication**: Supabase Auth with Google OAuth (`@supabase/ssr`)
- **AI Intelligence**: [Google Gemini 3.5 Flash](https://ai.google.dev/) via `@google/genai` Interactions API
- **Package Manager**: [Bun](https://bun.sh/)

---

## 🚀 Local Development Setup

### Prerequisites
- [Bun](https://bun.sh/) (`>= 1.0`)
- A [Supabase](https://supabase.com/) project (PostgreSQL + Auth)
- A [Google Gemini API Key](https://aistudio.google.com/)

### 1. Clone the Repository
```bash
git clone https://github.com/BhaveshP888/Decode.git
cd Decode
```

### 2. Install Dependencies
```bash
bun install
```

### 3. Configure Environment Variables
Create a `.env` file in the project root:

```env
# Gemini API Key
GEMINIAI_API_KEY=your_gemini_api_key_here

# Supabase Auth & Public Config
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Prisma Database Connections (IPv4 Pooler recommended)
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"

# Google OAuth (for Supabase provider config)
OAUTH_CLIENT_ID=your_google_client_id
OAUTH_CLIENT_SECRET=your_google_client_secret
```

### 4. Push Database Schema & Generate Types
```bash
bunx prisma db push
bunx prisma generate
```

### 5. Run the Local Development Server
```bash
bun run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 💻 Available Scripts

| Command | Description |
|---|---|
| `bun run dev` | Starts Next.js development server with hot-reload |
| `bun run build` | Compiles optimized static & dynamic production build |
| `bun run start` | Runs the production Next.js server |
| `bun run lint` | Runs ESLint validation across the entire codebase |
| `bunx prisma db push` | Synchronizes `schema.prisma` definitions with the live database |
| `bunx prisma studio` | Launches visual web database browser |

---

## 📂 Project Structure

```text
├── app/
│   ├── api/
│   │   ├── barcode/         # OpenFoodFacts barcode lookup endpoint
│   │   ├── compare/         # Multi-product comparison & rate limiter endpoint
│   │   ├── scan/            # Multimodal photo & text Gemini scanning API
│   │   └── weekly-plan/     # AI weekly dietary swap recommendation API
│   ├── auth/callback/       # Supabase OAuth PKCE exchange handler
│   ├── compare/             # Decode Versus side-by-side comparison page
│   ├── history/             # Cumulative exposure profile & scan history
│   ├── landing/             # Public landing & product showcase page
│   ├── login/               # Authentication entry point
│   ├── plan/                # Personalized weekly wellness counter-plan
│   ├── layout.tsx           # Root HTML shell & Outfit font configuration
│   └── page.tsx             # Authenticated dashboard entry point
├── components/
│   ├── dashboard.tsx        # Ingestion panel (Text, Camera/Photo, Barcode) & Bento results
│   ├── history-client.tsx   # Client-side exposure chart & report modal portal
│   ├── navbar.tsx           # Global authenticated navigation bar
│   └── ui/                  # Reusable accessible UI primitives
├── lib/
│   ├── ai.ts                # Google Gemini SDK client instance
│   ├── db/index.ts          # Prisma Postgres adapter connection pool
│   └── supabase/            # Supabase SSR browser & server client helpers
├── prisma/
│   └── schema.prisma        # Prisma data models & relational schema
└── public/                  # Static assets & brand graphics
```

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for details.
