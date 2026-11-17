# Decode v2: Personalized Health Intelligence, Semantic Swaps & Health Guru Platform

*   **Author:** bhaveshPatil
*   **Status:** Approved
*   **Date:** 2026-11-17

--------------------------------------------------------------------------------

## Overview

Decode v1 provides a synchronous diagnostic tool: users capture packaging photos or paste ingredient text, and the system returns a static 0–10 safety score with biochemical profiles. 

Decode v2 transforms Decode into an interactive health copilot. It introduces multi-profile dietary personalization, vector-driven cleaner product swaps using Supabase `pgvector`, pre-indexed regulatory citations from authoritative bodies (EFSA, FDA), a unified Vercel AI SDK foundation, and a domain-restricted **Health Guru Agent** covering nutrition, food science, and pharmaceuticals.

--------------------------------------------------------------------------------

## The Problem

1. **Impersonal Evaluation**: In Decode v1, every product receives an identical score regardless of the consumer's physiological state. A product containing gluten, high sodium, or artificial sweeteners receives the exact same score for an athlete as it does for a celiac patient, a diabetic, an individual with hypertension, or a pregnant mother.
2. **Dead-End Diagnostics**: Identifying harmful additives (such as BHT, Red 40, or high fructose corn syrup) leaves the consumer with no actionable recourse in the supermarket aisle. The system highlights toxicity without offering cleaner alternatives.
3. **Static Monologue & Trust Gaps**: Analysis reports are rigid and lack verified citations from toxicological databases (e.g., EFSA, FDA), with no mechanism to ask interactive follow-up questions.
4. **Latency & SDK Fragmentation**: The existing ingestion pipeline uses `@google/genai` with brittle markdown regex parsing and synchronous blocking requests, keeping mobile users waiting on a loading spinner for 6–8 seconds per scan.

Decode v2 resolves these challenges by personalizing evaluation with hard allergen overrides, pairing pgvector similarity search with relational SQL pre-filtering for cleaner swaps, pre-linking authoritative regulatory citations, and deploying a streaming conversational agent restricted strictly to health, nutrition, and medicines.

--------------------------------------------------------------------------------

## Goals

*   **Personalized Profiles & Visual Precedence**: Enable users to configure personal and household profiles (allergens, dietary regimes, health conditions). When an ingredient violates a hard allergen, an **Allergen Danger Banner** (⛔ *"ALLERGEN CONFLICT"*) strictly overrides the objective purity score.
*   **Allergen-Safe Semantic Swaps**: Implement category-constrained similarity search in Supabase `pgvector` that recommends 2–3 cleaner alternatives (purity >= 8.5) pre-filtered to guarantee zero allergen conflicts.
*   **Domain-Restricted Health Guru Agent**: Provide an interactive conversational agent powered by Vercel AI SDK (`streamText`) covering nutrition, food science, and pharmaceuticals, with a two-tier guardrail rejecting all non-health queries (e.g., math, coding, trivia) and a hard execution ceiling of `maxSteps: 3`.
*   **0ms Regulatory Citations**: Pre-link verified EFSA and FDA determinations directly to the top ~350 common additives relationally (`Ingredient.citationId`), reserving `pgvector` RAG search strictly as an on-demand fallback for novel compounds.
*   **AI SDK Unification**: Standardize all AI interactions on Vercel AI SDK (`ai` and `@ai-sdk/google`), eliminating legacy `@google/genai` regex JSON parsing and supporting streaming interfaces across the application.
*   **Consumption Frequency Tracking**: Track recurring additive ingestion across 7-day windows using relational counters, replacing speculative quantitative bioaccumulation calculations.

--------------------------------------------------------------------------------

## Non-Goals

*   **Medical Diagnostic Claims & Prescriptions**: No diagnosing clinical diseases, adjusting prescription medication dosages, or handling emergency triage. All pharmaceutical guidance remains educational.
*   **Quantitative Daily Intake (ADI) Bioaccumulation**: No calculating milligram-level physiological bioaccumulation, as users do not weigh or log portion sizes.
*   **Mass Vector Catalog Replication**: No bulk ingestion or embedding of 3 million unvetted OpenFoodFacts products into Supabase. Vector indexing is limited to user-scanned products and a curated seed catalog (~5,000 items).
*   **Separate Python Microservice**: Zero Python services or dual-runtime container infrastructure; 100% Next.js 16 TypeScript on Bun.
*   **Unrestricted General-Purpose Chatbot**: General non-health inquiries (software development, mathematics, entertainment) are strictly rejected.

--------------------------------------------------------------------------------

## Open Questions

*   **Question 1**: Should the seed clean-product catalog (~5,000 items) be populated via a one-time OpenFoodFacts migration script or ingested incrementally as verified items are approved?
*   **Question 2**: For pharmaceutical drug questions in the Health Guru, should drug-food interactions be checked against a static local lookup table of known critical pairs (e.g., Statins + Grapefruit) before falling back to model generation?

--------------------------------------------------------------------------------

## Critical User Journeys (CUJs)

