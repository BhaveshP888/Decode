# 🔍 Decode — Personal Health Intelligence & Ingredient Analyzer

**Decode** is a v2 AI-powered ingredient intelligence, product comparison, and personalized health advisory platform for foods, beverages, supplements, and pharmaceuticals. Built on the **Vercel AI SDK** (`ai`, `@ai-sdk/google`, `@ai-sdk/react`), **Google Gemini 2.5 Flash**, **Supabase PostgreSQL with `pgvector`**, and **OpenFoodFacts**, Decode dissects labels, enforces allergen safety visual precedence, attaches regulatory toxicology citations, recommends allergen-safe cleaner swaps, and powers the guardrailed **Health Guru** advisor.

---

## 🌟 Key Capabilities

### 1. 📸 Multimodal Ingestion Engine
- **Photo & Camera OCR**: Upload packaging images or snap labels live on mobile (`capture="environment"`). Gemini 2.5 Flash extracts and evaluates ingredients via structured Zod-validated `generateObject` schemas.
- **Client-Side Canvas Compression**: High-resolution mobile snapshots are automatically downsampled on the client (`maxDim: 1200px`, JPEG quality `0.85`), keeping upload payloads under 500KB for fast analysis.
- **Barcode Scanner**: Queries the OpenFoodFacts database for instant zero-token lookups, with an automatic fallback prompt to photo scanning if an unlisted or regional product is scanned.
- **Direct Text Input**: Paste raw comma-separated ingredient lists or chemical names with auto-growing textarea support.

### 2. 🚨 Allergen Safety Visual Precedence & Household Profiles
- **Strict Visual Precedence (`BentoScanHeader`)**: Objective biochemical purity scores (0–10) never mask personal allergy danger. Whenever a scan conflicts with a user's saved allergens (`allergenAlert.hasConflict`), Decode renders a full-width, high-contrast **ALLERGEN CONFLICT** danger banner (`role="alert"`) listing every conflicting ingredient and demotes the objective purity score pill.
- **Household Profiles (`/profile` & `HouseholdStatusBar`)**: Manage personal and household member profiles (`UserProfile` and `HouseholdMember`) tracking normalized allergens, dietary regimes (e.g. vegan, gluten-free, keto, clean-label), and health conditions. Every scan evaluates compatibility across household members, surfacing `safe`, `caution`, and `danger` status chips.
- **0ms Relational Toxicology Citations**: Ingredients matched by canonical name or chemical/E-number alias automatically attach authoritative regulatory monographs (EFSA, FDA, USDA) from `ToxicologyMonograph` via relational Prisma joins.

### 3. 🧠 Health Guru & Two-Tier Domain Guardrails
- **Contextual Drawer & Dedicated Workspace**: Ask follow-up questions directly from a scan report via the slide-over `GuruChatDrawer` (pre-populated with active product context and allergen conflicts) or browse persistent chat sessions on `/guru`.
- **Dynamic Multi-Step Tool Calling**: Powered by Vercel AI SDK `streamText` with `stopWhen: isStepCount(3)`, Health Guru dynamically invokes four scoped tools:
  - `getUserScanHistory`: Reviews the authenticated user's recent scans and scores.
  - `searchIngredientToxicology`: Runs `pgvector` semantic cosine similarity search against `ToxicologyMonograph` embeddings (`text-embedding-004`, 768 dims).
  - `findCleanSwaps`: Queries `ProductEmbedding` vectors filtered relationally to `purityScore >= 8.5` while strictly excluding the user's allergens.
  - `checkPersonalCompatibility`: Cross-references candidate ingredients against the user's saved allergen profile.
- **Educational Pharmaceutical Guidance (`EducationalInteractionCard`)**: Explains biochemical drug mechanisms, inactive pill excipients, and food-drug interactions (e.g., grapefruit CYP3A4 inhibition with statins) inside a structured educational card carrying a mandatory medical advisory disclaimer. Health Guru never prescribes, alters dosages, or diagnoses clinical diseases.
- **Two-Tier Domain Guardrails**:
  - **Tier 1 — Fast Intent Gatekeeper (`lib/guardrails/intent.ts`)**: Deterministic regex screening runs before model invocation (`<50ms`), blocking off-topic requests (programming, math, general trivia) with an immediate AI SDK UIMessage stream refusal while permitting medical/health terminology (including edge cases like "stomach bug" or chemical E-numbers).
  - **Tier 2 — Pinned System Prompt & Sliding Context Window (`lib/guru.ts`)**: `buildSanitizedMessages` pins `GURU_SYSTEM_INSTRUCTION` at index 0 and retains a sliding 6-turn window, enforcing strict health-only scope and mandatory physician/pharmacist disclaimers.

