# UI Redesign Plan — Decode Homepage (Landing & Authenticated Dashboard)

> Status: ready-for-review · Mode: redesign · Area: Homepage (Public Landing `/landing` & Authenticated Dashboard `/`) · Owner: Design Lead · Date: 11/11/2026 · Stack: Next.js 16 (App Router) + Tailwind CSS v4 + Motion + Phosphor Icons

---

## 0. Brief

* **Surfaces**: Public Landing Page (`/landing`) and Authenticated Core Dashboard (`/`).
* **Primary Users**: Health-conscious shoppers, individuals with allergies/autoimmune conditions, parents, and bio-hackers seeking ingredient transparency without nutritional jargon.
* **Optimises For**: Instant comprehension, zero-friction label capture (Camera/Barcode/Text), and calm, authoritative health clarity.
* **Personality**: **Editorial Modern Wellness** — Apple Health-inspired serenity, warm-tinted dark surfaces (`#0c0d0e` base with subtle sepia/stone undertones), airy typographic hierarchy, and organic pill chips.
* **Colour Roles**: Deep obsidian/warm stone canvas, soft parchment text, jade/emerald state accents for clean ingredients, honey/amber for moderate flags, and terracotta/rose for high-risk additives.
* **Density**: Spacious and human in editorial sections; crisp, structured bento cards in data analysis.
* **Type Pairing**: **Outfit** (geometric, open, friendly display and headings) paired with **Inter** / system sans for body and micro-telemetry.
* **Motion Stance**: Gentle Apple-style springs (`stiffness: 260, damping: 28`), layout morphs via `layoutId`, and strict `@media (prefers-reduced-motion)` fallbacks.
* **Effects Source**: Native Tailwind v4 + Motion choreography. Zero external shader or heavy canvas libraries.

---

## 1. Context and Constraints

* **Product & Audience**: Decode is an AI-powered biochemical scanner and comparison platform. Users arrive either curious (on `/landing`) or in a hurry while grocery shopping on mobile (on `/`).
* **Primary Job of These Screens**:
  1. *Landing Page (`/landing`)*: Explain what Decode does in 5 seconds, demonstrate multimodal visual proof, and convert visitors into signed-in users with 1-click Google OAuth.
  2. *Authenticated Dashboard (`/`)*: Capture an ingredient label via camera photo, barcode, or text in under 3 taps, then present an unambiguous 0–10 safety rating with plain-English health guidance.
* **Success Signal**: A landing visitor signs in immediately; a dashboard user captures a product label and understands whether it is safe in < 3 seconds without deciphering chemical formulas.
* **Hard Constraints**:
  - Must run cleanly on Next.js 16 App Router, React 19, and Tailwind CSS v4.
  - Must strictly preserve all working backend endpoints (`/api/scan`, `/api/barcode`, `/api/compare`, `/auth/callback`).
  - Mobile camera capture (`capture="environment"`) and client canvas compression must remain instantaneous.
* **Assumptions Recorded**:
  1. Dark mode is the primary branded aesthetic; a warm-stone obsidian tone (`stone-950`/`zinc-950` blend) replaces cold generic grey.
  2. Google OAuth remains the sole authentication mechanism.
  3. Phosphor Icons is retained as the sole, unified icon family.

---

## 2. Audit of Existing Implementation

### Inventory of What Exists
* **Public Landing (`app/landing/page.tsx`)**:
  - Minimal sticky navbar with Google OAuth trigger.
  - Fullscreen hero with dimmed background image (`/hero.png`), static copy, and a centered CTA.
  - 4 static feature cards with arbitrary pastel icon backgrounds.
  - Hardcoded metrics ("2,000+ Ingredients", "< 10s Scan time", "3-stage AI").
  - Simple footer with copyright text.
* **Authenticated Dashboard (`components/dashboard.tsx`)**:
  - Monolithic 945-line client component combining text, camera, barcode, state management, and report presentation.
  - Tab switcher with pill styling.
  - Full-width input card with expandable textarea, drag-and-drop file dropzone, and barcode lookup input.
  - Bento results panel with safety score bar, summary card, and vertical ingredient accordion.
  - Empty state container with generic icon.