### CUJ 1: Allergic Consumer Scanning Packaging in a Supermarket Aisle
*   **Given**: A user with a saved "Tree Nut Allergy" profile scans an organic almond milk beverage.
*   **When**: The label OCR extracts "Almond Milk (Water, Almonds)".
*   **Then**: The scan result immediately renders an unambiguous ⛔ **ALLERGEN CONFLICT: Contains Tree Nuts** banner in bold red, demoting the 9.5/10 purity score to a secondary muted badge, and suggests 2 oat/soy-based cleaner alternatives with 0% tree nut content.

### CUJ 2: Consumer Finding a Cleaner Swap for an Ultra-Processed Item
*   **Given**: A user scans a commercial snack containing BHT, Artificial Color Yellow 5, and Palm Oil (Purity Score: 3.8/10).
*   **When**: The scan report renders the low score and additive burden.
*   **Then**: The "Cleaner Swaps" bento panel executes a relational filter on snack category and user allergens, followed by a pgvector similarity search, presenting 2 cleaner snack bars (Scores: 8.9 and 9.2) with a delta summary: *"- BHT, - Yellow 5, + Organic Oats"*.

### CUJ 3: Engaging the Health Guru for Food-Drug Interactions
*   **Given**: A user taking prescribed atorvastatin opens the Health Guru chat drawer.
*   **When**: The user asks, *"Can I have fresh grapefruit juice in the morning with my medication?"*
*   **Then**: The agent recognizes the query as pharmaceutical/nutritional, executes `searchIngredientToxicology`, and returns an Educational Interaction Card detailing CYP3A4 enzymatic inhibition and increased statin bioavailability, concluding with the mandatory physician advisory disclaimer.

### CUJ 4: Out-of-Domain Query Rejection
*   **Given**: A user opens the Health Guru drawer.
*   **When**: The user submits, *"Write a Python script to sort an array."*
*   **Then**: The Tier 1 fast intent validator detects an out-of-domain query within 50ms and responds: *"I specialize exclusively in health, nutrition, food science, and medications. I cannot assist with programming or other general topics."* No tool calls or RAG searches are executed.

--------------------------------------------------------------------------------

## Technical Plan (Architecture)

### 1. System Architecture Overview

```text
┌───────────────────────────────────────────────────────────────────────────┐
│                            Next.js 16 Client                              │
│   (React 19, Tailwind CSS v4, Motion, Bento Layouts, useChat, streamText) │
└───────────────┬───────────────────────────┬───────────────────────────────┘
                │                           │
        [Scanning & Swaps]          [Health Guru Chat]
                │                           │
                ▼                           ▼
┌──────────────────────────────┐ ┌──────────────────────────────────────────┐
│ POST /api/scan               │ │ POST /api/chat/guru                      │
│ - Vercel AI SDK              │ │ - Tier 1: Fast Intent Gatekeeper         │
│   (generateObject)           │ │ - Tier 2: streamText (maxSteps: 3)       │
│ - Allergen Precedence Check  │ │ - Sliding-Window Truncation (6 turns)    │
└───────────────┬──────────────┘ └──────────────┬───────────────────────────┘
                │                               │
                ▼                               ▼
┌───────────────────────────────────────────────────────────────────────────┐
│               Data Access & Vector Engine (lib/db/vectors.ts)             │
│   - Inverted Swap Filter: Relational SQL -> pgvector Cosine Distance      │
│   - Hybrid Citations: Foreign-key Joins -> pgvector RAG Fallback          │
└───────────────────────────────┬───────────────────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                  Supabase PostgreSQL (Prisma 7 + pgvector)                │
│   - User, UserProfile, HouseholdMember                                    │
│   - Scan, ScanIngredient, Ingredient, ExposureTracking                    │
│   - ProductEmbedding (vector 768), ToxicologyMonograph (vector 768)       │
│   - ChatSession, ChatMessage                                              │
└───────────────────────────────────────────────────────────────────────────┘
```

### 2. AI Layer Unification (Vercel AI SDK)

The codebase deprecates `@google/genai` v2.8.0 and standardizes 100% on the Vercel AI SDK (`ai` and `@ai-sdk/google`).

*   **Ingestion Endpoint (`POST /api/scan`)**:
    *   Replaces manual regex markdown stripping (`parseLLMJSON`) with `generateObject`:
        ```typescript
        const result = await generateObject({
          model: google('gemini-2.5-flash'),
          schema: ScanResultSchema,
          messages: [{ role: 'user', content: interactionInput }],
        });
        ```
    *   Guarantees runtime schema adherence via Zod without JSON parse errors or markdown code block fences.
*   **Conversational Assistant (`POST /api/chat/guru`)**:
    *   Implements `streamText` with client-side UI consumption via `useChat`.
    *   Enforces a strict execution ceiling of `maxSteps: 3` to prevent cascading tool loops.
    *   Applies sliding-window truncation to retain the last 6 turns (~4,000 tokens), preventing exponential token bloat.

### 3. Database & Schema Architecture (Prisma + pgvector)

#### Database Extensions
A raw SQL migration enables `pgvector`:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