### 4. ⚖️ Decode Versus (Product Comparison Mode)
- **Side-by-Side Comparison**: Compare **2 to 4 products** simultaneously in `/compare` using structured `generateObject` analysis (`ComparisonResultSchema`).
- **Winner Determination & Category Matrix**: Evaluates preservatives, emulsifiers, sweeteners, and processing levels to declare "The Winner" with a detailed trade-off summary.
- **Atomic Server-Side Quota Protection**: Transactional TOCTOU reservation limits comparisons to **2 comparisons per 24 hours** per user.

### 5. 📊 Cumulative Exposure & Weekly Wellness Plan
- **Exposure Tracker (`/history`)**: Tracks recurring additives across scans to uncover cumulative exposure trends and displays historical reports in interactive modals.
- **Weekly Counter-Plan (`/plan`)**: Aggregates top exposures via `/api/weekly-plan` (`generateObject` + `WeeklyPlanSchema`) to recommend targeted neutralizing nutrients and practical food swaps.

---

## 🛠️ Architecture & Tech Stack

```text
┌──────────────────────────────────────────────────────────┐
│                     Next.js 16 Client                    │
│  (React 19, Tailwind CSS v4, Motion, @ai-sdk/react)      │
│  BentoScanHeader · HouseholdStatusBar · GuruChatDrawer   │
└────────────────┬─────────────────────────┬───────────────┘
                 │                         │
   [Scan / Compare / Guru / Profile]  [Auth Sessions]
                 │                         │
                 ▼                         ▼
┌─────────────────────────────────┐ ┌──────────────────────┐
│   Next.js Server API Routes     │ │    Supabase Auth     │
│  - POST /api/scan               │ │  (Google OAuth +     │
│  - GET/POST /api/chat/guru      │ │   SSR Cookies)       │
│  - GET/PUT  /api/profile        │ └──────────────────────┘
│  - GET/POST /api/compare        │
│  - GET      /api/weekly-plan    │
│  - GET      /api/barcode        │
└────────┬────────────────┬───────┘
         │                │
         ▼                ▼
┌───────────────────┐ ┌──────────────────────────────────────────┐
│  Vercel AI SDK    │ │ Supabase PostgreSQL + pgvector (Prisma 7)│
│  (@ai-sdk/google) │ │ - User, UserProfile, HouseholdMember     │
│  - gemini-2.5-    │ │ - Scan, Ingredient, ExposureTracking     │
│    flash (chat)   │ │ - Comparison, ChatSession, ChatMessage   │
│  - text-embedding │ │ - ProductEmbedding, ToxicologyMonograph  │
│    -004 (vectors) │ │   (768-dim vector columns)               │
└───────────────────┘ └──────────────────────────────────────────┘
```