### Evidence & Heuristic Findings
1. **Invented Facts Violation**: The current landing page features fabricated marketing metrics ("2,000+ Ingredients in database", "< 10s Average scan time") which violate the *no invented statistics* standard.
2. **Feature Disconnect**: The landing page completely omits Decode's strongest recent features: **Live Camera Scanning**, **Barcode Catalog Lookup**, and **Decode Versus (Side-by-side comparison)**.
3. **No Interactive Proof on Landing**: Visitors must authenticate before seeing what a "Decoded" report actually looks like.
4. **Dashboard Layout Density & Mobile Strain**: On mobile screens, the dashboard's 420px fixed-height `ScrollArea` causes nested scroll conflicts inside mobile Safari/Chrome.
5. **Cold & Generic AI Aesthetic**: The heavy use of pitch-black `#09090b` with neon green `#10b981` creates an aggressive "hacker terminal" vibe rather than an approachable, trustworthy wellness companion.

### Top 5 Worst Problems Ranked by User Cost
| Rank | Problem | User Impact | Fix Strategy |
|:---:|---|---|---|
| **1** | **Landing Page Lacks Visual Proof** | Users bounce before signing in because they cannot see what a scan report looks like. | Embed an interactive, toggleable product breakdown preview directly in the landing hero. |
| **2** | **Omission of Core Capabilities** | Mobile users don't realize they can scan barcodes or snap live photos. | Introduce a 3-pillar feature showcase: Camera Vision, Barcode Lookup, and Product Comparison. |
| **3** | **Mobile Nested Scrolling Trap** | On smartphones, scrolling through 25 ingredients inside a fixed-height card traps user gestures. | Transition to natural page flow on mobile with sticky quick-jump category chips. |
| **4** | **Cold Terminal Vibe vs Wellness Tone** | Harsh neon-on-black looks intimidating for parents and health seekers. | Migrate to warm obsidian surfaces, soft parchment typography, and jade/terracotta status accents. |
| **5** | **Monolithic Dashboard Structure** | 945 lines in one file makes maintenance and state isolation brittle. | Deconstruct into modular sub-components: `ScanInputBar`, `SafetyGauge`, `IngredientBentoCard`, `BarcodeSheet`. |

### What to Keep vs. What to Retire
* **KEEP**:
  - Zero-latency client canvas image downsampling (`1200px`, `0.85` JPEG).
  - OpenFoodFacts barcode lookup with 1-click fallback to camera scan.
  - Phosphor icon family.
  - The 0–10 overall score and risk tiering logic (High, Moderate, Low).
  - Direct 1-click Google OAuth authentication flow.
* **RETIRE**:
  - Fake/unverified statistics on the landing page.
  - Hardcoded fixed-height `h-[420px]` scroll areas that cause mobile scroll hijacking.
  - Generic pitch-black neon terminal styling.
  - Monolithic component architecture.

---

## 3. Design Direction: Editorial Modern Wellness

### Thesis
A serene, authoritative health companion that treats ingredients not like toxic code to be debugged, but like human nutrition to be understood. High typographic clarity, warm stone surfaces, and calm visual density.

### The Signature Move
**The Dual-State Living Label**:
* On the Landing Page: An interactive hero showcase card displaying a real packaged item (e.g., *Oat Milk* or *Energy Bar*) with an interactive slider/toggle that peels away the glossy marketing packaging to reveal the decoded biochemical reality beneath.
* On the Dashboard: A tactile circular **Holistic Safety Ring** with animated score fill, accompanied by quick-filter category pills (*Preservatives*, *Sweeteners*, *Clean Essentials*).

### Tone in Three Words
**Serene · Authoritative · Transparent**

### Directions Considered
| Direction | Thesis | Optimises For | Cost | Verdict |
|---|---|---|---|---|
| **Editorial Modern Wellness (Chosen)** | Warm-tinted obsidian, airy typography, organic pill chips, Apple Health serenity. | Trust, approachability, and daily lifestyle adoption. | Requires precise typographic pairing and subtle color balance. | **Selected** — Best aligns with consumer wellness mindset. |
| **Clinical Bio-Tech Console** | Monospace telemetry, dense data matrices, cold grey/slate borders, terminal scan lines. | Raw data density and scientific feel. | Intimidates casual shoppers and feels sterile. | Rejected |
| **High-Vibrancy Consumer App** | Bright colorful gradients, playful cartoon illustrations, gamified badges. | Casual viral engagement. | Undermines credibility for medical/chemical safety guidance. | Rejected |

