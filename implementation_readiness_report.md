# Audit Report: Implementation Readiness & Verification Plan

**Target:** `docs/designs/decode-v2-health-intelligence.md` (`lines 407-588`)
**Document Standard:** `resources/document_standards/implementation-readiness-standard.md`
**Report File:** `implementation_readiness_report.md`

## Reviewer Status

| Reviewer | Status |
| --- | --- |
| `egm-implementation-readiness` | completed |
| `egm-codebase-details` | completed |
| `egm-style` | completed |

## Severity Breakdown
- 🔴 **Blocker**: 5
- 🟡 **Major**: 6
- 🟢 **Nit**: 4
- **Total Findings**: 15

---

## Prioritized Findings (Blockers -> Major -> Nits)

### 1. Missing `@ai-sdk/react` Dependency for Client-Side Streaming Drawer - Severity: Blocker
* **Reviewer Lens:** `egm-codebase-details`
* **Affected Scope:** Lines 411–417 (`package.json`) & Lines 504–511 (`components/guru-chat-drawer.tsx`)
* **Discrepancy Description**: The proposed changes to `package.json` only list adding `@ai-sdk/google` and `ai`. However, File 13 (`components/guru-chat-drawer.tsx`, line 507) explicitly relies on `useChat` from `@ai-sdk/react`. In the Vercel AI SDK architecture, React client hooks (`useChat`, `useCompletion`, `useAssistant`) are distributed exclusively in `@ai-sdk/react`, not the core `ai` or `@ai-sdk/google` packages. Omitting `@ai-sdk/react` from `package.json` causes immediate module resolution failure (`Cannot find module '@ai-sdk/react'`) during Next.js compilation and build.
* **Rationale & Recommendation**: Update File 1 (`package.json`) in the Target Files list to explicitly include `@ai-sdk/react` under proposed dependencies alongside `ai` and `@ai-sdk/google`.

---

### 2. Incomplete Prisma Relational Definitions on Existing `User` and `ToxicologyMonograph` Models - Severity: Blocker
* **Reviewer Lens:** `egm-codebase-details`
* **Affected Scope:** Lines 418–427 (`prisma/schema.prisma`)
* **Discrepancy Description**: The plan specifies adding `UserProfile` (with `user User @relation(...)`), `ChatSession` (with `user User @relation(...)`), updating `Ingredient` (with foreign key `citationId` to `ToxicologyMonograph`), and updating `Scan` (with foreign key `profileId` to `UserProfile`). In Prisma schemas, relation fields are strictly bidirectional:
  1. If `UserProfile` references `User`, the `User` model in `prisma/schema.prisma` (lines 31–38) MUST define `profile UserProfile?`.
  2. If `ChatSession` references `User`, `User` MUST define `chatSessions ChatSession[]`.
  3. If `Ingredient` has `citationId` referencing `ToxicologyMonograph`, `ToxicologyMonograph` MUST define `ingredients Ingredient[]`.
  4. If `Scan` has `profileId` referencing `UserProfile`, `UserProfile` MUST define `scans Scan[]`.
  The plan omits updating `User` and `ToxicologyMonograph`. Running `prisma validate` or `prisma generate` will immediately throw relation validation errors (`The relation field 'user' on model 'UserProfile' references model 'User', but no corresponding opposite relation field exists on 'User'`).
* **Rationale & Recommendation**: Explicitly document the mandatory opposite relation fields to be added to `User` (`profile UserProfile?`, `chatSessions ChatSession[]`), `ToxicologyMonograph` (`ingredients Ingredient[]`), and `UserProfile` (`scans Scan[]`) in the Target Files description for `prisma/schema.prisma`.

---

### 3. Prisma Parameterization & Type Serialization Failure in `pgvector` Raw SQL - Severity: Blocker
* **Reviewer Lens:** `egm-codebase-details`
* **Affected Scope:** Lines 448–454 (`lib/db/vectors.ts`) & Architecture Lines 251–261
* **Discrepancy Description**: The plan specifies parameterized raw SQL in `lib/db/vectors.ts` via `prisma.$queryRaw`:
  ```sql
  embedding <=> ${targetEmbedding}::vector AS distance
  WHERE category = ${category}
    AND "purityScore" >= 8.5
    AND NOT (allergens && ${userAllergens}::text[])
  ```
  In PostgreSQL with Prisma Client and `@prisma/adapter-pg`, passing a JavaScript `number[]` array to `${targetEmbedding}::vector` causes an immediate PostgreSQL execution error because Prisma serializes JS arrays into PostgreSQL array literals (`$1 = ARRAY[...]`), and PostgreSQL does NOT support casting array literals directly to vector (`cannot cast type double precision[] to vector`). In `pgvector`, vectors must be passed either as string representations (`${JSON.stringify(targetEmbedding)}::vector` / `'[0.12, 0.34, ...]'::vector`) or via explicit Prisma raw string fragments. Furthermore, because `Unsupported("vector(768)")` cannot be populated via standard Prisma Client model mutations, `upsertProductEmbedding` will fail if attempted via `prisma.productEmbedding.create()`.