- **Framework**: [Next.js](https://nextjs.org/) (v16 App Router + Turbopack)
- **UI & Styling**: [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/), [Motion](https://motion.dev/), [Base UI](https://base-ui.com/), [Phosphor Icons](https://phosphoricons.com/)
- **AI Orchestration**: [Vercel AI SDK](https://sdk.vercel.ai/) (`ai`, `@ai-sdk/google`, `@ai-sdk/react`) with Google `gemini-2.5-flash` and `text-embedding-004`
- **Database & Vector Search**: PostgreSQL with `pgvector` hosted on [Supabase](https://supabase.com/), managed via [Prisma 7 ORM](https://www.prisma.io/) with `@prisma/adapter-pg`
- **Authentication**: Supabase Auth with Google OAuth (`@supabase/ssr`)
- **Validation**: [Zod v4](https://zod.dev/)
- **Runtime, Package Manager & Test Runner**: [Bun](https://bun.sh/) (`bun test`)

---

## 🚀 Local Development Setup

### Prerequisites
- [Bun](https://bun.sh/) (`>= 1.0`)
- A [Supabase](https://supabase.com/) project (PostgreSQL with `pgvector` support + Auth)
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
# Vercel AI SDK Google Provider Key (preferred)
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key_here
# Legacy fallback supported automatically by lib/ai.ts if GOOGLE_GENERATIVE_AI_API_KEY is unset
# GEMINIAI_API_KEY=your_gemini_api_key_here

# Supabase Auth & Public Config
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Prisma Database Connections (IPv4 Pooler recommended for runtime, Direct URL for migrations)
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"

# Google OAuth (for Supabase provider config)
OAUTH_CLIENT_ID=your_google_client_id
OAUTH_CLIENT_SECRET=your_google_client_secret

# Keepalive Cron Authentication
CRON_SECRET=your_random_secret_here
```

### 4. Enable `pgvector`, Sync Database Schema & Generate Prisma Client
Decode stores 768-dimensional embeddings (`Unsupported("vector(768)")`) in `ProductEmbedding` and `ToxicologyMonograph`. Enable the `pgvector` extension before pushing or migrating the schema:

1. Apply the initial `pgvector` migration (`prisma/migrations/0_enable_pgvector/migration.sql`), which runs `CREATE EXTENSION IF NOT EXISTS vector;`:
   ```bash
   bunx prisma migrate deploy
   ```
   *(Alternatively, enable the `vector` extension directly in the Supabase SQL Editor or Database → Extensions dashboard.)*

2. Push the Prisma schema and regenerate the Prisma Client types:
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
| `bun test` | Runs all unit, integration, and component tests via Bun test runner |
| `bunx tsc --noEmit` | Runs strict TypeScript type-checking across the codebase |
| `bun run lint` | Runs ESLint validation across the entire codebase |
| `bunx prisma migrate deploy` | Applies pending SQL migrations (including `0_enable_pgvector`) |
| `bunx prisma db push` | Synchronizes `prisma/schema.prisma` definitions with the live database |
| `bunx prisma generate` | Generates typed Prisma Client artifacts |
| `bunx prisma studio` | Launches visual web database browser |

---

## 📂 Project Structure

```text
├── app/
│   ├── api/
│   │   ├── barcode/         # OpenFoodFacts barcode lookup endpoint
│   │   ├── chat/guru/       # Streaming Health Guru endpoint (guardrails + 4 dynamic tools)
│   │   ├── compare/         # Multi-product comparison & atomic daily quota limiter
│   │   ├── cron/keepalive/  # Authenticated Supabase compute keepalive endpoint
│   │   ├── profile/         # Authenticated UserProfile retrieval & upsert endpoint
│   │   ├── scan/            # Multimodal photo & text scanning with allergen & citation enrichment
│   │   └── weekly-plan/     # AI weekly dietary counter-plan endpoint
│   ├── auth/callback/       # Supabase OAuth PKCE exchange handler
│   ├── compare/             # Decode Versus side-by-side comparison workspace
│   ├── guru/                # Standalone Health Guru chat & session history page
│   ├── history/             # Cumulative exposure profile & scan history
│   ├── landing/             # Public landing & product showcase page
│   ├── login/               # Authentication entry point
│   ├── plan/                # Personalized weekly wellness counter-plan
│   ├── profile/             # Personal allergens, dietary regimes & health conditions settings
│   ├── layout.tsx           # Root HTML shell & font configuration
│   └── page.tsx             # Authenticated dashboard entry point
├── components/
│   ├── bento-scan-header.tsx    # Allergen visual-precedence danger banner & purity score header
│   ├── dashboard.tsx            # Ingestion panel (Text, Camera/Photo, Barcode) & Bento results
│   ├── guru-chat-drawer.tsx     # Slide-over Health Guru drawer, tool badges & interaction cards
│   ├── history-client.tsx       # Client-side exposure chart & report modal portal
│   ├── household-status-bar.tsx # Per-member household compatibility status chips & detail dialog
│   ├── navbar.tsx               # Global authenticated navigation bar
│   └── ui/                      # Reusable accessible UI primitives
├── lib/
│   ├── ai.ts                    # Vercel AI SDK Google provider, chatModel & embeddingModel
│   ├── db/
│   │   ├── index.ts             # Prisma Postgres adapter connection pool
│   │   └── vectors.ts           # pgvector semantic search & embedding helpers
│   ├── guardrails/
│   │   └── intent.ts            # Tier 1 fast deterministic health-domain gatekeeper
│   ├── guru.ts                  # Health Guru prompt, message sanitizer, tool executors & persistence
│   ├── profile.ts               # Profile tag normalization & Prisma upsert builders
│   ├── scan.ts                  # Allergen matching patterns & citation enrichment helpers
│   ├── schemas.ts               # Shared Zod v4 validation schemas & inferred TypeScript types
│   └── supabase/                # Supabase SSR browser, server & proxy client helpers
├── prisma/
│   ├── migrations/
│   │   └── 0_enable_pgvector/   # Initial SQL migration enabling PostgreSQL pgvector extension
│   └── schema.prisma            # Prisma v2 data models (profiles, vectors, monographs, chat)
├── tests/
│   ├── components/              # BentoScanHeader, HouseholdStatusBar & GuruChatDrawer tests
│   ├── integration/             # Scan, Health Guru, Profile & pgvector SQL integration tests
│   └── unit/                    # AI SDK config, guardrails, Prisma & Zod schema unit tests
└── public/                      # Static assets & brand graphics
```

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for details.