---

## 4. Foundations & Design Tokens

### Type Scale (Outfit + Inter)
Font configuration in `app/layout.tsx` surfaces `--font-outfit` for headings and `--font-inter` for body.

| Level | Size / Line Height | Weight | Tracking | Used For |
|---|---|---|---|---|
| **Display** | 3.5rem (56px) / 1.05 | Bold (700) | `-0.035em` | Landing Hero Headline |
| **H1** | 2.25rem (36px) / 1.15 | SemiBold (600) | `-0.025em` | Page & Dashboard Section Titles |
| **H2** | 1.5rem (24px) / 1.25 | SemiBold (600) | `-0.015em` | Bento Card Headers & Modal Titles |
| **H3** | 1.125rem (18px) / 1.35 | Medium (500) | `-0.01em` | Ingredient Names & Metric Labels |
| **Body** | 0.9375rem (15px) / 1.55 | Regular (400) | `0` | Explanatory Text, Summaries, Cons |
| **Small / Meta**| 0.75rem (12px) / 1.4 | Medium (500) | `+0.04em` | Category Chips, E-Numbers, Badges |

### Spacing Scale
Based on an 8px rhythmic grid with a 4px half-step for micro-alignment:
`4px (0.5)`, `8px (1)`, `12px (1.5)`, `16px (2)`, `24px (3)`, `32px (4)`, `48px (6)`, `64px (8)`, `96px (12)`.

### Colour Roles
All tokens utilize warm stone/obsidian foundations to eliminate harsh pitch-black contrast:

| Role | Light Value (Future) | Dark Value (Shipped) | Contrast Pair | Purpose |
|---|---|---|---|---|
| **Canvas Base** | `#fcfbf9` | `#0b0c0e` (warm stone obsidian) | Text Primary | Background layer |
| **Surface Card** | `#f4f2ee` | `#131518` (warm elevated zinc) | Text Primary | Primary bento containers |
| **Surface Raised**| `#eae7e1` | `#1a1d22` (subtle highlight) | Text Primary | Active tabs, modals |
| **Border Subtle** | `#e2ded7` | `rgba(255, 255, 255, 0.07)` | Surface Card | Dividers & card boundaries |
| **Border Focus** | `#10b981` | `rgba(52, 211, 153, 0.4)` | Accent | Input & interactive focus |
| **Text Primary** | `#18181b` | `#f4f4f5` (parchment white) | Canvas Base | Headings and primary copy |
| **Text Secondary**| `#52525b` | `#a1a1aa` (neutral zinc) | Canvas Base | Summaries and descriptions |
| **Text Muted** | `#71717a` | `#71717a` (muted slate) | Canvas Base | Metadata, time, E-numbers |
| **Accent Jade** | `#059669` | `#34d399` (soft clean jade) | Canvas Base | Clean ingredients (7–10) |
| **Warning Amber** | `#d97706` | `#fbbf24` (warm honey) | Canvas Base | Moderate additives (4–6) |
| **Danger Rose** | `#dc2626` | `#f87171` (terracotta rose) | Canvas Base | High concerns (0–3) |

### Elevation, Radius & Borders
* **Radius Card**: `24px` (`rounded-3xl`) for primary hero and bento panels; `16px` (`rounded-2xl`) for ingredient items; `9999px` (`rounded-full`) for interactive chips.
* **Borders**: Hairline `1px` with `white/7` opacity, elevated on hover to `white/14`.
* **Elevation**: Soft ambient glow `0 20px 40px -15px rgba(0,0,0,0.5)` with zero harsh drop shadows.

### Motion Principles
* **Spring Standard**: `{ type: "spring", stiffness: 280, damping: 28 }` for tab transitions and modal entries.
* **Quick Micro**: `0.15s ease-out` for hover states and button presses (`active:scale-[0.98]`).
* **Gauge Fill**: `1.0s cubic-bezier(0.16, 1, 0.3, 1)` for the Safety Score dial fill.
* **Reduced Motion**: Disables positional translations (`y: 0`), replacing them with gentle opacity fades (`opacity: 1`).

---

## 5. Screen Specifications