* **Rationale & Recommendation**: Document in File 6 that vector embeddings must be stringified before parameter injection (`${JSON.stringify(targetEmbedding)}::vector`), ensure `userAllergens` handles empty array edge cases safely (`${userAllergens.length > 0 ? userAllergens : []}::text[]`), and specify that `upsertProductEmbedding` must use `prisma.$executeRaw` with explicit SQL vector casting instead of Prisma model methods.

---

### 4. Complete Absence of Test Framework, Runner, and Test Files in Verification Plan - Severity: Blocker
* **Reviewer Lens:** `egm-implementation-readiness`
* **Affected Scope:** Lines 548–585 (`Verification Plan > 2. Functional & Safety Verification`) & Lines 409–538 (`Target Files`)
* **Discrepancy Description**: Section 2 of the Verification Plan defines 5 programmatic test cases with DOM assertions ("High-contrast ⛔ ALLERGEN CONFLICT banner is rendered in bold red"), SQL execution plan checks (`EXPLAIN ANALYZE`), latency ceilings ("<50ms"), and query log inspections. However:
  1. `package.json` contains no test runner or testing dependencies (no `bun:test`, `vitest`, `playwright`, `jest`, or `@testing-library/react`), and no `test` script in `scripts`.
  2. Zero test files or test directories are listed in the Target Files section (e.g. `tests/guardrails.test.ts`, `tests/vectors.test.ts`, `tests/components/bento-header.test.tsx`).
  3. `bunx tsc --noEmit` and `bun run build` only verify type validity and Next.js bundle compilation; they execute zero test assertions.
  Without test framework configuration and concrete test files, the entire Functional & Safety Verification plan is unexecutable, unverifiable, and non-reproducible.
* **Rationale & Recommendation**: Add testing dependencies (`vitest` or `bun:test` and `@testing-library/react`) to `package.json` devDependencies with a `"test": "bun test"` script. Add dedicated test files to the Target Files list (e.g., `tests/unit/guardrails.test.ts`, `tests/integration/vectors.test.ts`, `tests/components/bento-header.test.tsx`), and detail automated assertion commands for all 5 test cases.

---

### 5. Missing API Key Mapping and Embedding Model Configuration in `lib/ai.ts` - Severity: Blocker
* **Reviewer Lens:** `egm-codebase-details`
* **Affected Scope:** Lines 442–447 (`lib/ai.ts`) & Lines 448–454 (`lib/db/vectors.ts`)
* **Discrepancy Description**:
  1. The existing codebase in `lib/ai.ts` reads `process.env.GEMINIAI_API_KEY`. The Vercel AI SDK Google provider (`@ai-sdk/google`) expects `process.env.GOOGLE_GENERATIVE_AI_API_KEY` by default. File 5 instructs replacing `GoogleGenAI` with `createGoogleGenerativeAI`, but fails to document mapping `apiKey: process.env.GEMINIAI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY`. Without this, runtime AI calls will fail with missing API credential errors.
  2. `findCleanerSwaps`, `searchToxicologyVector`, and `upsertProductEmbedding` (File 6) require generating 768-dimensional text embeddings (`text-embedding-004`). File 5 states `lib/ai.ts` will "Export configured model instances for fast classification (gemini-2.5-flash) and structured generation", completely failing to export the text embedding model (`google.textEmbeddingModel('text-embedding-004')`). Vector retrieval cannot function without an exported embedding model.
* **Rationale & Recommendation**: Update File 5 to explicitly configure key fallback resolution (`apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINIAI_API_KEY`) and export `textEmbeddingModel('text-embedding-004')` alongside generative models.

---