#### Prisma Schema Additions (`prisma/schema.prisma`)
```prisma
// Updates to existing User model
model User {
  id          String             @id
  email       String             @unique
  scans       Scan[]
  exposures   ExposureTracking[]
  comparisons Comparison[]
  profile     UserProfile?       // Bidirectional relation to UserProfile
  chatSessions ChatSession[]     // Bidirectional relation to ChatSession
  createdAt   DateTime           @default(now())
}

model UserProfile {
  id               String            @id @default(cuid())
  userId           String            @unique
  allergens        String[]          // e.g. ["peanuts", "tree_nuts", "gluten", "dairy"]
  dietaryRegimes   String[]          // e.g. ["vegan", "keto", "low_fodmap"]
  healthConditions String[]          // e.g. ["diabetes", "hypertension", "pregnancy"]
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt
  user             User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  householdMembers HouseholdMember[]
  scans            Scan[]            // Bidirectional relation to Scan
}

model HouseholdMember {
  id               String      @id @default(cuid())
  profileId        String
  name             String
  allergens        String[]
  dietaryRegimes   String[]
  healthConditions String[]
  createdAt        DateTime    @default(now())
  profile          UserProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)
}

model ProductEmbedding {
  id          String   @id @default(cuid())
  productName String
  category    String   // Normalized category, e.g. "snack_bars", "cereal"
  purityScore Float
  allergens   String[] // Normalized allergen tags, e.g. ["dairy", "soy"]
  embedding   Unsupported("vector(768)")
  metadata    Json     // Detailed ingredients, additives, brand
  createdAt   DateTime @default(now())

  @@index([category, purityScore])
}

model ToxicologyMonograph {
  id             String       @id @default(cuid())
  ingredientName String       @unique
  eNumber        String?
  regulatoryBody String       // "EFSA" | "FDA"
  classification String       // "banned", "high_concern", "gras"
  summary        String
  citationUrl    String
  embedding      Unsupported("vector(768)")
  createdAt      DateTime     @default(now())
  ingredients    Ingredient[] // Bidirectional relation to Ingredient
}

model ChatSession {
  id        String        @id @default(cuid())
  userId    String
  title     String        @default("Health Consultation")
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt
  user      User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages  ChatMessage[]
}

model ChatMessage {
  id        String      @id @default(cuid())
  sessionId String
  role      String      // "user" | "assistant" | "system"
  content   String
  toolCalls Json?
  createdAt DateTime    @default(now())
  session   ChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
}
```

#### Backward Compatibility Safeguard
The `Scan` model adds `profileId` as an optional field:
```prisma
model Scan {
  // Existing fields preserved
  profileId String?      // Nullable; existing historical scans default to null without migration data loss
  profile   UserProfile? @relation(fields: [profileId], references: [id], onDelete: SetNull)
}
```

### 4. Database Vector Helper Layer (`lib/db/vectors.ts`)

Because Prisma Client cannot natively generate vector operators (`<=>`), isolated, parameterized SQL helper functions execute queries via `prisma.$queryRaw`. In `pgvector`, vectors must be injected as JSON string representations (`${JSON.stringify(targetEmbedding)}::vector`) because PostgreSQL rejects direct array-to-vector casting:

```typescript
export async function findCleanerSwaps({
  targetEmbedding,
  category,
  userAllergens,
  limit = 3,
}: {
  targetEmbedding: number[];
  category: string;
  userAllergens: string[];
  limit?: number;
}) {
  // Inverted pipeline: Relational filter first, vector distance second
  const embeddingString = JSON.stringify(targetEmbedding);
  const safeAllergens = userAllergens.length > 0 ? userAllergens : ['__none__'];

  return await prisma.$queryRaw<Array<{
    id: string;
    productName: string;
    purityScore: number;
    metadata: unknown;
    distance: number;
  }>>`
    SELECT 
      id,
      "productName",
      "purityScore",
      metadata,
      embedding <=> ${embeddingString}::vector AS distance
    FROM "ProductEmbedding"
    WHERE category = ${category}
      AND "purityScore" >= 8.5
      AND NOT (allergens && ${safeAllergens}::text[])
    ORDER BY distance ASC
    LIMIT ${limit};
  `;
}
```

### 5. Inverted Semantic Product Swap Pipeline

```text
[Scanned Product] (e.g., Ultra-Processed Snack, Score: 3.8, Category: "snack_bars")
       │
       ▼
[Generate Vector Embedding] (768-dim vector via text-embedding model)
       │
       ▼
[Step 1: SQL Relational Pre-Filter]
  - WHERE category = 'snack_bars'
  - AND purity_score >= 8.5
  - AND NOT (allergens && ARRAY['tree_nuts', 'gluten'])
       │
       ▼
[Step 2: Vector Distance Ranking]
  - ORDER BY embedding <=> $scanned_vector ASC
  - LIMIT 3
       │
       ▼
[Return 2-3 Guaranteed Allergen-Safe Clean Swaps]
```

### 6. Hybrid Toxicological Citation Engine

1. **Relational Hot-Path (0ms Vector Latency)**:
   - Canonical `Ingredient` records link directly to pre-curated EFSA/FDA monograph records via foreign key (`Ingredient.citationId`).
   - Resolves >95% of common harmful additives (Titanium Dioxide, BHA/BHT, Sodium Benzoate, Red 40, Aspartame) instantly via standard SQL joins during the initial scan.