### Screen 1: Public Marketing Landing (`/landing`)
* **Job**: Communicate product capability within 5 seconds, demonstrate multimodal ingredient inspection, and convert users via Google OAuth.
* **Layout Structure**:
  1. *Subtle Glass Navigation*: Brand icon, live badge, and high-contrast "Get Started with Google" button.
  2. *Hero Section (Asymmetric Split)*:
     - Left: Clear, high-impact headline (*"Know what goes into your body"*), plain-English subhead, and prominent Google OAuth CTA.
     - Right: **Interactive Living Label Preview** — A live interactive card comparing a typical grocery product's marketing claim vs its decoded biochemical reality.
  3. *Core Capabilities Grid (3 Columns)*:
     - Pillar 1: **Multimodal Vision** (Camera snapping curved labels with in-browser compression).
     - Pillar 2: **Barcode Catalog Intelligence** (Instant lookup via OpenFoodFacts with photo fallback).
     - Pillar 3: **Decode Versus** (Side-by-side 2–4 product comparison to pick the cleanest shelf option).
  4. *Cumulative Exposure Showcase*: Visual representation of the 7-day additive accumulation graph.
  5. *Footer*: Clean links, MIT open-source badge, and privacy pledge.

### Screen 2: Authenticated Scanning Dashboard (`/`)
* **Job**: Frictionless multimodal input (Text, Camera Photo, Barcode) followed by immediate, plain-English health guidance.
* **Layout Structure**:
  1. *Global Navigation*: Unified `<Navbar />` with prefetching on all routes (`Home`, `Exposure`, `Compare`, `Plan`).
  2. *Ingestion Command Card*:
     - Top Bar: Segmented switch chips: `[ 📸 Camera / Photo ] [ 🏷️ Barcode ] [ ✍️ Text / Paste ]`.
     - Context Field: Optional Product Name input with subtle inline placeholder.
     - Mode Viewport:
       - *Photo*: Tactile drag-and-drop zone with prominent **"Take Photo"** button for mobile native camera capture, and thumbnail preview with 1-click remove/replace.
       - *Barcode*: Clean numeric search field with instant lookup trigger and automatic camera-scan fallback card.
       - *Text*: Auto-growing textarea with comfortable initial 140px height.
     - Action Bar: Full-width high-contrast Decode CTA with stateful pulsing animation during Gemini analysis.
  3. *Results Presentation (when scan completed)*:
     - *Hero Metric Grid*:
       - Left: Radial **Safety Score Dial** (0–10) with colored gauge arc.
       - Right: Executive summary, primary watchout callout, and additive breakdown counter chips.
     - *Interactive Category Filter Chips*: Filter breakdown by `All`, `High Concern`, `Moderate`, `Clean / Natural`.
     - *Natural-Flow Ingredient List*: Collapsible bento cards without nested fixed scroll traps. Clean risk tags, origin badges, positive properties, watchouts, and neutralizing counter-nutrients.
  4. *Empty State (when no scan loaded)*:
     - Interactive quick-start starter pills: *"Sample 1: Energy Drink"*, *"Sample 2: Oat Milk"*, *"Sample 3: Packaged Cookies"* so users can test the scanner instantly in one click.

---

## 6. Component Inventory & State Matrix

| Component | Nature | Default | Hover | Focus-Visible | Active | Loading | Empty / Disabled | Error |
|---|---|---|---|---|---|---|---|---|
| **Navbar** | Existing | Glass blur, `white/5` border | Text brightness boost | Emerald outline ring | Route active pill | — | — | — |
| **ModeSwitcher** | Enhanced | Segmented stone pill | `white/5` bg | 2px emerald ring | Scale `0.98` | — | Disabled during scan | — |
| **PhotoDropzone** | Enhanced | Dashed warm stone border | Emerald glow border | Tab-index focus ring | Inset tint | Canvas downsampling spin | Dimmed opacity | "Invalid format" alert |
| **BarcodeLookup** | Enhanced | Single stone input + button | Border `white/15` | Emerald ring | Scale `0.98` | Inline spinner in button | Disabled if empty | Inline fallback prompt |
| **DecodeButton** | Enhanced | Emerald gradient, glow | Brightness `1.08` | Focus ring | Scale `0.97` | Pulse spinner + stage text | Disabled `opacity-50` | Shake animation |
| **SafetyDial** | New | Full circular SVG arc | Tooltip info | — | — | Animated gauge sweep | Grey baseline arc | Red warning state |
| **IngredientCard** | Enhanced | Soft stone card, left tag | Border `white/12` | Tab-focused ring | Accordion toggle | — | — | — |
| **StarterPill** | New | Subtle stone pill, dashed border | Emerald text tint | Focus ring | Pre-populates input | — | Hidden during scan | — |

