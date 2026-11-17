# Goldfish Annotated Review Report

**Target:** `docs/designs/decode-v2-health-intelligence.md` (`lines 407-588`)
**Status:** resolved (All 15 proposed fixes batch-applied)

## Prioritized Findings & AI Suggestions

### 1. Missing `@ai-sdk/react` Dependency for Client-Side Streaming Drawer [`egm-codebase-details`] - Severity: Blocker
*   **Affected Scope:** [Lines 411-417](docs/designs/decode-v2-health-intelligence.md#L411-L417) (`package.json`)
*   **Discrepancy Description:** `package.json` only lists adding `@ai-sdk/google` and `ai`. However, File 13 (`components/guru-chat-drawer.tsx`) relies on `useChat` from `@ai-sdk/react`. Omitting `@ai-sdk/react` causes module resolution failure during Next.js compilation.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Essential dependency omission; `useChat` is shipped exclusively in `@ai-sdk/react`.
*   ***Proposed Edit:***
    *   Location: File 1 (`package.json`), line 414
    *   Change: Add `@ai-sdk/react` to proposed dependencies alongside `ai` and `@ai-sdk/google`.

---

### 2. Incomplete Prisma Relational Definitions on Existing `User` and `ToxicologyMonograph` Models [`egm-codebase-details`] - Severity: Blocker
*   **Affected Scope:** [Lines 418-427](docs/designs/decode-v2-health-intelligence.md#L418-L427) (`prisma/schema.prisma`)
*   **Discrepancy Description:** In Prisma schemas, relation fields are strictly bidirectional. Adding `UserProfile`, `ChatSession`, and foreign keys to `Ingredient` and `Scan` without matching opposite relations on `User`, `ToxicologyMonograph`, and `UserProfile` causes `prisma validate` to fail.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Prisma schema validity requires explicit bidirectional relation fields.
*   ***Proposed Edit:***
    *   Location: File 2 (`prisma/schema.prisma`), line 421
    *   Change: Explicitly document adding `profile UserProfile?` and `chatSessions ChatSession[]` to `User`; adding `ingredients Ingredient[]` to `ToxicologyMonograph`; and adding `scans Scan[]` to `UserProfile`.

---

### 3. Prisma Parameterization & Type Serialization Failure in `pgvector` Raw SQL [`egm-codebase-details`] - Severity: Blocker
*   **Affected Scope:** [Lines 448-454](docs/designs/decode-v2-health-intelligence.md#L448-L454) (`lib/db/vectors.ts`)
*   **Discrepancy Description:** In PostgreSQL with `@prisma/adapter-pg`, passing a JS `number[]` to `${targetEmbedding}::vector` fails because PostgreSQL does not support casting array literals (`double precision[]`) directly to vector. Vectors must be passed as JSON string representations (`${JSON.stringify(targetEmbedding)}::vector`). Additionally, `Unsupported("vector(768)")` cannot be populated via `prisma.productEmbedding.create()`; it requires `prisma.$executeRaw`.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Essential SQL syntax requirement for `pgvector` operations in Prisma.
*   ***Proposed Edit:***
    *   Location: File 6 (`lib/db/vectors.ts`), line 451
    *   Change: Document that vector embeddings must be stringified before parameter injection (`${JSON.stringify(targetEmbedding)}::vector`), ensure `userAllergens` handles empty array safety, and document using `prisma.$executeRaw` for vector upserts.

---

### 4. Complete Absence of Test Framework, Runner, and Test Files in Verification Plan [`egm-implementation-readiness`] - Severity: Blocker
*   **Affected Scope:** [Lines 548-585](docs/designs/decode-v2-health-intelligence.md#L548-L585) (`Verification Plan`) & [Lines 409-538](docs/designs/decode-v2-health-intelligence.md#L409-L538) (`Target Files`)
*   **Discrepancy Description:** The Verification Plan details 5 programmatic test cases with DOM assertions and SQL checks, but the repository contains no test runner (`bun test`), testing dependencies (`@testing-library/react`), or test files in the Target Files list.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Concrete test runner configuration and dedicated test files are mandatory for reproducible verification.
*   ***Proposed Edit:***
    *   Location: File 1 (`package.json`) and Target Files list
    *   Change: Add `@testing-library/react` and happy-dom to devDependencies with `"test": "bun test"`. Add Files 18, 19, and 20 to Target Files: `tests/unit/guardrails.test.ts`, `tests/integration/vectors.test.ts`, and `tests/components/bento-scan-header.test.tsx`.

---

### 5. Missing API Key Mapping and Embedding Model Configuration in `lib/ai.ts` [`egm-codebase-details`] - Severity: Blocker
*   **Affected Scope:** [Lines 442-447](docs/designs/decode-v2-health-intelligence.md#L442-L447) (`lib/ai.ts`) & [Lines 448-454](docs/designs/decode-v2-health-intelligence.md#L448-L454) (`lib/db/vectors.ts`)
*   **Discrepancy Description:** `@ai-sdk/google` defaults to `GOOGLE_GENERATIVE_AI_API_KEY`, but Decode uses `GEMINIAI_API_KEY`. Furthermore, vector operations require 768-dimensional text embeddings, but `lib/ai.ts` fails to export the embedding model (`google.textEmbeddingModel('text-embedding-004')`).
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Required for both authentication backward-compatibility and vector generation.
*   ***Proposed Edit:***
    *   Location: File 5 (`lib/ai.ts`), line 445
    *   Change: Configure fallback resolution `apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINIAI_API_KEY` and export `embeddingModel = google.textEmbeddingModel('text-embedding-004')`.

---

### 6. Missing Schema Fields for Allergen Overrides and Citations in `ScanResultSchema` [`egm-codebase-details`] - Severity: Major
*   **Affected Scope:** [Lines 433-441](docs/designs/decode-v2-health-intelligence.md#L433-L441) (`lib/schemas.ts`)
*   **Discrepancy Description:** `app/api/scan/route.ts` attaches `allergenConflict` flags and toxicological citations to ingredients, but `ScanResultSchema` in `lib/schemas.ts` was not updated to reflect these optional fields, causing type/serialization mismatch.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Guarantees TypeScript and Zod schema alignment across server responses and client consumption.
*   ***Proposed Edit:***
    *   Location: File 4 (`lib/schemas.ts`), line 437
    *   Change: Add `allergenConflict: z.boolean().optional()` and `citation: z.object({...}).optional()` to `IngredientAnalysisSchema` and `ScanResultSchema`.

---

### 7. Multimodal Payload Incompatibility in `app/api/scan/route.ts` with Vercel AI SDK [`egm-codebase-details`] - Severity: Major
*   **Affected Scope:** [Lines 463-470](docs/designs/decode-v2-health-intelligence.md#L463-L470) (`app/api/scan/route.ts`)
*   **Discrepancy Description:** In Vercel AI SDK, images cannot be passed as raw string templates; they must be structured content parts (`content: [{ type: 'text', text }, { type: 'image', image: cleanBase64 }]`).
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Essential for preserving packaging photo scan functionality under Vercel AI SDK.
*   ***Proposed Edit:***
    *   Location: File 8 (`app/api/scan/route.ts`), line 466
    *   Change: Specify the structured multimodal message format for `generateObject` when handling photo inputs.

---

### 8. Asynchronous Turn Persistence Flaw in Streaming Route (`app/api/chat/guru/route.ts`) [`egm-implementation-readiness`] - Severity: Major
*   **Affected Scope:** [Lines 471-484](docs/designs/decode-v2-health-intelligence.md#L471-L484) (`app/api/chat/guru/route.ts`)
*   **Discrepancy Description:** Awaiting message persistence before returning `toDataStreamResponse()` blocks initial token streaming. Attempting persistence after returning the response without lifecycle hooks risks unhandled execution drops.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Ensures non-blocking token streaming (<400ms TTFB) with guaranteed turn persistence upon stream completion.
*   ***Proposed Edit:***
    *   Location: File 9 (`app/api/chat/guru/route.ts`), line 483
    *   Change: Specify that database persistence to `ChatMessage` executes inside the `onFinish({ text, toolCalls, toolResults })` callback of `streamText`.

---

### 9. Missing Database Migration Baselining Strategy for `0_enable_pgvector` [`egm-implementation-readiness`] - Severity: Major
*   **Affected Scope:** [Lines 428-432](docs/designs/decode-v2-health-intelligence.md#L428-L432) (`prisma/migrations/0_enable_pgvector/migration.sql`)
*   **Discrepancy Description:** Creating a migration folder in a repository previously managed via `prisma db push` risks `prisma migrate dev` triggering a destructive schema reset.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Protects development and production tables from accidental dropping.
*   ***Proposed Edit:***
    *   Location: File 3 (`prisma/migrations/...`), line 431
    *   Change: Document using `bunx prisma db execute --file prisma/migrations/0_enable_pgvector/migration.sql` or `bunx prisma migrate resolve --applied 0_enable_pgvector` to baseline without schema drops.

---

### 10. Unspecified Dynamic Tool Parameter Schemas and Message Truncation Boundaries [`egm-implementation-readiness`] - Severity: Major
*   **Affected Scope:** [Lines 477-482](docs/designs/decode-v2-health-intelligence.md#L477-L482) (`app/api/chat/guru/route.ts`)
*   **Discrepancy Description:** The 4 dynamic tools for Health Guru lack explicit Zod parameter schemas, and slicing messages (`messages.slice(-6)`) risks truncating the system instruction prompt.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Eliminates tool execution ambiguity and protects system prompt guardrails.
*   ***Proposed Edit:***
    *   Location: File 9 (`app/api/chat/guru/route.ts`), line 480
    *   Change: Define Zod parameter schemas for all 4 tools and document message sanitization that pins the system prompt at index 0 while sliding the latest 6 user/assistant messages.

---

### 11. Scan Persistence Helper (`persistScan`) Omission for `profileId` Linkage [`egm-codebase-details`] - Severity: Major
*   **Affected Scope:** [Lines 463-470](docs/designs/decode-v2-health-intelligence.md#L463-L470) (`app/api/scan/route.ts`)
*   **Discrepancy Description:** `app/api/scan/route.ts` persists scans via an internal `persistScan` helper. The plan omits updating `persistScan` to accept `userProfile.id`, leaving all new scans with `profileId = null`.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Guarantees that new scans are properly attributed to user profiles in the database.
*   ***Proposed Edit:***
    *   Location: File 8 (`app/api/scan/route.ts`), line 467
    *   Change: Update `persistScan` parameter list and Prisma create payload to record `profileId: userProfile?.id || null`.

---

### 12. Component and File Naming Inconsistency (`BentoScanHeader` vs `bento-header.tsx`) [`egm-style`] - Severity: Nit
*   **Affected Scope:** [Line 491](docs/designs/decode-v2-health-intelligence.md#L491) & [Line 515](docs/designs/decode-v2-health-intelligence.md#L515)
*   **Discrepancy Description:** File path is declared as `components/bento-header.tsx` but referred to as `BentoScanHeader`.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Standardizes component file naming with repository conventions.
*   ***Proposed Edit:***
    *   Location: File 11, line 491
    *   Change: Standardize file path to `components/bento-scan-header.tsx` with exported identifier `BentoScanHeader`.

---

### 13. Icon Library Misalignment in New UI Components [`egm-style`] - Severity: Nit
*   **Affected Scope:** [Lines 491-518](docs/designs/decode-v2-health-intelligence.md#L491-L518) (`components/`)
*   **Discrepancy Description:** Existing `components/dashboard.tsx` exclusively uses `@phosphor-icons/react`.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Maintains consistent iconography across the application.
*   ***Proposed Edit:***
    *   Location: Files 11, 12, 13
    *   Change: Explicitly prescribe importing iconography exclusively from `@phosphor-icons/react`.

---

### 14. Undefined Dialog Primitive for Household Member Status Bar Modal [`egm-style`] - Severity: Nit
*   **Affected Scope:** [Line 502](docs/designs/decode-v2-health-intelligence.md#L502) (`components/household-status-bar.tsx`)
*   **Discrepancy Description:** Modal behavior on avatar clicks lacks an explicit UI primitive.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Prevents ad-hoc dialog implementations.
*   ***Proposed Edit:***
    *   Location: File 12, line 502
    *   Change: Specify using `@base-ui/react` dialog primitives for the household member breakdown modal.

---

### 15. Ambiguous Response Format for Out-of-Domain Guru Refusal [`egm-style`] - Severity: Nit
*   **Affected Scope:** [Line 475](docs/designs/decode-v2-health-intelligence.md#L475) (`app/api/chat/guru/route.ts`)
*   **Discrepancy Description:** Client `useChat` hook expects Vercel AI SDK streaming protocol chunks; returning a raw string causes parse errors.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Guarantees seamless refusal rendering in `useChat`.
*   ***Proposed Edit:***
    *   Location: File 9, line 475
    *   Change: Specify formatting Tier 1 refusals as AI SDK data stream chunks or `streamText` refusal to ensure flawless client rendering.
