# 🔍 Decode — Know What You Consume

**Decode** is a premium, AI-powered ingredient analysis web application. It allows users to scan, break down, and evaluate ingredient labels from food, drinks, and medicines. By utilizing advanced AI, Decode exposes hidden additives, highlights potential health risks, tracks cumulative exposure over time, and provides personalized weekly wellness swap recommendations.

---

## ✨ Key Features

*   **⚡ Single-Shot AI Scan API**: Instantly parses ingredient lists using **Gemini 3.5 Flash** (via the official `@google/genai` Interactions SDK). It normalizes chemical names, classifies additives, and scores safety profiles.
*   **📊 Cumulative Exposure Profile**: Tracks your consumption frequency of specific additives and flags long-term compound risks over time.
*   **🗓️ Weekly Wellness Swaps**: Automatically analyzes exposure trends to generate actionable dietary swaps and personalized wellness suggestions.
*   **🛡️ Hardened Security Gates**: Enforces input size validation (max 5,000 chars) to prevent prompt injection or DoS, filters allowlisted parameters, and secures client interactions using strict HTTP security headers.
*   **💅 Premium Tech-Minimalist UI**: Built using a modern, dark-themed interface featuring smooth Framer Motion micro-animations, glassmorphic panels, dynamic rating gauges, and responsive bento grid layouts.

---

## 🛠️ Tech Stack

*   **Frontend & Routing**: [Next.js 16 (App Router)](https://nextjs.org/) & [React 19](https://react.dev/)
*   **Styling & Motion**: [Tailwind CSS](https://tailwindcss.com/) & [Framer Motion](https://motion.dev/)
*   **Database ORM**: [Prisma](https://www.prisma.io/) with PostgreSQL
*   **Authentication**: [Supabase Auth](https://supabase.com/docs/guides/auth) (via `@supabase/ssr` & Google OAuth)
*   **AI Engine**: [Google Gemini API](https://ai.google.dev/) (`gemini-3.5-flash`)
*   **Runtime & Package Manager**: [Bun](https://bun.sh/)

---

## ⚙️ Project Architecture & Data Flow

```mermaid
sequenceDiagram
    actor User
    participant WebApp as Decode Web App
    participant ScanAPI as /api/scan
    participant Gemini as Gemini 3.5 Flash
    database DB as PostgreSQL (Prisma)

    User->>WebApp: Submit Ingredient Text / Photo
    WebApp->>ScanAPI: POST Ingredients (Input size validated)
    ScanAPI->>Gemini: Parse & Score Ingredients (JSON Schema enforced)
    Gemini-->>ScanAPI: Structured Ingredient Report JSON
    ScanAPI->>DB: Asynchronously Save Scan & Update Exposure Profile
    ScanAPI-->>WebApp: return structured Analysis report
    WebApp-->>User: Render Safety Score & Bento Accordions
```

---

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) installed locally.
- A PostgreSQL database instance.
- A Supabase project for authentication.
- A Google Gemini API Key.

### 1. Clone & Install Dependencies

```bash
# Clone the repository
git clone https://github.com/your-username/decode.git
cd decode

# Install dependencies using Bun
bun install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory and add the following keys:

```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/decode_db?schema=public"

# Supabase Auth Configuration
NEXT_PUBLIC_SUPABASE_URL="https://your-supabase-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOi..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOi..."

# Google Gemini API Key
GEMINI_API_KEY="AIzaSy..."
```

### 3. Setup Database Schema

Decode uses Prisma to model its schema. Run the migrations to setup your tables:

```bash
# Run database migrations
bunx prisma db push

# Generate the Prisma Client types
bunx prisma generate
```

### 4. Run the Development Server

Start the application locally in development mode:

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) (or the port shown in your terminal) in your browser.

---

## 🧪 Commands & Scripts

The following scripts are defined in `package.json`:

| Command | Description |
|---|---|
| `bun run dev` | Starts the Next.js local development server. |
| `bun run build` | Builds the optimized Next.js production bundle. |
| `bun run start` | Runs the compiled Next.js production build. |
| `bun run lint` | Performs static ESLint checks across the codebase. |

---

## 🔒 Security Hardening

Decode implements several server-side security checks:
- **Rate & Size Limits**: Requests to `/api/scan` are capped at 5,000 characters to mitigate DoS and memory exhaustion.
- **Allowed Parameters**: Only allowlisted `inputType` options (`'text'`, `'product_name'`, `'photo'`) are processed.
- **Strict Headers**: Configured in [next.config.ts](file:///c:/Users/Plbha/Desktop/contentanalyze/next.config.ts) to inject browser protection:
  - `X-Frame-Options: DENY` (Anti-Clickjacking)
  - `X-Content-Type-Options: nosniff` (Anti-MIME Sniffing)
  - `Referrer-Policy: origin-when-cross-origin`
  - `X-XSS-Protection: 1; mode=block`

---

## 📄 License

This project is licensed under the MIT License.