### 6. Missing Schema Fields for Allergen Overrides and Citations in `ScanResultSchema` - Severity: Major
* **Reviewer Lens:** `egm-codebase-details` / `egm-implementation-readiness`
* **Affected Scope:** Lines 433–441 (`lib/schemas.ts`) & Lines 463–470 (`app/api/scan/route.ts`)
* **Discrepancy Description**: File 8 states that `app/api/scan/route.ts` will cross-reference extracted ingredients against user allergens to attach `allergenConflict` flags and join `Ingredient.citationId` to attach authoritative regulatory citations. However, File 4 (`lib/schemas.ts`) does not list modifying `ScanResultSchema` or `IngredientAnalysisSchema` to include `allergenConflict: z.boolean().optional()` or `citation: z.object({...}).optional()`. If `generateObject` validates against `ScanResultSchema` or if the route returns validated data, missing schema fields will cause schema validation failures or strip the newly joined data.
* **Rationale & Recommendation**: Add explicit updates to `ScanResultSchema` and `IngredientAnalysisSchema` in `lib/schemas.ts` defining `allergenConflict?: boolean` and `citation?: ToxicologyCitationSchema`. Clarify in File 8 that `generateObject` extracts the base ingredient analysis, and post-LLM TypeScript logic enriches the result with allergen conflict flags and database citation joins before serialization.

---

### 7. Multimodal Payload Incompatibility in `app/api/scan/route.ts` with Vercel AI SDK - Severity: Major
* **Reviewer Lens:** `egm-codebase-details`
* **Affected Scope:** Lines 463–470 (`app/api/scan/route.ts`) & Architecture Lines 121–130
* **Discrepancy Description**: Existing `app/api/scan/route.ts` supports photo scanning (`inputType === 'photo'`), extracting base64 image strings and mime types. In the implementation plan (File 8 and Line 123), `generateObject` is only shown accepting a string `interactionInput`: `messages: [{ role: 'user', content: interactionInput }]`. In Vercel AI SDK, images cannot be passed as raw markdown or string templates; they must be structured as content parts: `content: [{ type: 'text', text: ... }, { type: 'image', image: cleanBase64 }]` (or `Buffer`). Omitting multimodal message construction in the migration plan leaves the photo scanning workflow broken.
* **Rationale & Recommendation**: Specify the explicit multimodal message construction pattern for `generateObject` in File 8 when handling photo inputs (`type: 'image', image: cleanBase64, mimeType: validMime`).

---

### 8. Asynchronous Turn Persistence Flaw in Streaming Route (`app/api/chat/guru/route.ts`) - Severity: Major
* **Reviewer Lens:** `egm-implementation-readiness`
* **Affected Scope:** Lines 471–484 (`app/api/chat/guru/route.ts`)
* **Discrepancy Description**: File 9 states: "Return streaming HTTP response via `toDataStreamResponse()`. Persist completed turns to `ChatMessage` in Postgres." In Next.js streaming route handlers, returning `toDataStreamResponse()` transmits chunks immediately to the client. Awaiting message persistence in the route body before returning the response blocks token streaming, defeating the sub-400ms TTFB requirement. Conversely, attempting persistence after returning the response without using the SDK's lifecycle hook leads to unhandled promises or incomplete persistence.
* **Rationale & Recommendation**: Specify that message persistence to `ChatMessage` must execute inside the `onFinish({ text, toolCalls, toolResults })` callback of `streamText`, ensuring non-blocking token streaming and guaranteed database persistence upon stream completion.

---

### 9. Missing Database Migration Baselining Strategy for `0_enable_pgvector` - Severity: Major
* **Reviewer Lens:** `egm-implementation-readiness`
* **Affected Scope:** Lines 428–432 (`prisma/migrations/0_enable_pgvector/migration.sql`) & Line 416
* **Discrepancy Description**: The repository currently has no `prisma/migrations` folder and uses Prisma 7 with Supabase (previously operated via `db push`). Introducing a manual migration folder (`prisma/migrations/0_enable_pgvector/migration.sql`) without a documented migration baselining strategy will cause `bunx prisma migrate dev` to detect a migration history divergence and prompt to reset the database, which drops all existing development/staging tables.
* **Rationale & Recommendation**: Document the exact migration baseline procedure in the plan: run `bunx prisma migrate diff` or baseline existing tables using `bunx prisma migrate resolve --applied 0_enable_pgvector` or `bunx prisma db execute --file prisma/migrations/0_enable_pgvector/migration.sql` to ensure zero database loss.

---

### 10. Unspecified Dynamic Tool Parameter Schemas and Message Truncation Boundaries - Severity: Major
* **Reviewer Lens:** `egm-implementation-readiness`
* **Affected Scope:** Lines 477–482 (`app/api/chat/guru/route.ts`)
* **Discrepancy Description**: The plan lists 4 dynamic tools for the Health Guru agent (`getUserScanHistory`, `searchIngredientToxicology`, `findCleanSwaps`, `checkPersonalCompatibility`), but fails to specify their input parameters (`parameters: z.object({...})`), return contracts, or tool error boundaries. Additionally, while the plan specifies a "6-turn sliding window", it does not detail how message truncation preserves the system instruction prompt when slicing messages (`messages.slice(-6)`), risking loss of guardrails if the system prompt is inadvertently truncated.
* **Rationale & Recommendation**: Define explicit Zod parameter schemas for all 4 dynamic tools in File 9, and document the message sanitization function to guarantee that the system prompt is always retained at index 0 while the conversational message history is sliced to the latest 6 turns.