2. **pgvector Fallback (On-Demand)**:
   - For novel or unindexed chemical compounds, `searchIngredientToxicology` executes an on-demand vector cosine search across `ToxicologyMonograph` embeddings, returning citations with similarity scores > 0.82.

### 7. Health Guru Two-Tier Guardrail Architecture

```text
[User Prompt]
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│ Tier 1: Fast Intent Gatekeeper (<50ms)                      │
│ - Deterministic regex check for explicit health keywords    │
│ - Lightweight intent verification                           │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
         [Out of Domain]               [Domain Cleared]
               │                              │
               ▼                              ▼
┌──────────────────────────────┐ ┌─────────────────────────────┐
│ 1-2 Sentence Polite Refusal  │ │ Tier 2: streamText Execution│
│ "I specialize exclusively in │ │ - maxSteps: 3               │
│ health, nutrition & drugs."  │ │ - Sliding-Window (6 turns)  │
└──────────────────────────────┘ │ - Tools:                    │
                                 │   - getUserScanHistory      │
                                 │   - searchToxicology        │
                                 │   - findCleanSwaps          │
                                 │   - checkCompatibility      │
                                 └──────────────┬──────────────┘
                                                │
                                                ▼
                                 ┌─────────────────────────────┐
                                 │ Structured Educational Card │
                                 │ + Mandatory Medical Advisory│
                                 └─────────────────────────────┘
```

### 8. Frontend Component Hierarchy & Visual Precedence

*   **`BentoScanHeader`**:
    *   **State 1 (Allergen Conflict Detected)**:
        *   Renders full-width ⛔ **ALLERGEN CONFLICT** banner with severe red background, listing violating ingredients.
        *   Demotes objective Purity Score to a muted, small gray badge labeled *"Biochemical Purity: 9.2 (Unsafe for User Profile)"*.
    *   **State 2 (Profile Safe)**:
        *   Renders standard prominent Purity Score (e.g., Green 9.2/10) with verified clean badges.
*   **`HouseholdStatusBar`**:
    *   Renders avatar chips across all members (`[Self: 🟢] [Partner: 🟡] [Child: 🔴]`), enabling immediate multi-person safety assessment in one glance.
*   **`GuruChatDrawer`**:
    *   Docked slide-over drawer available across `/`, `/history`, and `/compare`.
    *   Renders streamed tokens, tool-calling status indicators, and structured educational interaction cards for pharmaceutical inquiries.

--------------------------------------------------------------------------------

## Alternatives Considered

Each alternative below represents a different architectural path evaluated during brainstorming for a core subsystem of Decode v2, along with the technical reasons why our chosen solution was selected instead:

### Alternative 1: Python Backend with LangGraph (Alternative to Pure TypeScript Vercel AI SDK Stack)
*   **Chosen Solution**: Unified Next.js 16 TypeScript architecture with Vercel AI SDK (`ai` and `@ai-sdk/google`).
*   **Pros**: Access to native Python data science libraries; native LangGraph Python ecosystem for stateful graph orchestration.
*   **Cons**: Splits codebase into two distinct runtimes (TypeScript + Python); doubles deployment infrastructure (Next.js serverless + FastAPI container); introduces CORS overhead, duplicate schema declarations (Prisma + Pydantic), and complex local developer setup.
*   **Reason for Rejection**: `Rejected by author: unneeded architectural complexity. Vercel AI SDK and TypeScript within Next.js 16 natively satisfy all streaming, tool-calling, and retrieval requirements with zero container maintenance overhead.`

### Alternative 2: Quantitative Bioaccumulation & Daily Intake Thresholds (Alternative to Relational Consumption Frequency Warnings)
*   **Chosen Solution**: Relational consumption frequency alerts (e.g., *"Seen across 4 scans this week: High recurring exposure to synthetic food dyes"*).
*   **Pros**: Theoretically tracks exact micro-dosing and physiological compound accumulation over 24-hour and 7-day windows against Acceptable Daily Intake (ADI) thresholds.
*   **Cons**: In Decode, consumers scan ingredient labels from packaging photos or text—they do not weigh portions or log gram dosages. Calculating biological bioaccumulation against Acceptable Daily Intake (ADI) thresholds without portion data is scientifically invalid, creates severe legal liability, and requires complex background cron aggregation pipelines.
*   **Reason for Rejection**: `Rejected by author: scientifically invalid and misleading to compute physiological bioaccumulation without verified portion dosage data. Replaced with relational Consumption Frequency Warnings.`

### Alternative 3: Simultaneous Side-by-Side Purity vs. Allergen Scoring (Alternative to Allergen Danger Banner Precedence)
*   **Chosen Solution**: Strict visual precedence—an Allergen Danger Banner (⛔ *"ALLERGEN CONFLICT"*) strictly overrides and demotes the purity score whenever a conflict exists.
*   **Pros**: Maintains consistent 0–10 score visibility across every product view.
*   **Cons**: Displays a prominent green 9.5/10 purity badge on organic almond butter alongside a subtle red allergy warning. A hurried consumer in a supermarket aisle glancing at the green score risks ingesting a fatal allergen.
*   **Reason for Rejection**: `Rejected by author: critical user safety hazard in grocery retail environments. When an allergen conflict exists, the Allergen Danger Banner must strictly override and demote the purity score to prevent catastrophic user error.`

