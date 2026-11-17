# Decode v2: Personalized Health Intelligence, Semantic Swaps & Health Guru Platform

* **Author:** bhaveshPatil
* **Date:** 2026-11-17

## Overview

Decode v1 operates as a synchronous diagnostic tool: it extracts ingredient labels from packaging photos or text inputs and returns a static, generic safety score (0–10). In practice, this design has three fundamental flaws:
1. **Impersonal Evaluation**: A product receives the exact same score for an athlete, a celiac patient, a diabetic, or a parent shopping for a child with tree-nut allergies.
2. **Dead-End Diagnostics**: Identifying toxic additives leaves the consumer with no actionable recourse in the supermarket aisle—it identifies the problem without offering cleaner alternatives.
3. **Static Monologue & Trust Gaps**: Analysis reports are rigid and lack verified regulatory citations from toxicological authorities (EFSA, FDA, PubMed), with no ability to ask interactive follow-up questions.

Decode v2 transforms the product into an interactive health copilot. It introduces multi-profile dietary personalization, vector-driven cleaner product swaps using Supabase `pgvector`, pre-indexed regulatory citations, a unified AI stack on the Vercel AI SDK, and a domain-restricted **Health Guru Agent** covering nutrition, food science, and pharmaceuticals.

---

## Analysis & Multi-Lens Review Synthesis

### 1. Dedicated "Health Guru" Conversational Agent (Domain-Restricted)
- **Problem Statement**: Consumers need a trusted, interactive sounding board for health, nutrition, food additives, and pharmaceuticals (mechanisms of action, common side effects, inactive pill excipients, food-drug interactions). Generic chatbots drift off-topic (math, coding, creative writing) and risk dispensing dangerous, unauthorized medical prescriptions.
- **Architectural Design (Vercel AI SDK)**:
  - *Two-Tier Guardrail*:
    1. **Fast Intent Gatekeeper**: Sub-50ms lightweight validation to verify the query pertains to health, nutrition, or pharmacology. Out-of-domain queries (e.g., math, coding, trivia) are immediately rejected in 1–2 plain sentences without invoking expensive tool loops.
    2. **Execution Agent (`streamText`)**: Only domain-cleared prompts activate the full tool-equipped agent.
  - *Bounded Dynamic Tool Suite*:
    - `searchIngredientToxicology`: Vector queries EFSA/FDA monographs for verified chemical data.
    - `findCleanSwaps`: Recommends cleaner alternatives from the catalog matching dietary constraints.
    - `getUserScanHistory`: Conditionally queries the user's past 30 days of consumption only when the user explicitly asks about their personal intake.
    - `checkPersonalCompatibility`: Evaluates products or drug excipients against saved allergy/health flags.
  - *Token & Execution Safeguards*:
    - Hard limit of `maxSteps: 3` per turn to prevent cascading tool execution loops.
    - Sliding-window context truncation retaining the last 6 turns (~4,000 tokens) to prevent exponential context inflation.
  - *Clinical Liability Boundary*:
    - Strictly educational. All pharmaceutical and drug-interaction responses output structured **Educational Interaction Cards** detailing the biochemical mechanism, observed clinical risk, and a non-negotiable directive to consult a licensed physician or pharmacist.
    - Automated detection of red-flag medical emergencies (e.g., chest pain, anaphylaxis) triggers immediate emergency hotline disclaimers.

### 2. Dynamic Health & Allergen Profiles (Personalization & Customization)
- **Mechanism**:
  - Configurable profiles supporting:
    - *Hard Allergens*: Peanuts, tree nuts, gluten/celiac, dairy/lactose, soy, eggs, shellfish, sesame, sulfites.
    - *Dietary Regimes*: Vegan, vegetarian, keto, low-FODMAP, halal, kosher, clean-label.
    - *Health Conditions*: Diabetes (glycemic spike warnings), hypertension (sodium sensitivity), pregnancy (contraindicated botanical extracts/preservatives), renal health (phosphorus/potassium additives).
    - *Household Mode*: Multi-avatar status bar (`[Self: 🟢] [Partner: 🟡] [Child: 🔴]`) displayed on scan results for instant household checks.
  - *Visual Safety Precedence*: **Personal Allergen Conflicts strictly override the Purity Score**. When a hard allergen is detected, the card banner renders a high-contrast danger alert (⛔ *"ALLERGEN CONFLICT: Contains Tree Nuts"*), demoting the objective purity score to a muted secondary badge to prevent catastrophic user error.

### 3. Semantic Product Swap Engine (Relational Filter + pgvector Ranking)
- **Mechanism & TRIZ Resolution**:
  - Vector similarity search cannot natively enforce hard negative boolean exclusions (e.g., "Must NOT contain peanuts or dairy").
  - *Inverted Search Pipeline*: Postgres executes relational filtering first:
    ```sql
    WHERE category = $category 
      AND purity_score >= 8.5 
      AND NOT (allergens && $user_allergens)
    ```
  - Pre-filtered candidates are then ranked by cosine similarity against the scanned product embedding (`pgvector` via `prisma.$queryRaw`).
  - Returns 2 to 3 verified "Cleaner Swaps" highlighting the exact additives eliminated (e.g., "- Sodium Benzoate, - Red 40, + Organic Cane Sugar").

