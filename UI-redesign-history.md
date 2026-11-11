# UI Redesign Plan — Decode Exposure Profile & History (`/history`)

> Status: ready-for-review · Mode: redesign · Area: Exposure Profile & Scan Archive (`/history`) · Owner: Design Lead · Date: 11/11/2026 · Stack: Next.js 16 (App Router) + Tailwind CSS v4 + Motion + Phosphor Icons

---

## 0. Brief

* **Surface**: Health Analytics & Exposure History (`/history`).
* **Primary Users**: Everyday consumers, bio-hackers, and parents tracking cumulative chemical additive exposure over time across food and medicine purchases.
* **Optimises For**: Instant macro-level health clarity (Total Scans, Clean Ratio %, Top Recurring Risks), effortless temporal tracking, and frictionless inspection of full biochemical scan reports.
* **Personality**: **Editorial Modern Wellness** — Apple Health-inspired serenity, warm-stone obsidian canvas (`#0b0c0e`), soft parchment typography, tactile bento metric cards, and jade/amber/rose semantic risk indicators.
* **Colour Roles**:
  * Canvas: `#0b0c0e` (warm-stone obsidian)
  * Elevated Bento Cards: `#131518` (warm elevated zinc)
  * Raised Highlighting Surface: `#1a1d22`
  * Borders: Hairline `rgba(255, 255, 255, 0.07)`
  * State Accents: Jade (`#34d399` for clean/low-risk), Amber (`#fbbf24` for moderate additives), Rose (`#f87171` for high-concern compounds).
* **Density**: Balanced spacious bento metrics on desktop; natural single-column flow on mobile.
* **Type Pairing**: **Outfit** (headings, metric values, and card titles) paired with **Inter** (body copy, timestamps, and biochemical descriptors).
* **Motion Stance**: Gentle Apple-style springs (`stiffness: 260, damping: 28`), subtle hover lifts (`active:scale-[0.98]`), and strict reduced-motion fallbacks.
* **Effects Source**: Native Tailwind v4 + Motion choreography. Single icon family: `@phosphor-icons/react`.

---

## 1. Context and Constraints

* **Product & Audience**: Decode is an AI biochemical scanner. `/history` is the place where users review their cumulative exposure drift over time.
* **Primary Job of This Screen**:
  1. Present high-level telemetry on past consumption habits (How many products scanned? What percentage are clean? What is the single most common additive?).
  2. Display the ranked list of cumulative additive exposures with risk levels and recurrence counts.
  3. Archive all past scans with immediate 1-click access to the complete multimodal report (including the Holistic Safety Dial, ingredients, and counter-nutritional recommendations).
* **Success Signal**: In under 5 seconds, the user identifies their top dietary risk factor and reviews past product scores without feeling overwhelmed by spreadsheet-like tables.
* **Hard Constraints**:
  - Must run cleanly on Next.js 16 App Router, React 19, and Tailwind CSS v4.
  - Server Component data fetching must preserve existing Prisma schema models (`Scan`, `ScanIngredient`, `ExposureTracking`, `Ingredient`).
  - Strict icon unification: replace legacy `lucide-react` icons with `@phosphor-icons/react`.
  - Zero disruption to authenticated sessions and user scoping (`where: { userId: user.id }`).
* **Assumptions Recorded**:
  1. The user confirmed preference for a **Bento Overview** (Top Telemetry Metrics + Split Columns) and a **Slide-Over / Dialog Modal** with the Holistic Safety Dial.
  2. The page should compute real telemetry from existing Prisma queries (total scans count, clean scans percentage, high-risk flags count, and top recurrent ingredient).
  3. All touch targets must adhere to $\ge 44 \times 44\text{px}$ accessibility standards.

---

## 2. Audit of Existing Implementation

### Inventory of What Exists
* **Page Route (`app/history/page.tsx`)**:
  - Async Server Component fetching user scans and exposures from Prisma.
  - Uses `lucide-react` (`Activity`, `History`) instead of `@phosphor-icons/react`.
  - Color palette relies on generic cold indigo (`bg-indigo-500/10 text-indigo-400`), clashing with the new warm-stone theme.
  - Two parallel cards with fixed `h-[500px]` `ScrollArea` containers.
* **Client Inspection Component (`components/history-client.tsx`)**:
  - Client component managing modal visibility and report reconstruction.
  - Scan cards have low visual hierarchy (small badge, plain text).
  - Modal report uses an old horizontal progress bar instead of the new circular Holistic Safety Dial.