### Alternative 4: Pure RAG for All Additive Citations (Alternative to Hybrid Relational Hot-Path + pgvector Fallback)
*   **Chosen Solution**: Pre-link authoritative EFSA/FDA regulatory determinations relationally for the top ~350 common additives (0ms vector latency), reserving `pgvector` RAG search strictly as an on-demand fallback for novel compounds.
*   **Pros**: Unified retrieval pipeline; everything queries `pgvector`.
*   **Cons**: Performing vector similarity searches across 15–30 ingredients per scan introduces high query latency (4–8 seconds) and risks memory thrashing on Supabase free/hobby compute tiers.
*   **Reason for Rejection**: `Rejected by author: excessive vector compute latency and memory thrashing on common additives. Pre-linking the top ~350 common additives relationally delivers citations in 0ms vector latency, reserving pgvector RAG strictly as an on-demand fallback for novel compounds.`

### Alternative 5: Third-Party SaaS Vector Database (Alternative to Supabase Native pgvector)
*   **Chosen Solution**: Supabase native `pgvector` extension in PostgreSQL via Prisma and parameterized raw SQL queries.
*   **Pros**: Dedicated managed vector index with pre-tuned HNSW indexing.
*   **Cons**: Adds a separate billing vendor, introduces external network latency, requires cross-system sync pipelines, and breaks atomic relational filtering.
*   **Reason for Rejection**: `Rejected by author: unneeded infrastructure complexity and data drift; Supabase native pgvector co-locates relational data with embeddings, enabling atomic single-query filtering.`

### Alternative 6: Generic Unbounded Chatbot (Alternative to Domain-Restricted Health Guru Agent)
*   **Chosen Solution**: Two-Tier Guardrailed Health Guru Agent restricted strictly to health, nutrition, food science, and pharmaceuticals, with sub-50ms rejection of non-health queries.
*   **Pros**: Simple system prompt with zero refusal logic.
*   **Cons**: Users burn API tokens asking coding, mathematics, or trivia questions; vulnerable to prompt injection; dilutes Decode's identity as a specialized health platform.
*   **Reason for Rejection**: `Rejected by author: token depletion and dilution of the application's core health mission. Replaced with a Two-Tier Guardrail that enforces strict domain restriction to health, nutrition, and pharmaceuticals.`

--------------------------------------------------------------------------------

## Non-Functional Requirements

### 1. Security & Privacy
*   **Authentication & Session Guard**: All endpoints (`/api/scan`, `/api/compare`, `/api/chat/guru`) strictly require authenticated Supabase SSR session validation before triggering AI generation or database writes.
*   **Injection Defenses**:
    *   Untrusted user input and OCR text are encapsulated in `<user_ingredients>` and `<user_context>` XML tags within system instructions.
    *   Vector queries in `lib/db/vectors.ts` use parameterized SQL via `prisma.$queryRaw` to prevent SQL injection.
*   **Clinical Liability Floor**: The Health Guru agent operates strictly under educational guardrails. It never outputs prescriptive medical advice or alters drug dosages. Medical disclaimers are hardwired into every pharmaceutical response.

### 2. Performance & Latency
*   **Scan Ingestion Target**: Image OCR and structured ingredient extraction return within <2.5 seconds using Vercel AI SDK `generateObject` with Gemini 2.5 Flash.
*   **0ms Citation Hot-Path**: Over 95% of toxicological citations are joined relationally via SQL foreign keys, avoiding vector search latency on primary scan results.
*   **Streaming UI Responsiveness**: Health Guru chat begins streaming response tokens within <400ms using Vercel AI SDK `streamText` and HTTP streaming.
*   **Token Economics**: Hard ceiling of `maxSteps: 3` and 6-turn sliding-window context truncation restricts token consumption to <4,000 tokens per turn.

### 3. Rollout & Migration Safety
*   **Zero-Downtime Schema Evolution**: All new foreign keys (`Scan.profileId`, `Ingredient.citationId`) are nullable. Existing historical scans and user records continue functioning without data backfill downtime.
*   **Vector Extension Safety**: `CREATE EXTENSION IF NOT EXISTS vector;` ensures idempotency across environments.

--------------------------------------------------------------------------------

## Detailed Implementation Plan

### Target Files to Create & Modify

#### 1. `package.json` (`Modify`)
*   **Type / Scope**: Dependency Configuration
*   **Proposed Changes**:
    *   Add runtime dependencies: `@ai-sdk/google`, `ai`, and `@ai-sdk/react` (required for client-side `useChat` streaming hooks).
    *   Remove legacy `@google/genai` dependency.
    *   Add test runner devDependencies: `@testing-library/react` and `happy-dom` (or `vitest`).
    *   Add script: `"test": "bun test"`.