---

## 7. Responsive Behaviour

| Breakpoint | Landing Page (`/landing`) | Dashboard (`/`) | Navigation |
|---|---|---|---|
| **Desktop (`>= 1024px`)** | Asymmetric 2-column hero; 3-column feature grid | Side-by-side or stacked bento; dual-column metrics | Full labels with icons and sign-out button |
| **Tablet (`768px - 1023px`)** | Stacked hero; 2-column feature grid | Full-width input; 2-column metrics | Icon + text buttons with compact paddings |
| **Mobile (`< 768px`)** | Single column; interactive label preview stacks below copy | Full-width input; camera opens native mobile camera viewfinder; natural page scroll | Icon-only nav buttons; sticky top bar |

---

## 8. Accessibility & Compliance

* **Contrast Ratios**: Every text-to-surface pairing meets or exceeds **WCAG 2.1 AA** (minimum `4.5:1` for body text, `3.0:1` for large display text).
* **Keyboard Navigation**:
  - Ingestion tabs selectable via `ArrowLeft` / `ArrowRight` and activated with `Enter` / `Space`.
  - Visible focus rings: `focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950`.
* **Screen Reader Semantics**:
  - Safety score announced with descriptive aria label: `aria-label="Safety score: 8 out of 10, Safe"`.
  - Loading states use `aria-live="polite"` with descriptive progress ("Decoding ingredients with Gemini 3.5 Flash...").
* **Touch Target Sizing**: All mobile interactive buttons and chips have a minimum hit target of **44 × 44px**.
* **Reduced Motion**: All animations wrapped with `@media (prefers-reduced-motion: reduce)` fallbacks disabling positional spring movement.

---

## 9. Performance Budget

| Metric | Target Budget | Mitigation Strategy |
|---|---|---|
| **Largest Contentful Paint (LCP)** | `< 1.2s` | Zero heavy 3D canvas libraries; optimized Next.js WebP image components. |
| **Interaction to Next Paint (INP)** | `< 80ms` | Client-side downsampling handled asynchronously in off-thread canvas; React 19 transitions. |
| **Cumulative Layout Shift (CLS)** | `0.00` | Fixed aspect-ratio containers for photo previews and SVG dials. |
| **Total JavaScript Bundle** | `< 140KB gzipped` | Use existing Phosphor icons and native Tailwind v4 utilities; zero added runtime dependencies. |

---

## 10. Phased Implementation Plan

```text
Phase 1: Foundational Tokens & Shared Elements
  ├── Update globals.css with warm-stone obsidian variables
  └── Refine Navbar styling for warm-editorial theme

Phase 2: Redesign the Authenticated Dashboard (/)
  ├── Refactor components/dashboard.tsx into clean modular sub-components
  ├── Implement the Holistic Safety Score Dial
  ├── Integrate interactive 1-click sample starter pills
  └── Eliminate fixed-height scroll traps for natural mobile flow

Phase 3: Redesign the Public Landing Page (/landing)
  ├── Build the Interactive Living Label Preview hero card
  ├── Update feature showcase with Camera, Barcode, and Compare capabilities
  └── Eliminate invented statistics in favor of truthful capability metrics

Phase 4: QA, Verification & Build Certification
  ├── Run ESLint (0 errors, 0 warnings)
  ├── Run Next.js production build verification
  └── Verify mobile responsiveness on simulated viewports
```

---

## 11. QA Checklist

- [x] Every component has all interactive states specified (hover, active, focus, disabled, loading).
- [x] Landing and Dashboard both provide clear empty, loading, and error states.
- [x] Contrast pairs meet WCAG AA standards (`>= 4.5:1`).
- [x] Breakpoints explicitly define responsive mobile layout behavior.
- [x] Full keyboard navigation path and visible focus indicators established.
- [x] Copy uses real, active verbs with zero invented statistics or lorem ipsum.
- [x] The signature move (Dual-State Living Label & Holistic Safety Dial) is concretely specified.
- [x] Backward compatibility preserved with all existing backend API routes.