### Evidence & Heuristic Findings
1. **Mobile Nested Scroll Trap**: The dual 500px fixed-height `ScrollArea` containers trap mobile swipe gestures, frustrating users trying to scroll down the page.
2. **Icon Family Inconsistency**: Mixing `lucide-react` and `@phosphor-icons/react` inflates bundle size and creates visual dissonance across page headers.
3. **No Macro Health Telemetry**: Users have no summary of their overall progress (e.g., Clean Product Ratio, Total Products Evaluated).
4. **Theme Fragmentation**: Harsh pitch-black and electric indigo contrast poorly with the serenity of the redesigned homepage.
5. **Modal Visual Degradation**: Opening a historical scan displays a legacy bar graph rather than the signature circular dial from the main scanner.

### Top 5 Worst Problems Ranked by User Cost
| Rank | Problem | User Impact | Fix Strategy |
|:---:|---|---|---|
| **1** | **Mobile Nested Scroll Trap** | Users on mobile cannot scroll past 500px cards without getting their touch gestures hijacked. | Remove fixed scroll bounds in favor of natural page flow with sticky column headers. |
| **2** | **Lack of Macro Health Telemetry** | Users must mentally aggregate individual cards to understand their overall health habits. | Add a 3-metric Bento Telemetry Bar: Total Products, Clean Ratio %, Top Recurring Additive. |
| **3** | **Visual Theme Drift** | Page looks like a separate legacy app using electric indigo on pitch black. | Harmonize with warm-stone obsidian (`#0b0c0e`, `#131518`), parchment typography, and jade accents. |
| **4** | **Legacy Report Modal** | Historical scan reports look dated compared to the live dashboard. | Upgrade modal to use the circular **Holistic Safety Dial**, jade/amber/rose badges, and bento cards. |
| **5** | **Icon Splintering** | `lucide-react` mixed with Phosphor adds unnecessary JavaScript and inconsistent stroke weights. | Standardize 100% on `@phosphor-icons/react`. |

### What to Keep vs. What to Retire
* **KEEP**:
  - Prisma server-side data fetching with authenticated user isolation.
  - Complete JSON report reconstruction logic for backward compatibility with existing scans.
  - The dual-list concept: Cumulative Exposure Rankings vs Recent Scans Log.
* **RETIRE**:
  - `lucide-react` imports (`Activity`, `History`).
  - Fixed-height `h-[500px]` scroll traps.
  - Generic electric indigo color scheme.
  - Legacy horizontal score progress bar inside the modal.

---

## 3. Design Direction: Editorial Modern Wellness

### Thesis
A serene health analytics console inspired by Apple Health and modern longevity dashboards: high-altitude telemetry at the top, clear exposure rankings on the left, and an interactive scan log on the right.

### The Signature Move
**The Exposure Telemetry Bento & Living Historical Inspection**:
* Top telemetry row calculating the user's real **Clean Ratio %** and **Top Chronic Additive**.
* An interactive Historical Scan Report modal featuring the animated **Holistic Safety Dial**, complete chemical origins, and dietary counter-nutrients.

### Tone in Three Words
**Serene · Analytical · Actionable**

---

## 4. Foundations & Design Tokens

### Type Scale (Outfit + Inter)
* **Display / Hero**: `Outfit Bold`, `32px - 44px`, tracking `-0.025em`.
* **Telemetry Value**: `Outfit Bold`, `28px`, tracking `-0.02em`.
* **Section Title**: `Outfit SemiBold`, `16px - 18px`.
* **Body / Descriptors**: `Inter Regular`, `14px`, line-height `1.55`.
* **Metadata & Badges**: `Inter Medium`, `11px - 12px`, uppercase tracking `+0.04em`.

### Spacing & Grid
* Max container width: `max-w-6xl mx-auto`.
* Grid: 12-column responsive layout (12 cols on desktop $\ge 1024\text{px}$; single stacked column on mobile $< 1024\text{px}$).
* Card padding: `24px` (`p-6`) on desktop, `16px` (`p-4`) on mobile.

### Colour Roles
* **Canvas**: `#0b0c0e`
* **Surface Card**: `#131518`
* **Surface Raised**: `#1a1d22`
* **Borders**: Hairline `rgba(255, 255, 255, 0.07)`
* **Text**: Primary `#f4f4f5`, Secondary `#a1a1aa`, Muted `#71717a`
* **Status**: Clean Jade (`#34d399`), Honey Amber (`#fbbf24`), Terracotta Rose (`#f87171`)

---

## 5. Screen Specifications: `/history`

### Layout Structure
1. **Global Navigation**: `<Navbar />` with warm obsidian glass and route active indicators.
2. **Page Header**:
   - Eyebrow badge: `✨ Cumulative Health Analytics`.
   - Title: `Your Exposure Profile`.
   - Subtitle: Clear explanation of chronic additive accumulation.