### 4. Evidence-Backed Toxicological Citations (Hybrid Relational + RAG)
- **Problem**: Querying pgvector for every common chemical additive balloons latency and burns database memory.
- **TRIZ Resolution (Segmentation + Preliminary Action)**:
  - Over 95% of toxic additives in consumer goods belong to ~350 common E-numbers and industrial chemicals (e.g., Titanium Dioxide, BHA/BHT, Sodium Benzoate, Aspartame).
  - Pre-curate authoritative EFSA/FDA regulatory determinations and link them directly to canonical `Ingredient` records via foreign-key relational joins (`Ingredient.citationId`), delivering citations in 0ms vector latency.
  - Dynamic `pgvector` RAG search is reserved strictly as an on-demand fallback for novel, unindexed compounds.

### 5. Consumption Frequency Warnings (Descoping Uncalibrated Bioaccumulation)
- **Scope Adjustment**: In Decode, users scan packaging labels without logging weighed portion quantities. Calculating physiological bioaccumulation against Acceptable Daily Intake (ADI) thresholds without dosage data is scientifically invalid.
- **Calibrated Alternative**: Leverage the existing `ExposureTracking` table to display intuitive "Consumption Frequency Warnings" (e.g., *"Seen in 4 scans this week: High cumulative exposure to synthetic food dyes"*), postponing quantitative ADI calculations until portion weighing is implemented.

---

## Goals vs. Non-Goals

### In-Scope Goals (v2)
* **Domain-Restricted Health Guru Agent**: Two-tier guardrailed conversational AI covering nutrition, food science, and pharmaceuticals with strict non-health prompt rejection and bounded tool execution (`maxSteps: 3`).
* **Custom Health & Allergen Profiles**: User and household profiles with allergen, dietary, and condition flags, where allergen conflicts strictly override purity scores.
* **Allergen-Safe Semantic Swap Engine**: Relational category/allergen filtering paired with `pgvector` cosine similarity ranking in Supabase Postgres.
* **Hybrid Toxicological Citations**: 0ms relational citations for ~350 top additives, with `pgvector` RAG fallback for novel compounds.
* **Unified Vercel AI SDK Stack**: Full migration of scanning and chat to `ai` and `@ai-sdk/google`, eliminating legacy `@google/genai` regex JSON parsing.
* **Consumption Frequency Tracking**: Multi-scan additive accumulation warnings without speculative dosage math.

### Out-of-Scope Non-Goals
* **Medical Diagnostic Claims & Prescriptions**: No diagnosing diseases, altering drug regimens, or replacing clinical consultations.
* **Quantitative ADI Bioaccumulation**: No mg-level dosage accumulation without user portion tracking.
* **Mass Catalog Mirroring**: No bulk vectorization of 3 million unvetted OpenFoodFacts items into Supabase. Vector indexing is restricted to scanned items and a seed clean-product database (~5,000 items).
* **Separate Microservice / Python Backend**: Zero Python dependencies; 100% Next.js 16 TypeScript on Bun.
* **Unrestricted General-Purpose Chatbot**: Non-health questions are rejected by system policy.

---

## Alternatives Weighed

* **Quantitative ADI Bioaccumulation Engine**:
  - *Evaluation*: Attempting to calculate bioaccumulation without dosage inputs.
  - *Verdict*: Rejected by review swarm (`egm-zoom-out`). Scientifically invalid and introduces unnecessary cron/time-series complexity. Replaced with relational consumption frequency tracking.
* **Simultaneous Side-by-Side Purity vs. Allergen Scoring**:
  - *Evaluation*: Showing a green 9.8 purity score next to a small allergy warning.
  - *Verdict*: Rejected by review swarm (`egm-comprehension`). Causes fatal visual dissonance for allergic users in grocery stores. Allergen danger banner must take absolute visual precedence.
* **Pure RAG for All Additive Citations**:
  - *Evaluation*: Running vector similarity searches for every scanned ingredient.
  - *Verdict*: Rejected by review swarm (`egm-inventive-catalyst`). Pre-linking the top 350 additives relationally eliminates 95% of vector search overhead and ensures 0ms latency for common additives.
* **Python Backend with LangGraph**:
  - *Evaluation*: Splitting stack into FastAPI + LangGraph Python.
  - *Verdict*: Rejected by author. TypeScript within Next.js handles all required logic with lower maintenance and zero container orchestration overhead.

---

## Key Decisions & Implementation Staging

1. **AI SDK Unification**:
   - Install `ai` and `@ai-sdk/google`. Remove `@google/genai` legacy client.
   - Refactor `app/api/scan/route.ts` to `generateObject` with `ScanResultSchema`.
2. **Database & Vector Schema Migration**:
   - Add migration `CREATE EXTENSION IF NOT EXISTS vector;`.
   - Update `schema.prisma`:
     - `UserProfile` (allergens, dietary regimes, health conditions).
     - `HouseholdMember` (secondary profiles linked to User).
     - `Scan.profileId` (optional/nullable to ensure backward compatibility with historical scans).
     - `ProductEmbedding` (`Unsupported("vector(768)")`).
     - `ToxicologyMonograph` (`Unsupported("vector(768)")`).
     - `ChatSession` and `ChatMessage` with `onDelete: Cascade`.
   - Create `lib/db/vectors.ts` with parameterized `prisma.$queryRaw` helper functions.
3. **Health Guru Route (`app/api/chat/guru/route.ts`)**:
   - Implement Tier 1 fast intent validator.
   - Implement Tier 2 `streamText` with tools (`getUserScanHistory`, `searchIngredientToxicology`, `findCleanSwaps`, `checkPersonalCompatibility`) capped at `maxSteps: 3`.
4. **Frontend Architecture**:
   - Create `/guru` standalone page and slide-over report drawer.
   - Implement Allergen Conflict Danger Banner taking absolute visual precedence over Purity Scores.
   - Display household profile switcher chip bar on scan results.