#### 2. `prisma/schema.prisma` (`Modify`)
*   **Type / Scope**: Database Relational Schema
*   **Proposed Changes**:
    *   Update `User` model with bidirectional opposite relations:
        *   `profile UserProfile?`
        *   `chatSessions ChatSession[]`
    *   Add `UserProfile` model (`id`, `userId`, `allergens`, `dietaryRegimes`, `healthConditions`, `scans Scan[]`, relation to `User`).
    *   Add `HouseholdMember` model (`id`, `profileId`, `name`, `allergens`, `dietaryRegimes`, `healthConditions`, relation to `UserProfile`).
    *   Add `ProductEmbedding` model with `Unsupported("vector(768)")`.
    *   Add `ToxicologyMonograph` model with `Unsupported("vector(768)")` and bidirectional opposite relation `ingredients Ingredient[]`.
    *   Update `Ingredient` model with optional foreign key `citationId String?` referencing `ToxicologyMonograph(id)`.
    *   Update `Scan` model with optional foreign key `profileId String?` referencing `UserProfile(id)`.
    *   Add `ChatSession` and `ChatMessage` models with `onDelete: Cascade` linked to `User`.

#### 3. `prisma/migrations/0_enable_pgvector/migration.sql` (`Create`)
*   **Type / Scope**: Database SQL Migration & Baselining
*   **Proposed Changes**:
    *   Add idempotent raw SQL migration: `CREATE EXTENSION IF NOT EXISTS vector;`.
    *   **Migration Baselining Procedure**: Execute migration without schema drop risk via:
        `bunx prisma db execute --file prisma/migrations/0_enable_pgvector/migration.sql` followed by `bunx prisma migrate resolve --applied 0_enable_pgvector` to baseline existing Supabase tables safely.

#### 4. `lib/schemas.ts` (`Modify`)
*   **Type / Scope**: TypeScript & Zod Validation Schemas
*   **Proposed Changes**:
    *   Update `IngredientAnalysisSchema` to add optional enrichment fields:
        *   `allergenConflict: z.boolean().optional()`
        *   `citation: z.object({ regulatoryBody: z.string(), summary: z.string(), citationUrl: z.string() }).optional()`
    *   Update `ScanResultSchema` to include top-level `allergenAlert: z.object({ hasConflict: z.boolean(), conflictingAllergens: z.array(z.string()) }).optional()`.
    *   Define `UserProfileSchema` (allergens, dietary regimes, health conditions).
    *   Define `HouseholdMemberSchema`.
    *   Define `CleanerSwapResultSchema` (product metadata, eliminated additives, purity score gain).
    *   Define `EducationalInteractionSchema` (biochemical mechanism, clinical observation, physician advisory).
    *   Define `HealthGuruIntentSchema` (domain clearance validation).

#### 5. `lib/ai.ts` (`Modify`)
*   **Type / Scope**: Core AI Provider Configuration
*   **Proposed Changes**:
    *   Replace `GoogleGenAI` instantiation with Vercel AI SDK Google provider (`createGoogleGenerativeAI` from `@ai-sdk/google`).
    *   Support fallback API key resolution:
        `const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINIAI_API_KEY;`
    *   Export configured model instances:
        *   `google = createGoogleGenerativeAI({ apiKey })`
        *   `chatModel = google('gemini-2.5-flash')`
        *   `embeddingModel = google.textEmbeddingModel('text-embedding-004')` (768 dimensions for pgvector).

#### 6. `lib/db/vectors.ts` (`Create`)
*   **Type / Scope**: Database Vector Access Layer
*   **Proposed Changes**:
    *   Implement `findCleanerSwaps({ targetEmbedding, category, userAllergens, limit })`: Parameterized raw SQL executing relational pre-filters on category and allergen exclusions followed by pgvector cosine distance ranking (`<=>`). Injects embeddings as stringified arrays (`${JSON.stringify(targetEmbedding)}::vector`) and guards against empty allergen arrays (`${userAllergens.length > 0 ? userAllergens : ['__none__']}::text[]`).
    *   Implement `searchToxicologyVector({ queryEmbedding, limit, minSimilarity })`: Cosine similarity query against `ToxicologyMonograph`.
    *   Implement `upsertProductEmbedding({ id, productName, category, purityScore, allergens, embedding, metadata })`: Uses `prisma.$executeRaw` with explicit `${JSON.stringify(embedding)}::vector` casting to populate `Unsupported("vector(768)")` safely.

#### 7. `lib/guardrails/intent.ts` (`Create`)
*   **Type / Scope**: Health Guru Two-Tier Guardrail
*   **Proposed Changes**:
    *   Implement `validateHealthDomain(prompt: string)`:
        *   Tier 1 deterministic keyword regex evaluating health, nutrition, and pharmaceutical markers.
        *   Fast intent classification returning `{ isPermitted: boolean; reason?: string }`.
        *   Rejection string formatting for out-of-domain requests (math, coding, general trivia).

#### 8. `app/api/scan/route.ts` (`Modify`)
*   **Type / Scope**: Next.js Ingestion Route Handler
*   **Proposed Changes**:
    *   Migrate from `@google/genai` to Vercel AI SDK `generateObject({ model, schema: ScanResultSchema })`.
    *   Handle multimodal packaging photos using Vercel AI SDK content parts (`content: [{ type: 'text', text: promptText }, { type: 'image', image: cleanBase64, mimeType }]`).
    *   Fetch authenticated user's `UserProfile` and `HouseholdMembers`.
    *   Pass `userProfile?.id` into internal `persistScan` helper and update `persistScan` to write `profileId` to the Prisma `Scan` record.
    *   Post-LLM Enrichment: Cross-reference extracted ingredients against active user allergens, attach `allergenConflict` flags, and execute relational SQL join on `Ingredient.citationId` to attach instant 0ms toxicological citations.