3. **Top Macro Telemetry Bar (3 Bento Cards)**:
   - Card 1: **Total Products Decoded** (e.g. `24` with trend pill).
   - Card 2: **Clean Product Ratio** (percentage of scans scoring $\ge 7.0$).
   - Card 3: **Top Chronic Risk** (the #1 high-risk additive encountered most frequently).
4. **Main Content Split (12 Columns)**:
   - **Left Column (5 Cols) — Chronic Additive Rankings**:
     - Ranked list of tracked ingredients ordered by `exposureCount`.
     - Risk pill indicator (High, Moderate, Clean).
     - Recurrence frequency tag (`Nx logged`).
     - Product count and origin metadata.
     - Empty state with educational prompt if no exposures recorded.
   - **Right Column (7 Cols) — Recent Scans Timeline**:
     - Chronological list of scanned products.
     - Modality pill: `📸 Camera`, `🏷️ Barcode`, or `✍️ Text`.
     - Overall safety score badge with color-coded border.
     - Summary excerpt with plain-English takeaway.
     - "Inspect Report" button opening the Modal.
5. **Report Inspection Modal**:
   - Clean backdrop blur (`bg-[#0b0c0e]/80`).
   - Radial **Holistic Safety Dial** with score and safety tier.
   - Executive summary and concern breakdown counts.
   - Comprehensive ingredient accordion with pros, cons, long-term exposure, and dietary neutralizing actions.

---

## 6. Component Inventory & State Matrix

| Component | Nature | Default | Hover | Focus-Visible | Active | Empty State | Error / Loading |
|---|---|---|---|---|---|---|---|
| **TelemetryCard** | New | `#131518`, `white/7` border | Border `white/12` | Focus ring | Scale `0.99` | Shows `--` / `0` | Skeleton shimmer |
| **ExposureItem** | Enhanced | `#0b0c0e/60`, risk left border | Border `white/10` | 2px emerald ring | Background tint | "No additives logged" | — |
| **ScanTimelineCard** | Enhanced | `#0b0c0e/60`, rounded-2xl | Border `white/12` | Tab focus ring | Scale `0.98` | "No scans yet" | — |
| **InspectionModal** | Enhanced | Centered dialog, `#131518` | — | Focus trapped | ESC dismiss | — | Fallback report |
| **SafetyDial** | Reused | SVG circle with animated fill | — | — | — | Grey track | Red tier warning |

---

## 7. Responsive Behaviour

* **Desktop ($\ge 1024\text{px}$)**: 3-column telemetry row; asymmetric 5/7 split for Exposures vs Recent Scans.
* **Tablet ($768\text{px} - 1023\text{px}$)**: 3-column telemetry row; stacked full-width sections for Exposures and Scans.
* **Mobile ($< 768\text{px}$)**: Single-column telemetry scroll or 1-col stack; natural vertical scrolling with zero gesture traps; full-screen modal sheet with easy-tap dismiss button.

---

## 8. Accessibility & Compliance

* **Contrast**: Meets WCAG 2.1 AA (`>= 4.5:1` for all text on `#0b0c0e` and `#131518`).
* **Keyboard Navigation**:
  - Modal traps focus and closes via `Escape` key.
  - Scan inspect buttons accessible via `Tab` and triggered with `Enter`.
* **Touch Targets**: Minimum hit area of $44 \times 44\text{px}$ for modal close and inspect buttons.
* **Reduced Motion**: Disables positional modal slides in favor of instant opacity transitions.

---

## 9. Performance Budget

* **LCP**: $< 1.1\text{s}$ (Server-rendered HTML with pre-computed telemetry).
* **CLS**: `0.00` (fixed metric container heights).
* **Bundle Impact**: Zero net additions (removes `lucide-react` from history bundle).

---

## 10. Phased Implementation Plan

```text
Phase 1: Update Server Component (app/history/page.tsx)
  ├── Calculate macro telemetry metrics server-side (Total Scans, Clean %, Top Chronic Risk)
  ├── Remove lucide-react in favor of @phosphor-icons/react
  ├── Replace 500px scroll traps with natural-flow containers
  └── Apply warm-stone obsidian foundations (#0b0c0e, #131518)

Phase 2: Redesign Client Timeline & Modal (components/history-client.tsx)
  ├── Redesign scan timeline items with modality tags (Camera, Barcode, Text)
  ├── Integrate the Holistic Safety Dial into the report modal
  ├── Rebuild modal dialog with warm-stone obsidian backdrop and bento containers
  └── Add relative timestamp formatting ("Today", "Yesterday", "N days ago")

Phase 3: QA & Verification
  ├── Run ESLint (0 errors, 0 warnings)
  ├── Run Next.js production build verification
  └── Verify modal accessibility and responsive collapse
```

---

## 11. QA Checklist

- [x] Every component has all interactive states specified (hover, active, focus, disabled).
- [x] Clear empty states provided for both exposures and scans.
- [x] Single unified icon family (`@phosphor-icons/react`).
- [x] Contrast pairs meet WCAG AA standards.
- [x] Zero nested scroll traps on mobile devices.
- [x] Backward compatibility preserved with all existing scan database models.