---

### 11. Scan Persistence Helper (`persistScan`) Omission for `profileId` Linkage - Severity: Major
* **Reviewer Lens:** `egm-codebase-details`
* **Affected Scope:** Line 425 (`prisma/schema.prisma`) & Lines 463–470 (`app/api/scan/route.ts`)
* **Discrepancy Description**: The plan modifies the `Scan` model to add `profileId String?` (line 425) and retrieves the authenticated user's `UserProfile` in `/api/scan` (line 467). However, `app/api/scan/route.ts` currently persists scans via an internal function `persistScan(user, fallbackInput, inputType, result, productName)` (line 250). The plan does not update the `persistScan` invocation or implementation to accept and store `userProfile.id`, causing all new scans to continue recording `profileId = null`.
* **Rationale & Recommendation**: Explicitly update File 8 (`app/api/scan/route.ts`) to pass `userProfile.id` into `persistScan` and update `persistScan` to write `profileId` to the `Scan` record in Prisma.

---

### 12. Component and File Naming Inconsistency (`BentoScanHeader` vs `bento-header.tsx`) - Severity: Nit
* **Reviewer Lens:** `egm-style`
* **Affected Scope:** Line 491 (`components/bento-header.tsx`), Line 515 (`components/dashboard.tsx`), and Line 330
* **Discrepancy Description**: File 11 is declared as `components/bento-header.tsx`, but line 515 refers to integrating `BentoScanHeader`, and line 330 designates it as `BentoScanHeader`. In the existing repository, component files match their exported component name in kebab-case (e.g., `household-status-bar.tsx` -> `HouseholdStatusBar`).
* **Rationale & Recommendation**: Standardize the file path to `components/bento-scan-header.tsx` with exported identifier `BentoScanHeader`.

---

### 13. Icon Library Misalignment in New UI Components - Severity: Nit
* **Reviewer Lens:** `egm-style` / `egm-codebase-details`
* **Affected Scope:** Lines 491–518 (`components/`) & `package.json`
* **Discrepancy Description**: `package.json` contains both `@phosphor-icons/react` and `lucide-react`. The existing `components/dashboard.tsx` exclusively uses `@phosphor-icons/react` (`Scan`, `Warning`, `ShieldCheck`, `ChartLineUp`, `CaretDown`). The plan does not state which icon library the new components (`bento-header.tsx`, `household-status-bar.tsx`, `guru-chat-drawer.tsx`) must import from, risking visual inconsistency across iconography.
* **Rationale & Recommendation**: Explicitly prescribe `@phosphor-icons/react` for all new UI components to maintain visual coherence with `dashboard.tsx`.

---

### 14. Undefined Dialog Primitive for Household Member Status Bar Modal - Severity: Nit
* **Reviewer Lens:** `egm-style`
* **Affected Scope:** Line 502 (`components/household-status-bar.tsx`)
* **Discrepancy Description**: Line 502 states: "Clicking a member avatar toggles their specific allergen breakdown in an interactive modal." The plan does not designate which UI primitive handles this dialog (e.g. Radix Dialog, `@base-ui/react`, or custom Tailwind overlay), leaving component structure open to ad-hoc implementation.
* **Rationale & Recommendation**: Specify the dialog primitive (e.g. `components/ui/dialog.tsx` or `@base-ui/react` dialog) in the component specification.

---

### 15. Ambiguous Response Format for Out-of-Domain Guru Refusal - Severity: Nit
* **Reviewer Lens:** `egm-style` / `egm-implementation-readiness`
* **Affected Scope:** Line 475 (`app/api/chat/guru/route.ts`) & Line 568 (`Test Case 3`)
* **Discrepancy Description**: Line 475 states: "Run Tier 1 validateHealthDomain(prompt). Return 200 with polite refusal if out-of-domain." If the client uses `useChat` from `@ai-sdk/react`, returning a plain JSON response or raw string on an endpoint consumed by `useChat` can cause client parsing errors. It should clarify whether the refusal is streamed via `toDataStreamResponse()` or returned as a structured AI SDK stream message.
* **Rationale & Recommendation**: Specify that out-of-domain refusals are returned using `Response` formatted with Vercel AI SDK text stream markers or `streamText` refusal to ensure flawless client rendering via `useChat`.