#### 9. `app/api/chat/guru/route.ts` (`Create`)
*   **Type / Scope**: Health Guru Streaming Route Handler
*   **Proposed Changes**:
    *   Authenticate request via Supabase SSR (`getUser()`).
    *   Run Tier 1 `validateHealthDomain(prompt)`. If out-of-domain, return a 200 HTTP response formatted as a Vercel AI SDK data stream chunk (`0:"I specialize exclusively in health, nutrition, food science, and medications.\n"`) so client `useChat` renders the rejection without JSON parsing errors.
    *   Sanitize conversation context by preserving the system prompt at index 0 while truncating dialogue history to a 6-turn sliding window.
    *   Execute Vercel AI SDK `streamText` with `maxSteps: 3`.
    *   Define explicit Zod parameter schemas for all 4 dynamic tools:
        *   `getUserScanHistory`: `z.object({ limitDays: z.number().default(30) })`
        *   `searchIngredientToxicology`: `z.object({ ingredientName: z.string(), query: z.string() })`
        *   `findCleanSwaps`: `z.object({ category: z.string(), targetAdditivesToAvoid: z.array(z.string()).optional() })`
        *   `checkPersonalCompatibility`: `z.object({ ingredients: z.array(z.string()) })`
    *   Execute turn persistence inside `streamText`'s `onFinish({ text, toolCalls, toolResults })` callback to ensure non-blocking token delivery and guaranteed database persistence to `ChatMessage`.
    *   Return streaming HTTP response via `toDataStreamResponse()`.

#### 10. `app/api/profile/route.ts` (`Create`)
*   **Type / Scope**: User Profile Management Route Handler
*   **Proposed Changes**:
    *   `GET`: Retrieve current user's profile, allergens, dietary regimes, and household members.
    *   `PUT`: Upsert profile settings and sync household members.

#### 11. `components/bento-scan-header.tsx` (`Create`)
*   **Type / Scope**: Visual Precedence Header Component
*   **Proposed Changes**:
    *   Standardized filename matching exported identifier `BentoScanHeader`.
    *   Use `@phosphor-icons/react` exclusively for iconography (`WarningOctagon`, `ShieldCheck`, `CheckCircle`).
    *   Implement strict visual safety precedence: If an allergen conflict exists, render a high-contrast ⛔ **ALLERGEN CONFLICT** banner with severe red background.
    *   Demote the objective Purity Score to a muted, small badge labeled *"Biochemical Purity: X.X (Unsafe for User Profile)"*.
    *   If no allergen conflict, render standard prominent Purity Score with verified clean badges.

#### 12. `components/household-status-bar.tsx` (`Create`)
*   **Type / Scope**: Household Safety Telemetry Component
*   **Proposed Changes**:
    *   Render avatar chips across all household members (`[Self: 🟢] [Partner: 🟡] [Child: 🔴]`).
    *   Use `@base-ui/react` dialog primitives for the household member breakdown modal, styled with Tailwind CSS.
    *   Import icons exclusively from `@phosphor-icons/react`.

#### 13. `components/guru-chat-drawer.tsx` (`Create`)
*   **Type / Scope**: Conversational Assistant Drawer Component
*   **Proposed Changes**:
    *   Slide-over chat drawer powered by `useChat` from `@ai-sdk/react`.
    *   Render streamed tokens in real time with `@phosphor-icons/react` iconography.
    *   Render intermediate tool-execution status indicators ("Checking your allergy profile...", "Consulting toxicology monographs...").
    *   Render structured `EducationalInteractionCard` widgets for pharmaceutical queries with mandatory physician disclaimers.

#### 14. `components/dashboard.tsx` (`Modify`)
*   **Type / Scope**: Main Dashboard Page Component
*   **Proposed Changes**:
    *   Integrate `BentoScanHeader` with allergen precedence.
    *   Integrate `HouseholdStatusBar`.
    *   Add floating action trigger to open `GuruChatDrawer` pre-seeded with current scan context.

#### 15. `app/guru/page.tsx` (`Create`)
*   **Type / Scope**: Dedicated Health Guru Standalone Page
*   **Proposed Changes**:
    *   Full-page conversational interface with past consultation threads (`ChatSession`) in a sidebar and quick-prompt chips (e.g., *"Review my sodium intake this week"*, *"Check drug-food interactions for atorvastatin"*).

#### 16. `app/profile/page.tsx` (`Create`)
*   **Type / Scope**: User Profile Configuration Page
*   **Proposed Changes**:
    *   Interactive multi-select chips for allergens (peanuts, tree nuts, dairy, gluten, soy, eggs, sesame, sulfites).
    *   Dietary regime toggles (vegan, keto, low-FODMAP, clean-label).
    *   Health condition toggles (diabetes, hypertension, pregnancy).
    *   Household member management sub-panel.

