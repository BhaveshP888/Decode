<div align="center">

# 🔍 Decode

**Know What You Consume — AI-Powered Ingredient Intelligence & Product Comparison**

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-20232A?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-3.5_Flash-4285F4?style=flat-square&logo=google)](https://deepmind.google/technologies/gemini/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_%26_Auth-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![Prisma](https://img.shields.io/badge/Prisma-7.0-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![Bun](https://img.shields.io/badge/Bun-Package_Manager-fbf0df?style=flat-square&logo=bun&logoColor=black)](https://bun.sh/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

[**Explore Live Demo →**](https://decode-dusky.vercel.app/)

</div>

---

## 📖 Overview

**Decode** is an intelligent, privacy-first consumer health platform that demystifies packaging labels on food, beverages, cosmetics, and pharmaceuticals. Powered by **Google Gemini 3.5 Flash** multimodal vision and the **OpenFoodFacts** global catalog, Decode instantly transforms convoluted chemical lists, synthetic additives, and E-numbers into objective safety scores, physiological impact analyses, and actionable dietary swaps.

---

## ✨ Key Features

### 📸 Multimodal Ingestion Engine
* **Live Camera & Photo Scan**: Snap packaging labels directly on mobile (`capture="environment"`) or upload high-resolution photos. Gemini 3.5 Flash natively extracts text from curved bottles, wrinkled foil, and reflective boxes without third-party OCR pipelines.
* **Client-Side Canvas Compression**: High-resolution snapshots are downsampled in-browser (`maxDim: 1200px`, JPEG quality `0.85`), keeping payloads under 500KB for near-instant analysis.
* **Barcode Lookup with Fallback**: Queries OpenFoodFacts for instant product retrieval. If an unlisted or regional product barcode is scanned, Decode prompts a 1-click fallback to camera photo scanning.
* **Manual & Bulk Text Parsing**: Direct copy-paste input with auto-growing textarea and character bounds enforcement.

### 🔬 Biochemical Breakdown & Health Scoring
* **Objective Safety Index (0–10)**: Calculated score measuring additive density, ultra-processing level, and long-term inflammatory or carcinogenic risks.
* **Granular Risk Tiers**: Categorizes individual ingredients into **High**, **Moderate**, and **Low** risk with explanatory badges.
* **Additive Profiling**: Identifies source origin (*natural*, *synthetic*, *petroleum-derived*), industrial function (*preservative*, *sweetener*, *emulsifier*), and documented physiological side-effects.
* **Active Counteractions**: Suggests specific neutralizing micronutrients and whole-food habits (e.g., Vitamin C/antioxidants to counter synthetic nitrates/benzoates).

### ⚖️ Decode Versus (Product Comparison Workspace)
* **Side-by-Side Analysis**: Compare **2 to 4 products** concurrently (`/compare`) to choose the cleanest option on the grocery shelf.
* **Winner Determination**: Evaluates additive burden and nutritional integrity to highlight "The Winner" with a bold verdict summary.
* **Trade-Off Matrix**: Side-by-side scorecard comparing preservatives, gums, sweeteners, and processing intensity across all items.
* **Rate-Limited Quota Protection**: TOCTOU-safe atomic transaction limiting comparisons to **2 per 24 hours** per user to prevent API quota exhaustion.
* **Quick Presets**: Instant one-click presets (e.g., *Oat Milk vs Almond Milk*, *Coke Zero vs Diet Coke*).

### 📊 Exposure Tracking & Historical Intelligence
* **Cumulative Exposure Profile**: Aggregates repeated consumption of specific additives across all personal scans to expose hidden chemical accumulation.
* **High-Fidelity Report Modals**: Revisit past scans via React Portals with interactive bento-grid breakdowns.
* **AI Weekly Wellness Plan**: Generates actionable dietary counter-plans and healthy product swaps based on cumulative 7-day exposure trends.

---

## 🛡️ Security & Defensive Engineering

Decode implements defense-in-depth principles across its full stack:

* **Prompt-Injection Mitigation**: All untrusted user inputs and packaging texts are isolated within structured XML delimiters (`<user_ingredients>`, `<product>`) with strict system prompt boundaries.
* **Runtime Schema Validation**: 100% of LLM responses are validated at runtime via **Zod** (`ScanResultSchema.safeParse`, `ComparisonResultSchema.safeParse`) before persisting to storage or returning to the client.
* **Database Poisoning Defense**: User scans cannot overwrite trusted canonical ingredient definitions in the global dictionary; existing records only increment usage metrics (`hitCount`).
* **Authenticated Endpoints**: All model invocation routes (`/api/scan`, `/api/compare`, `/api/weekly-plan`) enforce strict session verification upfront.
* **Constant-Time Cron Security**: Keepalive cron endpoints fail closed, require `Bearer` token headers, and validate authentication using `crypto.timingSafeEqual`.
* **Strict HTTP Security Headers**: Hardened with `Content-Security-Policy` (CSP), `Strict-Transport-Security` (HSTS), `Permissions-Policy` (`camera=(self)`), and `X-Content-Type-Options: nosniff`.
* **Open Redirect Immunity**: OAuth callback paths strictly enforce safe relative destination validation.

---

## 🛠️ Architecture & System Design

```text
┌────────────────────────────────────────────────────────────────────────┐
│                          Next.js 16 Client                             │
│     (React 19, Tailwind CSS v4, Motion, Phosphor Icons, Lucide)        │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
           [Multimodal Ingestion]             [OAuth Session]
        (Photo, Text, Barcode)                       │
                    │                                ▼
                    ▼                    ┌───────────────────────┐
┌──────────────────────────────────────┐ │     Supabase Auth     │
│       Next.js Server API Layer       │ │  (Google OAuth +      │
│  - POST /api/scan                    │ │   SSR Cookie Store)   │
│  - POST /api/compare                 │ └───────────────────────┘
│  - GET  /api/barcode                 │
│  - GET  /api/weekly-plan             │
│  - GET  /api/cron/keepalive          │
└───────┬──────────────────────┬───────┘
        │                      │
        ▼                      ▼
┌──────────────────┐  ┌──────────────────────────────────────────────┐
│ Google Gemini    │  │ Supabase PostgreSQL (Prisma 7 ORM)           │
│ 3.5 Flash Vision │  │ - User, Scan, Ingredient,                    │
│ & Text Models    │  │   ExposureTracking, Comparison               │
└──────────────────┘  └──────────────────────────────────────────────┘
```

---

## 🧰 Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router, Server Actions, Route Handlers) |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) (Strict Mode) |
| **Runtime & Package Manager** | [Bun](https://bun.sh/) |
| **Styling & Animation** | [Tailwind CSS v4](https://tailwindcss.com/), [Motion](https://motion.dev/) |
| **Database & ORM** | [PostgreSQL](https://www.postgresql.org/) on [Supabase](https://supabase.com/), [Prisma ORM 7](https://www.prisma.io/) with `@prisma/adapter-pg` |
| **Authentication** | [Supabase Auth](https://supabase.com/docs/guides/auth) (`@supabase/ssr` PKCE exchange) |
| **AI & Multimodal Vision** | [Google Gemini 3.5 Flash](https://deepmind.google/technologies/gemini/) via `@google/genai` Interactions API |
| **Catalog API** | [OpenFoodFacts API](https://world.openfoodfacts.org/) |
| **Validation** | [Zod 3](https://zod.dev/) |
| **Icons** | [Phosphor Icons](https://phosphoricons.com/), [Lucide React](https://lucide.dev/) |

---

## 🚀 Getting Started

### Prerequisites

* [Bun](https://bun.sh/) (`>= 1.0.0`)
* A [Supabase](https://supabase.com/) project with PostgreSQL and Google Auth enabled
* A [Google Gemini API Key](https://aistudio.google.com/)

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

Copy the provided template and supply your credentials:

```bash
cp .env.example .env
```

Fill in the required keys in `.env`:

```env
# Google Gemini API
GEMINIAI_API_KEY=your_gemini_api_key_here

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# PostgreSQL Database Connections (IPv4 Pooler recommended)
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"

# Google OAuth (configured in Supabase Dashboard)
OAUTH_CLIENT_ID=your_google_client_id
OAUTH_CLIENT_SECRET=your_google_client_secret

# Vercel Cron Secret (for securing keepalive endpoints)
CRON_SECRET=your_secure_random_string_here
```

### 4. Database Setup

Synchronize your Prisma schema with the Supabase database:

```bash
# Push schema to live database
bunx prisma db push

# Generate Prisma client artifacts
bunx prisma generate
```

### 5. Launch the Development Server

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📜 Available Scripts

| Script | Command | Purpose |
| :--- | :--- | :--- |
| `dev` | `bun run dev` | Starts local Next.js development server with hot-module reloading |
| `build` | `bun run build` | Compiles optimized production bundle and runs static analysis |
| `start` | `bun run start` | Runs production server |
| `lint` | `bun run lint` | Runs ESLint across the codebase |
| `db:push` | `bunx prisma db push` | Pushes Prisma schema updates directly to PostgreSQL |
| `db:studio` | `bunx prisma studio` | Opens visual web interface to browse and query database tables |

---

## 📂 Project Structure

```text
Decode/
├── .github/
│   └── workflows/
│       ├── ci.yml               # CI build verification & lint checks
│       └── keepalive.yml        # Redundant cron runner preventing DB pause
├── app/
│   ├── api/
│   │   ├── barcode/             # OpenFoodFacts catalog lookup
│   │   ├── compare/             # Side-by-side product comparison API
│   │   ├── cron/keepalive/      # Automated Supabase compute keepalive
│   │   ├── scan/                # Multimodal Gemini label analysis API
│   │   └── weekly-plan/         # AI dietary swap counter-plan API
│   ├── auth/callback/           # OAuth PKCE exchange & redirect handler
│   ├── compare/                 # Product comparison workspace page
│   ├── history/                 # Cumulative exposure analytics page
│   ├── landing/                 # Public landing & feature showcase page
│   ├── login/                   # Authentication entry point
│   ├── plan/                    # Weekly wellness recommendations page
│   ├── layout.tsx               # Root layout & font configuration
│   ├── loading.tsx              # Root route loading skeleton
│   └── page.tsx                 # Authenticated dashboard entry point
├── components/
│   ├── ui/                      # Accessible UI component primitives
│   ├── dashboard.tsx            # Multi-mode ingestion panel & bento results
│   ├── history-client.tsx       # Exposure analytics & modal portal
│   └── navbar.tsx               # Global navigation with prefetching
├── lib/
│   ├── db/                      # Prisma client instance & PG pool adapter
│   ├── supabase/                # SSR client, browser client, & proxy helpers
│   ├── ai.ts                    # Google GenAI SDK configuration
│   ├── schemas.ts               # Zod validation schemas for all AI outputs
│   └── utils.ts                 # Classname utility helpers
├── prisma/
│   └── schema.prisma            # Database schema & entity relationships
├── public/                      # Static brand assets & icons
├── .env.example                 # Sanitized environment variable template
├── next.config.ts               # Security headers, CSP, & Next.js config
└── vercel.json                  # Automated Vercel daily cron configuration
```

---

## ⏰ Supabase Automated Keepalive

On Supabase's free tier, projects are paused after 7 days of inactivity. Decode includes a built-in, zero-maintenance keep-alive architecture:

1. **Vercel Cron (`vercel.json`)**: Executes `GET /api/cron/keepalive` daily at 05:00 UTC.
2. **GitHub Actions (`.github/workflows/keepalive.yml`)**: Secondary backup runner pinging the endpoint every 2 days.
3. **Database Reset Query**: Touches PostgreSQL via `SELECT 1` and queries the REST API, keeping the project continuously active.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork the Repository**
2. **Create a Feature Branch**: `git checkout -b feature/your-feature-name`
3. **Commit Your Changes**: Follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`)
4. **Verify Standards**: Ensure `bun run lint` and `bun run build` pass with zero errors
5. **Open a Pull Request**

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