#### 17. `README.md` (`Modify`)
*   **Type / Scope**: Project Documentation
*   **Proposed Changes**:
    *   Update architecture diagram to show Vercel AI SDK and Supabase pgvector.
    *   Document `pgvector` migration and environment variables (`GOOGLE_GENERATIVE_AI_API_KEY`).
    *   Document Health Guru agent capabilities and domain guardrails.

#### 18. `tests/unit/guardrails.test.ts` (`Create`)
*   **Type / Scope**: Unit Test Suite
*   **Proposed Changes**:
    *   Automated test suite executing `bun test tests/unit/guardrails.test.ts`.
    *   Verifies sub-50ms rejection of non-health queries (math, programming, trivia).
    *   Verifies clearance of pharmaceutical, nutritional, and ingredient inquiries.

#### 19. `tests/integration/vectors.test.ts` (`Create`)
*   **Type / Scope**: Integration Test Suite
*   **Proposed Changes**:
    *   Automated test suite executing `bun test tests/integration/vectors.test.ts`.
    *   Verifies `findCleanerSwaps` SQL execution plan: confirms relational pre-filtering excludes allergen-containing candidates before vector cosine distance computation.

#### 20. `tests/components/bento-scan-header.test.tsx` (`Create`)
*   **Type / Scope**: Component DOM Test Suite
*   **Proposed Changes**:
    *   Automated React component test executing `bun test tests/components/bento-scan-header.test.tsx`.
    *   Verifies that when `allergenConflict === true`, the ⛔ **ALLERGEN CONFLICT** banner is rendered in bold red, and the purity score badge is demoted to a muted secondary style.

--------------------------------------------------------------------------------

## Verification Plan

### 1. Build & Static Analysis
*   **TypeScript Compilation**: `bunx tsc --noEmit` must pass with zero errors across the entire codebase.
*   **Linting**: `bun run lint` (ESLint 9) must pass with zero errors or warnings.
*   **Automated Test Suite**: `bun test` must pass all unit, integration, and component test suites (100% passing tests).
*   **Next.js Production Build**: `bun run build` must compile cleanly with all serverless routes and client pages properly typed.

### 2. Functional & Safety Verification

#### Test Case 1: Allergen Safety Precedence (Visual & Logic)
*   **Command**: `bun test tests/components/bento-scan-header.test.tsx`
*   **Action**: Render `BentoScanHeader` with product scoring 9.5 and `allergenAlert: { hasConflict: true, conflictingAllergens: ['Almond'] }`.
*   **Verification**:
    *   DOM assertion: High-contrast ⛔ **ALLERGEN CONFLICT: Contains Almond** banner is rendered in bold red (`text-red-500 bg-red-950/40 border-red-500/50`).
    *   DOM assertion: Purity score (9.5) is demoted to a secondary muted badge labeled *"Biochemical Purity: 9.5 (Unsafe for User Profile)"*.

#### Test Case 2: Inverted Allergen-Safe Swap Filtering
*   **Command**: `bun test tests/integration/vectors.test.ts`
*   **Action**: Call `findCleanerSwaps` for a snack bar category with user allergens `['peanuts', 'gluten']`.
*   **Verification**:
    *   SQL execution plan confirms `NOT (allergens && ARRAY['peanuts', 'gluten'])` executes prior to vector distance computation.
    *   Zero returned products contain peanuts or gluten.
    *   All returned products have `purityScore >= 8.5`.

#### Test Case 3: Health Guru Out-of-Domain Rejection (<50ms)
*   **Command**: `bun test tests/unit/guardrails.test.ts`
*   **Action**: Submit non-health queries (`"Write Python code to reverse a linked list"`, `"What is the capital of France?"`, `"Evaluate 2+2"`) to `validateHealthDomain`.
*   **Verification**:
    *   Execution time asserts `<50ms` runtime duration.
    *   `isPermitted` asserts `false`.
    *   API response returns data stream refusal: *"I specialize exclusively in health, nutrition, food science, and medications."*
    *   Zero Vercel AI SDK dynamic tools are invoked.

#### Test Case 4: Health Guru Food-Drug Interaction & Mandatory Disclaimer
*   **Action**: Submit query: `"Can I drink grapefruit juice with atorvastatin?"` to `/api/chat/guru`.
*   **Verification**:
    *   Tier 1 clears the query as pharmaceutical/nutritional (`isPermitted: true`).
    *   Agent executes `searchIngredientToxicology`.
    *   Response streams an Educational Interaction Card explaining CYP3A4 inhibition and bioavailability increase.
    *   Response includes the non-negotiable directive: *"Consult your prescribing physician or pharmacist before modifying any medication schedule."*

#### Test Case 5: 0ms Citation Relational Hot-Path
*   **Action**: Scan an ingredient list containing Titanium Dioxide (E171) and Sodium Benzoate.
*   **Verification**:
    *   Postgres query log confirms citations are joined via foreign key `Ingredient.citationId`.
    *   Zero `pgvector` distance queries are executed on the primary scan path.
    *   Response renders authoritative EFSA/FDA regulatory determination badges with valid citation URLs.

--------------------------------------------------------------------------------

*Drafted with EGM*
