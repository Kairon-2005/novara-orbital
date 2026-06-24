# Novara — Your Singapore Education Journey, Guided

> A bilingual web platform that helps young Chinese international students navigate
> Singapore's education system — from choosing a school to building a
> university-ready portfolio — while keeping their parents in China informed in
> Mandarin.

**Team:** Cyber Grape  **Programme:** NUS Orbital 2026  **Level:** Apollo 11
**Milestone:** MS1 (Proof of Concept)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [The Problem & Our Solution](#2-the-problem--our-solution)
3. [Core Feature Pillars](#3-core-feature-pillars)
4. [User Personas](#4-user-personas)
5. [Use Cases](#5-use-cases)
6. [System Architecture](#6-system-architecture)
7. [Technology Stack & Justification](#7-technology-stack--justification)
8. [Design Principles](#8-design-principles)
9. [Design Patterns](#9-design-patterns)
10. [Design Decisions (Alternatives, Criteria, Comparison, Justification)](#10-design-decisions)
11. [Project Structure & File Organization](#11-project-structure--file-organization)
12. [Data Model](#12-data-model)
13. [API Reference](#13-api-reference)
14. [Security & Privacy](#14-security--privacy)
15. [Internationalization (i18n)](#15-internationalization-i18n)
16. [Coding Standards & Tooling](#16-coding-standards--tooling)
17. [Testing & Quality Assurance](#17-testing--quality-assurance)
18. [Getting Started (Local Development)](#18-getting-started-local-development)
19. [Deployment](#19-deployment)
20. [Milestone Delivery Plan](#20-milestone-delivery-plan)
21. [Known Limitations & Future Work](#21-known-limitations--future-work)
22. [Appendix](#22-appendix)

---

## 1. Project Overview

**Novara** (internally codenamed *Orbital*) is a web application built for the NUS
Orbital 2026 programme. It serves a specific, underserved audience: **young Chinese
international students** who relocate to Singapore for secondary or pre-university
education, and **their parents**, who remain in mainland China and often speak
little English.

For these families, the journey to a "dream university abroad" is fragmented,
opaque, and stressful. Information is scattered across a dozen English-language
websites; deadlines are missed; and parents — who frequently make significant
financial sacrifices — have almost no visibility into how their child is actually
progressing.

Novara turns that journey into a single, **gamified, visual experience**. A student
completes a short profile, receives an **AI-generated multi-year academic roadmap**,
tracks milestones and achievements as they level up, and shares a **read-only,
Simplified-Chinese dashboard** with their parents so the whole family can see
progress toward the goal.

The product's north star is captured in one sentence:

> **Gamify and visualize the process of "going to your dream university abroad,"
> and let parents see what their kids are doing.**

This README documents the system's architecture, the engineering principles and
patterns behind it, the major design decisions (with the alternatives we weighed),
and the conventions a new contributor needs to work in the codebase.

---

## 2. The Problem & Our Solution

### 2.1 The problem

| Pain point | Who feels it | Today's reality |
|---|---|---|
| No clear path to a target university | Student | Advice is generic, English-only, and spread across 5+ sites |
| Missed deadlines | Student | DSA windows, exam registrations, and application dates live in different places |
| Language barrier on official notices | Student & Parent | School letters arrive in English; parents cannot read them |
| Zero progress visibility | Parent | Parents rely on unreliable self-reporting over WeChat |
| Loss of motivation | Student | The multi-year slog has no feedback loop or sense of progress |

### 2.2 Our solution

Novara addresses each pain point with a focused feature, unified by a single
gamified "journey" metaphor:

- **AI Academic Roadmap** — a personalised, multi-year plan generated from the
  student's profile, spanning from the present year to their planned university
  enrolment year.
- **Tracking System** — a calendar (with `.ics` export), a milestone tracker, a
  document vault, and a gamified portfolio (XP, levels, badges) that turns progress
  into a game.
- **Family Connection** — a Simplified-Chinese parent dashboard that mirrors the
  student's progress read-only, plus an AI translator for school communications.
- **School Application Assistant** — per-university requirement lookup, reference
  links, deadline-to-calendar, and an **AI fit/gap analysis** comparing the
  student's current profile against each target university.

---

## 3. Core Feature Pillars

Novara is organised around **three product pillars**. Everything else supports them.

### Pillar 1 — AI Roadmap Plan
The flagship feature. After a five-section onboarding form, the student's profile is
sent to a large language model (Qwen) which returns a structured, multi-year roadmap.
Each year contains concrete, Singapore-specific milestones (real exam names like
A-Level/IB, real competitions like SMO/SBO, real deadlines like the DSA window). The
roadmap timeline is **dynamic**: it spans exactly from the current calendar year
through the student's planned enrolment year. The user previews the AI output and
explicitly **adopts** it before anything is persisted.

### Pillar 2 — Tracking System
- **Smart Calendar** — month view, manual events, colour-coded by type, plus a valid
  RFC 5545 `.ics` export so deadlines flow into Google/Apple Calendar.
- **Milestone Tracker** — milestones grouped by year; check them off to mark
  progress; one-click "add to calendar."
- **Document Vault** — upload, classify (transcript, passport, certificate, …), and
  selectively share documents with parents; stored in Supabase Storage.
- **Gamified Portfolio** — log achievements; earn XP and badges; level up from
  *Newcomer* to *Champion*. A readiness ring visualises progress.

### Pillar 3 — Family Connection
- **Parent Dashboard (zh-CN)** — a read-only mirror of the student's journey,
  entirely in Simplified Chinese, linked via a one-time invite code.
- **Communication Translator** — paste an English school notice; the AI returns a
  full Chinese translation plus a three-sentence summary for the parent.
- *Channel decision:* family connection is delivered through the **web dashboard +
  WeChat (manual sharing)**, not email. (See [§10.3](#103-decision-family-connection-channel).)

### Supporting features
School & Curriculum Navigator, Finance Tracker (fees, insurance, expenses), Homestay
listings, a **Knowledge Wiki** (the curated NUS/NTU/pathway corpus the AI retrieves
from — browsable and semantically searchable at `/wiki`), and a **community of
structured admission reports** (一亩三分地-style data points: background + outcome +
experience, anonymous by default; secondary school & undergraduate only).

---

## 4. User Personas

### Persona A — Wei, 15, the Student
- Just arrived in Singapore to attend an international school; parents in Shenzhen.
- Wants NUS Engineering but has no idea what the 4-year path looks like.
- Misses deadlines because everything is in English and spread across many sites.
- **Needs:** a clear roadmap, a deadline calendar, and a sense of progress.

### Persona B — Mei, 45, Wei's Mother
- Speaks minimal English; uses WeChat daily; cannot attend parent-teacher meetings.
- Made a major financial sacrifice to send Wei abroad.
- **Needs:** Chinese-language visibility into Wei's progress and upcoming deadlines.

---

## 5. Use Cases

Each use case lists the **actor**, **preconditions**, **main flow**, **alternate /
exception flows**, and **postconditions**. They map directly to implemented routes
and components.

### UC-1 — Student Sign-Up & Onboarding
- **Actor:** Student
- **Precondition:** No account.
- **Main flow:**
  1. Student opens `/signup`, enters name, email, password, accepts Terms.
  2. System (`supabase.auth.signUp`) creates the auth user; a Postgres trigger
     (`handle_new_user`) auto-creates `profiles` and `student_profiles` rows.
  3. If email confirmation is enabled, the student sees a "Check your email" screen
     with a working **Resend** button.
  4. After confirmation, the `/auth/callback` route exchanges the one-time code for a
     session and redirects to `/onboarding`.
  5. Student completes the five-section form (current year, curriculum, school,
     target university & programme, planned enrolment year, interests, budget,
     English level).
  6. On submit, `PATCH /api/profile` persists the fields and sets `onboarding_done`.
- **Exception:** If a field violates a DB constraint, the **real** server error is
  surfaced ("Save failed: …") rather than a generic message.
- **Postcondition:** A complete student profile exists; the student lands on the
  dashboard.

### UC-2 — Generate an AI Roadmap
- **Actor:** Student
- **Precondition:** Onboarding complete; generation quota available.
- **Main flow:**
  1. Student clicks "Generate with AI" on `/roadmap`.
  2. `POST /api/roadmap/generate` checks auth, consumes one generation from the quota,
     loads the profile + any existing milestones, computes the timeline
     (`currentYear → targetEnrollmentYear`), and calls `generateRoadmap`.
  3. The AI returns structured JSON; the client renders a **preview** (no DB write).
  4. Student clicks **Adopt**; `POST /api/roadmap/save` archives any active roadmap,
     creates a new one, and bulk-inserts milestones.
- **Alternate:** Student edits inputs and regenerates.
- **Exception:** Quota exceeded → `402` with an upgrade message; AI failure/timeout →
  graceful `500` with a retry prompt.
- **Postcondition:** An active roadmap with persisted milestones spanning the
  student's real timeline.

### UC-3 — Track & Complete Milestones
- **Actor:** Student
- **Main flow:** Student expands a year on `/roadmap`, checks off a milestone →
  optimistic UI update → DB write → a celebratory toast ("🎉 Milestone complete! +50
  XP"). Optionally "Add to calendar" creates a `calendar_events` row.
- **Exception:** DB write fails → optimistic update is reverted and an error toast
  appears.
- **Postcondition:** Milestone state and XP reflect real, persisted progress.

### UC-4 — Manage the Calendar & Export `.ics`
- **Actor:** Student
- **Main flow:** Student adds/edits events on `/calendar`; clicks **Export .ics** →
  `GET /api/calendar/export` streams an RFC 5545 file → imports into
  Google/Apple Calendar.
- **Postcondition:** Deadlines live in the student's real calendar app.

### UC-5 — Log Achievements & Level Up
- **Actor:** Student
- **Main flow:** On `/portfolio`, the student adds an achievement (category, title,
  date). XP is computed from the category and **persisted** (`achievements.xp`). The
  XP ring, level, and badges update and remain consistent across reloads.
- **Postcondition:** Portfolio gamification reflects real database state.

### UC-6 — AI Fit / Gap Analysis for a Target University
- **Actor:** Student
- **Precondition:** At least one university in the tracker.
- **Main flow:** On `/universities`, the student clicks **Analyse my fit** on a
  target. `POST /api/universities/gap` verifies ownership, loads the profile +
  achievements + the target's requirements, and calls `analyseTargetGap`. The result
  (fit score, strengths, gaps) is persisted on the target and rendered.
- **Postcondition:** The student sees a concrete, persisted readiness assessment per
  university.

### UC-7 — Translate a School Communication
- **Actor:** Student (on behalf of parent)
- **Main flow:** Student pastes/uploads an English notice on the comms feature;
  `POST /api/translate-notice` returns a Chinese translation + summary, persisted to
  `school_communications` so the parent can read it on their dashboard.

### UC-8 — Link a Parent Account
- **Actor:** Student, then Parent
- **Main flow:**
  1. Student clicks **Generate Invite Code** in the dashboard's "Share with Parent"
     card → `POST /api/profile/invite-code` returns a unique 6-character code.
  2. Parent opens `/join`, creates an account, and enters the code.
  3. `/auth/callback` (or the link route) inserts a `parent_links` row connecting the
     two accounts.
- **Postcondition:** The parent can read — but not edit — the student's data.

### UC-9 — Parent Views Progress (zh-CN)
- **Actor:** Parent
- **Main flow:** Parent signs in and is routed to `/parent/dashboard`. They see, in
  Simplified Chinese: the gamified journey card, readiness score, upcoming deadlines,
  recent achievements, milestone progress, fees, and translated communications.
- **Constraint:** Row-Level Security guarantees read-only access scoped to *their*
  linked child only.

---

## 6. System Architecture

### 6.1 High-level view

Novara is a **server-rendered, full-stack Next.js application** backed by Supabase.
There is no separate backend service — the Next.js App Router hosts both the UI
(React Server & Client Components) and the API (Route Handlers). Supabase provides
the Postgres database, authentication, file storage, and Row-Level Security.

```
                         ┌───────────────────────────────────────────┐
                         │                Browser                    │
                         │  React Server Components (HTML) +         │
                         │  Client Components (interactivity)        │
                         └──────────────┬────────────────────────────┘
                                        │  HTTPS
                         ┌──────────────▼────────────────────────────┐
                         │            Next.js 14 (Vercel)            │
                         │                                           │
                         │  middleware.ts   → session refresh +     │
                         │                    route guarding        │
                         │  app/(groups)/   → Server Components      │
                         │                    (data fetching)       │
                         │  app/api/*       → Route Handlers (API)   │
                         │  lib/ai.ts       → AI adapter (Qwen)      │
                         └───────┬───────────────────────┬───────────┘
                                 │ supabase-js / ssr     │ OpenAI SDK
                                 │                       │ (baseURL → Qwen)
                  ┌──────────────▼─────────┐   ┌─────────▼──────────────┐
                  │       Supabase         │   │   Qwen (DashScope)     │
                  │  Postgres + RLS        │   │   qwen-plus / qwen-max │
                  │  Auth (JWT)            │   │   roadmap, translate,  │
                  │  Storage (documents)   │   │   gap analysis         │
                  └────────────────────────┘   └────────────────────────┘
```

### 6.2 Layered responsibilities

| Layer | Location | Responsibility |
|---|---|---|
| **Presentation** | `app/**/page.tsx`, `*Client.tsx`, `components/` | Render UI; Server Components fetch data, Client Components handle interaction |
| **Edge / Middleware** | `middleware.ts` | Refresh the Supabase session cookie; redirect unauthenticated/authenticated users |
| **API** | `app/api/**/route.ts` | Authn/authz, input validation, orchestration, DB writes, AI calls |
| **Domain / Services** | `lib/ai.ts`, `lib/roadmap-quota.ts`, `lib/progress.ts`, `lib/invite-code.ts` | Business logic that is reusable and framework-agnostic |
| **Data access** | `db/client.ts`, `db/server.ts` | Supabase client factories for browser / server / route contexts |
| **Persistence** | Supabase Postgres (`db/schema.sql`, `db/rls.sql`, `supabase/migrations/`) | Tables, constraints, RLS policies, triggers |

### 6.3 Request lifecycle (example: adopting a roadmap)

1. The browser POSTs to `/api/roadmap/save`.
2. `middleware.ts` has already refreshed the session cookie.
3. The Route Handler creates a **route-scoped** Supabase client and calls
   `auth.getUser()` to verify the JWT against the auth server (not just decode it).
4. It validates the request body, then uses a **service-role** client to atomically
   archive the old roadmap and insert the new one + milestones.
5. RLS still protects every other table; the service-role client is used only where a
   privileged, server-only write is required.
6. A JSON result is returned; the client calls `router.refresh()` to re-render the
   Server Component with fresh data.

---

## 7. Technology Stack & Justification

Every major dependency was chosen against explicit criteria. Summary table first,
then the reasoning that matters most appears in [§10 Design Decisions](#10-design-decisions).

| Concern | Choice | Why (one line) |
|---|---|---|
| Framework | **Next.js 14 (App Router)** | One codebase for UI + API; Server Components reduce client JS; first-class Vercel deploy |
| Language | **TypeScript (strict)** | Compile-time safety across UI, API, and DB types |
| Database / Auth / Storage | **Supabase** | Postgres + Auth + Storage + Row-Level Security with almost no backend code |
| AI | **Qwen (Alibaba DashScope)** via the OpenAI SDK | Strong Chinese-language capability; OpenAI-compatible API for easy provider swaps |
| Styling | **Tailwind CSS** + design tokens | Fast, consistent, co-located styling; tokens enforce a single design language |
| UI primitives | **Radix UI** | Accessible, unstyled primitives (Dialog, Tabs, Toast, Select, Progress) |
| i18n | **next-intl** | Locale-aware message loading for the bilingual requirement |
| Charts | **Recharts** | Declarative React charts for readiness/finance visualisations |
| Icons | **lucide-react** + inline SVG | Lightweight, tree-shakeable icons |
| Doc parsing | **pdf-parse**, **tesseract.js** | Extract text/OCR from uploaded notices for translation |
| RAG / vector store | **Qdrant Cloud** + DashScope `text-embedding-v3` | Grounds AI answers in a curated, citable knowledge base; reuses the Qwen key for embeddings |
| Testing | **Vitest** | Fast, ESM-native unit testing aligned with the Vite ecosystem |
| Deployment | **Vercel** + Supabase Cloud | Zero-config Next.js hosting; managed Postgres |

### Versioned dependency snapshot (from `package.json`)
- `next ^14.2`, `react ^18`, `typescript ^5`
- `@supabase/supabase-js 2.45`, `@supabase/ssr 0.5`
- `openai ^4.67` (pointed at the Qwen DashScope base URL)
- `tailwindcss ^3.4`, Radix UI dialog/tabs/toast/select/label/progress/slot
- `next-intl ^3.25`, `recharts ^2.13`, `lucide-react`, `pdf-parse`, `tesseract.js`
- Dev: `vitest ^2.1`, `eslint 8` + `eslint-config-next`, `@vitejs/plugin-react`

---

## 8. Design Principles

These are the principles the codebase is held to. Each is concrete and checkable.

### 8.1 Security by default (least privilege)
Every table has **Row-Level Security** enabled, with policies that scope access to the
owning student and (read-only) their linked parent. The browser only ever holds the
**anon** key; the powerful **service-role** key is used in exactly one server-only
place (`api/roadmap/save`) where an atomic privileged write is required. Auth is
verified with `auth.getUser()` (which contacts the auth server) rather than the
cheaper, spoofable `getSession()` in security-sensitive paths.

### 8.2 Separation of concerns
Data fetching lives in **Server Components** (`page.tsx`); interactivity lives in
**Client Components** (`*Client.tsx`); reusable business logic lives in `lib/`; the
database schema is the single source of truth for persistence. No component reaches
across a layer it shouldn't.

### 8.3 Fail-safe AI
LLMs are non-deterministic and can hang or return malformed output. Every AI call is
wrapped in `withTimeout()` (45 s cap) and parsed through `parseJson()`, which falls
back to brace-extraction and throws a labelled error the API layer converts into a
clean `500`. A flaky model never crashes a request or corrupts data.

### 8.4 Explicit user intent ("preview, then commit")
Expensive or destructive actions are never silent. The AI roadmap is **previewed**
before the user clicks **Adopt** to persist it. This keeps cost, surprise, and data
mutation under the user's control.

### 8.5 Mobile-first & responsive
The audience browses primarily on phones. Layouts use responsive Tailwind utilities
(`grid-cols-1 lg:grid-cols-[…]`), and the sidebar collapses into an off-canvas drawer
on small screens.

### 8.6 Localization as a first-class concern
The student UI is English; the parent UI is **100% Simplified Chinese** with a
dedicated `Noto Sans SC` font stack. Locale is a structural property of the route
tree, not an afterthought.

### 8.7 Single source of truth / DRY
Design tokens live once in `tailwind.config.ts` (and CSS variables); XP values live
once in `XP_BY_CATEGORY`; database types are generated into `types/database.ts`.
Duplicated truth is treated as a bug.

### 8.8 Graceful degradation & honest errors
Failed operations surface the **real** reason (e.g., the actual Postgres error on a
failed profile save) instead of a generic message, and provide a retry path.

### 8.9 Idempotent, reversible migrations
Schema changes use `ADD COLUMN IF NOT EXISTS` and are safe to re-run, so the live
database can be evolved without fear.

---

## 9. Design Patterns

The codebase deliberately uses well-known patterns. Each entry names the pattern, what
it solves, and where to find it.

### 9.1 Container / Presentational (Server + Client split)
**Problem:** keep data fetching on the server (fast, secure, less client JS) while
preserving rich interactivity. **Implementation:** `page.tsx` is an async Server
Component that fetches from Supabase and maps rows into view models, then renders a
`*Client.tsx` Client Component that owns local state and event handlers.
*Examples:* `roadmap/page.tsx → RoadmapClient.tsx`, `universities/page.tsx →
UniversityClient.tsx`, `portfolio/page.tsx → PortfolioClient.tsx`.

### 9.2 Adapter
**Problem:** depend on an AI provider without hard-coupling to it. **Implementation:**
`lib/ai.ts` instantiates the **OpenAI SDK** but points its `baseURL` at Alibaba's
DashScope (Qwen). Because Qwen exposes an OpenAI-compatible API, the rest of the app
talks to a stable interface; swapping to OpenAI or Kimi is a base-URL + key change,
documented in comments at the top of the file.

### 9.3 Factory
**Problem:** Supabase clients must be constructed differently in browser, Server
Component, and Route Handler contexts (cookie handling differs). **Implementation:**
`db/client.ts` (`createBrowserClient`) and `db/server.ts` (`createServerClient`,
`createRouteClient`) centralise construction so call sites never wire cookies by hand.

### 9.4 Provider / Context
**Problem:** cross-cutting UI services without prop-drilling. **Implementation:**
`components/ui/toast.tsx` exposes a `ToastProvider` mounted at the root layout and a
`useToast()` hook; `next-intl`'s provider supplies locale messages.

### 9.5 Data Transfer Object (DTO) mapping
**Problem:** decouple the database's `snake_case` schema from the UI's `camelCase`
view models. **Implementation:** Server Components map raw Supabase rows into typed
view models (`MockMilestone`, `MockAchievement`, `UniversityTarget`) before passing
them to clients, isolating UI from schema churn.

### 9.6 Optimistic UI with rollback
**Problem:** make tracking feel instant despite network latency. **Implementation:**
`RoadmapClient.handleToggle` updates local state immediately, writes to the DB, and
**reverts** the change plus shows an error toast if the write fails.

### 9.7 Guard clause
**Problem:** keep request handlers flat and safe. **Implementation:** every Route
Handler begins with early returns for missing auth, invalid input, or missing
resources before any business logic runs.

### 9.8 Strategy (quota policy)
**Problem:** enforce a freemium generation policy without scattering rules.
**Implementation:** `lib/roadmap-quota.ts` encapsulates the "first generation free + one
free per calendar year" rule behind `checkAndConsumeQuota`.

### 9.9 Pure function / derived state
**Problem:** keep gamification deterministic and testable. **Implementation:**
`lib/progress.ts` (`computeJourney`) and `lib/mock-data.ts` (`computeXP`,
`getLevelInfo`, `computeBadges`) are pure functions of their inputs, reused on both the
student and parent dashboards.

### 9.10 Resilience decorators
**Problem:** uniformly harden external calls. **Implementation:** `withTimeout()` and
`parseJson()` in `lib/ai.ts` wrap every model call with timeout and safe parsing.

---

## 10. Design Decisions

Each decision below states the **alternatives** considered, the **criteria** used to
judge them, a **comparison**, and the **justification** for the choice.

### 10.1 Decision: Rendering model — React Server Components vs. SPA
- **Alternatives:** (a) Next.js App Router with Server Components; (b) a client-only
  SPA (e.g., Vite + React) calling a separate API; (c) Next.js Pages Router.
- **Criteria:** initial load performance, security of data access, code duplication,
  SEO, team velocity, hosting simplicity.
- **Comparison:**

  | Criterion | RSC (App Router) | Client SPA + API | Pages Router |
  |---|---|---|---|
  | Data fetching on server | ✅ native | ❌ separate API | ⚠️ `getServerSideProps` |
  | Client JS shipped | ✅ minimal | ❌ large bundle | ⚠️ medium |
  | One codebase for UI+API | ✅ | ❌ two services | ✅ |
  | Secrets stay server-side | ✅ | ⚠️ easy to leak | ✅ |
  | Hosting | ✅ Vercel zero-config | ⚠️ two deploys | ✅ |
- **Justification:** Server Components let us fetch directly from Supabase on the
  server (keeping the service-role key and queries off the client), ship less
  JavaScript to phones, and avoid maintaining a second backend — decisive for a small
  Orbital team.

### 10.2 Decision: Backend platform — Supabase vs. Firebase vs. custom
- **Alternatives:** (a) Supabase (Postgres); (b) Firebase (Firestore); (c) a custom
  Node/Express + self-managed Postgres.
- **Criteria:** relational modelling, authorization model, auth + storage included,
  SQL portability, learning curve, cost at student scale.
- **Comparison:**

  | Criterion | Supabase | Firebase | Custom Node+PG |
  |---|---|---|---|
  | Relational data + joins | ✅ Postgres | ❌ document store | ✅ |
  | Row-level authorization | ✅ RLS in DB | ⚠️ rules language | ❌ hand-rolled |
  | Auth + Storage bundled | ✅ | ✅ | ❌ build it |
  | SQL portability / no lock-in | ✅ | ❌ | ✅ |
  | Backend code to maintain | ✅ minimal | ✅ minimal | ❌ a lot |
- **Justification:** Our data is highly relational (students → roadmaps → milestones;
  parents ↔ students). Postgres + **RLS** lets us express authorization *declaratively
  in the database*, which is safer than scattering checks through app code, and
  Supabase bundles auth and storage so the team writes almost no backend.

### 10.3 Decision: Family-connection channel — email digest vs. in-app + WeChat
- **Alternatives:** (a) automated weekly Chinese **email** digest (the original PRD
  plan); (b) **in-app** Chinese parent dashboard + manual **WeChat** sharing.
- **Criteria:** reliability of delivery, setup cost, fit with the audience's habits,
  engineering effort, demo robustness.
- **Comparison:**

  | Criterion | Email digest | In-app + WeChat |
  |---|---|---|
  | Delivery reliability | ⚠️ needs verified domain + SMTP; spam risk | ✅ always available |
  | Audience habit fit | ⚠️ Chinese parents live in WeChat, not email | ✅ |
  | Setup cost | ⚠️ domain + SendGrid/Resend config | ✅ none |
  | WeChat Official Account API | ❌ requires business verification | ✅ avoided |
- **Justification:** The target parents use WeChat and the web, not email. Email also
  requires a paid/verified domain and reliable SMTP — friction with no payoff for this
  audience. We deliver family connection through the **web dashboard** (read-only,
  Chinese) and **WeChat** (manual sharing), and dropped email entirely. The
  `calendar_events.reminder_sent_*` columns remain to drive **in-app** reminders, not
  email.

### 10.4 Decision: AI provider — Qwen vs. OpenAI vs. Kimi
- **Alternatives:** (a) Qwen (Alibaba DashScope); (b) OpenAI GPT-4o; (c) Moonshot Kimi.
- **Criteria:** Chinese-language quality (for parent-facing translation), API
  compatibility, cost, regional accessibility.
- **Comparison:**

  | Criterion | Qwen | OpenAI | Kimi |
  |---|---|---|---|
  | Chinese fluency | ✅ excellent | ✅ good | ✅ excellent |
  | OpenAI-compatible API | ✅ | ✅ (native) | ✅ |
  | Cost (our usage) | ✅ low | ⚠️ higher | ✅ low |
  | China-region access | ✅ | ⚠️ | ✅ |
- **Justification:** A core feature translates English ↔ Simplified Chinese for parents;
  Qwen excels here and is cost-effective. Because it exposes an **OpenAI-compatible**
  endpoint, we use the official OpenAI SDK as an **adapter** and can switch providers by
  changing one base URL + key (documented in `lib/ai.ts`).

### 10.5 Decision: Roadmap persistence — auto-save vs. preview-then-adopt
- **Alternatives:** (a) generate and immediately persist; (b) generate a **preview**,
  persist only on explicit **Adopt**.
- **Criteria:** user trust, cost control, data integrity (avoid clobbering an existing
  plan), clarity.
- **Justification:** Generation is an LLM call that may produce something the student
  doesn't want. Persisting only on **Adopt** keeps the student in control, avoids
  overwriting an existing active roadmap unintentionally, and makes regeneration safe.
  `api/roadmap/generate` performs **no** writes; `api/roadmap/save` archives the old
  roadmap and writes the new one in one operation.

### 10.6 Decision: Styling — Tailwind tokens vs. CSS Modules vs. CSS-in-JS
- **Alternatives:** (a) Tailwind + design tokens; (b) CSS Modules; (c) a CSS-in-JS
  runtime (styled-components/Emotion).
- **Criteria:** consistency, bundle/runtime cost, RSC compatibility, velocity.
- **Justification:** Tailwind keeps styles co-located with markup (fast iteration), has
  **zero runtime** (unlike CSS-in-JS, which also complicates Server Components), and —
  crucially — our **design tokens** (brand colours, the neutral `t900…t300` scale,
  fonts including `Noto Sans SC`) live once in `tailwind.config.ts`, enforcing one
  visual language across the app.

### 10.7 Decision: Roadmap timeline — fixed vs. profile-driven length
- **Context:** the original UI hard-coded a 4-year scaffold using *relative* year
  indices (1–4), while milestones are stored with **calendar** years — so real data
  could never match the columns.
- **Decision:** drive the timeline from the student's **planned enrolment year**. The
  AI is instructed to emit exactly one entry per calendar year from the current year
  through enrolment; the UI builds its year columns from real calendar years (plus any
  year a milestone falls in).
- **Justification:** A roadmap is only meaningful if it reflects *this* student's actual
  horizon. This also fixed a latent rendering bug and a broken date-builder.

---

## 11. Project Structure & File Organization

Files are organised by **responsibility and route**, following Next.js App Router
conventions. Route groups in parentheses — `(auth)`, `(student)` — organise pages
without adding URL segments.

```
orbital/
├── src/
│   ├── app/                          # App Router: pages + API
│   │   ├── (auth)/                    # Public auth pages (no shared chrome)
│   │   │   ├── login/  signup/  join/ # Student login/signup; parent join-by-code
│   │   │   └── layout.tsx
│   │   ├── (student)/                 # Authenticated student app (shared sidebar)
│   │   │   ├── dashboard/             # Journey hero, deadlines, invite code
│   │   │   │   ├── page.tsx           #   Server Component (data)
│   │   │   │   ├── InviteCodeButton.tsx
│   │   │   │   └── loading.tsx        #   Skeleton while server data loads
│   │   │   ├── roadmap/               # AI roadmap + milestone tracker
│   │   │   ├── calendar/              # Calendar + .ics export
│   │   │   ├── portfolio/             # Gamified achievements (XP/levels/badges)
│   │   │   ├── documents/             # Document vault + classification
│   │   │   ├── universities/          # School Application Assistant
│   │   │   ├── finance/  homestay/    # Supporting features
│   │   │   ├── navigator/ community/  # School navigator; community (planned)
│   │   │   ├── onboarding/            # 5-section profile form
│   │   │   └── layout.tsx             # Role guard + sidebar shell
│   │   ├── parent/                    # Parent app — Simplified Chinese, read-only
│   │   │   ├── dashboard/ roadmap/ finance/ universities/ comms/ homestay/
│   │   │   └── layout.tsx             # Role guard (redirects students out)
│   │   ├── api/                       # Route Handlers (the "backend")
│   │   │   ├── profile/               # GET/PATCH profile; invite-code; link-parent
│   │   │   ├── roadmap/               # generate (no write) / save (adopt)
│   │   │   ├── universities/          # requirements / gap (AI fit analysis)
│   │   │   ├── portfolio/             # analyse (AI gap)
│   │   │   ├── documents/             # upload / signed-url
│   │   │   ├── calendar/export/       # .ics export
│   │   │   ├── translate-notice/      # EN→ZH translation + summary
│   │   │   └── auth/                  # complete-parent-join
│   │   ├── auth/callback/             # OAuth/confirmation code exchange
│   │   ├── layout.tsx                 # Root layout (mounts ToastProvider)
│   │   └── globals.css                # CSS variables + base styles
│   ├── components/
│   │   ├── shared/Sidebar.tsx         # App navigation (responsive drawer)
│   │   └── ui/                        # Reusable primitives
│   │       ├── toast.tsx              #   ToastProvider + useToast
│   │       └── JourneyCard.tsx        #   Gamified journey hero (en/zh)
│   ├── db/
│   │   ├── client.ts                  # Browser Supabase client (factory)
│   │   ├── server.ts                  # Server/route Supabase clients (factory)
│   │   ├── schema.sql                 # Canonical schema
│   │   ├── rls.sql                    # Row-Level Security policies
│   │   └── seed.sql                   # Demo/seed data
│   ├── lib/
│   │   ├── ai.ts                      # AI adapter + all model functions
│   │   ├── roadmap-quota.ts           # Freemium quota policy (Strategy)
│   │   ├── progress.ts                # computeJourney (gamification)
│   │   ├── invite-code.ts             # Invite code generation
│   │   ├── i18n.ts                    # next-intl message loader
│   │   ├── mock-data.ts               # View-model types + XP/level/badge logic
│   │   └── utils.ts                   # Small shared helpers
│   ├── types/
│   │   ├── database.ts                # Generated Supabase types (source of truth)
│   │   └── roadmap.ts                 # Roadmap domain interfaces
│   └── middleware.ts                  # Session refresh + auth routing
├── supabase/
│   ├── migrations/                    # Idempotent, timestamped SQL migrations
│   └── config.toml                    # Local Supabase config
├── messages/                          # i18n message catalogues (en.json, zh.json)
├── docs/                              # PRD, tech spec, diagrams (git-ignored locally)
├── mockups/                           # Static HTML/Figma design references
├── public/                            # Static assets
├── tests/                             # Vitest unit tests
├── .eslintrc.json  tsconfig.json  tailwind.config.ts  next.config.mjs
└── package.json
```

**Conventions:**
- `page.tsx` is always a Server Component; interactive children are suffixed `Client`.
- `loading.tsx` provides a route-level skeleton.
- API handlers live under `app/api/<resource>/<action>/route.ts`.
- Cross-cutting, framework-agnostic logic lives in `lib/`, never in components.
- The `@/*` path alias maps to `src/*` (see `tsconfig.json`).

---

## 12. Data Model

The schema (Postgres) models the student journey and the parent relationship. Key
tables (≈30 total) and their roles:

| Table | Purpose |
|---|---|
| `profiles` | Base account: `role` (student/parent), display name |
| `student_profiles` | Onboarding data: year, school, curriculum, target university/programme, **target_enrollment_year**, interests, budget, English level, `invite_code` |
| `parent_links` | Many-to-one parent ↔ student linkage |
| `roadmaps` / `milestones` | Active/archived roadmaps and their year-tagged milestones |
| `roadmap_generation_quota` | Freemium generation accounting |
| `calendar_events` | Deadlines/events; `reminder_sent_*` flags for in-app reminders |
| `achievements` | Portfolio entries with persisted **xp** |
| `readiness_scores` | AI-derived admission readiness (score + gap analysis) |
| `student_documents` / `document_access` | Document vault metadata + parent sharing grants |
| `university_targets` | Per-student wishlist: requirements, deadline, **reference_link**, **gap_analysis**, **gap_score**, status |
| `school_communications` / `parent_drafts` | Translated notices; parent→school drafts |
| `fee_items` / `insurance_policies` / `expense_logs` | Finance tracking |
| `homestay_listings` / `homestay_reviews` / `homestay_saves` | Homestay feature |
| `admission_reports` | Community v2: structured admission reports — outcome, background, experience sections; anonymous by default; reserved `proof_path`/`verified`/`visibility` for proof-of-offer + contribute-to-read |
| `report_upvotes` / `report_comments` | Upvote toggle (trigger-maintained counter) and anonymous-by-default comment threads |
| `community_posts` / `post_saves` | **Deprecated** (old general forum; no UI) |

**Key relationships:** `profiles 1—1 student_profiles`; `student_profiles 1—N
roadmaps 1—N milestones`; `profiles N—N profiles` via `parent_links`;
`student_profiles 1—N university_targets / achievements / calendar_events`.

**Triggers:** `handle_new_user()` auto-creates `profiles` + `student_profiles` on
sign-up; `bump_report_upvotes()` keeps `admission_reports.upvotes` in sync.
**Outside Postgres:** the RAG knowledge base lives in **Qdrant Cloud** (collection
`novara_kb`), ingested from versioned markdown in `content/kb/` — see
`docs/PRD-knowledge-base.md`. **Important convention:** `student_profiles` is keyed by **`user_id`** (its
`id` is a separate surrogate key) — always filter by `user_id`.

---

## 13. API Reference

All handlers verify authentication first and return JSON. Bold = mutating.

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/profile` | GET / **PATCH** | Session | Read or update the student profile (whitelisted fields only) |
| `/api/profile/invite-code` | **POST** | Student | Generate a unique 6-char parent invite code |
| `/api/profile/link-parent` | **POST** | Session | Link a parent to a student by code |
| `/api/auth/complete-parent-join` | **POST** | Session | Finalise the parent join flow |
| `/api/roadmap/generate` | **POST** | User + quota | AI roadmap **preview** (no DB write) |
| `/api/roadmap/save` | **POST** | User | **Adopt**: archive old + persist new roadmap & milestones |
| `/api/universities/requirements` | **POST** | User | AI lookup of admission requirements |
| `/api/universities/gap` | **POST** | Owner | AI **fit/gap analysis**; persists score + strengths/gaps |
| `/api/portfolio/analyse` | **POST** | User | AI portfolio gap analysis vs. target programme |
| `/api/documents/upload` | **POST** | User | Validated upload (≤10 MB; type allowlist) to Storage |
| `/api/documents/signed-url` | GET | User/Parent | Time-limited signed URL (ownership-checked) |
| `/api/calendar/export` | GET | User | Stream an RFC 5545 `.ics` of the student's events |
| `/api/translate-notice` | **POST** | User | EN→ZH translation + summary; persists the record |
| `/api/kb/search` | **POST** | User | Semantic search over the knowledge base (filters: university/category/topic) with citations |
| `/api/kb/docs` | GET | User | List knowledge-base documents (wiki index) |
| `/api/kb/docs/[docId]` | GET | User | One document rebuilt from its ingested chunks (wiki reader) |
| `/api/kb/ingest` | **POST** | `KB_ADMIN_SECRET` | Runtime ingest/re-ingest of one markdown KB doc (scoped, orphan-cleaning) |
| `/api/cron/kb-stale` | GET | `CRON_SECRET` | Weekly sweep flagging KB docs not re-verified in 90 days |
| `/api/cron/classify-documents` | GET | `CRON_SECRET` | Daily sweep classifying unprocessed documents |

---

## 14. Security & Privacy

- **Row-Level Security on every table.** Students access only their own rows; parents
  get **read-only** access to their linked child's rows via a security-definer helper.
  Policies live in `db/rls.sql`.
- **JWT verification.** Security-sensitive paths use `auth.getUser()` (verifies with
  the auth server) rather than `getSession()` (decodes a cookie).
- **Least-privilege keys.** The browser uses the **anon** key only; the **service-role**
  key is server-only and used in a single, audited write path.
- **Input validation.** API handlers validate presence/shape; uploads enforce a size
  cap (10 MB) and a MIME/extension allowlist; the profile PATCH uses a field
  **whitelist** to prevent mass-assignment.
- **Resource ownership checks.** E.g., the gap route and signed-URL route confirm the
  caller owns (or is the linked parent of) the resource before acting.
- **Secrets management.** Keys live in environment variables (`.env.local`, ignored by
  git; see `.env.example`). No secret is committed; a prior accidental env commit was
  removed and the rule enforced.
- **PDPA awareness.** Student data is scoped per account and never shared beyond the
  explicitly linked parent.

---

## 15. Internationalization (i18n)

- **Student UI:** English. **Parent UI:** 100% Simplified Chinese (zh-CN), a hard
  product requirement.
- **Mechanism:** `next-intl` loads catalogues from `messages/{locale}.json`
  (`src/lib/i18n.ts`). The parent route tree renders Chinese copy with a dedicated
  `Noto Sans SC` font stack (`font-cn` token).
- **Shared bilingual components:** `JourneyCard` accepts a `lang` prop and renders
  English on the student dashboard and Chinese on the parent dashboard from the same
  component — one implementation, two languages.

---

## 16. Coding Standards & Tooling

### 16.1 Language & type safety
- **TypeScript `strict: true`** (`tsconfig.json`) — no implicit `any`, strict null
  checks. The build runs `tsc` and fails on any type error.
- **Generated DB types** (`types/database.ts`) flow Supabase column types through the
  client, so a query referencing a non-existent column is a **compile error**.
- **Path alias** `@/*` → `src/*` keeps imports clean and refactor-safe.

### 16.2 Linting (explored & enforced)
- **ESLint** with `eslint-config-next` (`next/core-web-vitals`), which layers Next's
  rules on top of `eslint:recommended`, `react`, `react-hooks`, and `jsx-a11y`.
- Run with `npm run lint`. The production build (`next build`) also runs ESLint and
  **fails on errors** — e.g., it caught `react/no-unescaped-entities` and surfaced
  `react-hooks/exhaustive-deps` warnings during development, which were addressed.
- This makes lint part of the quality gate, not an optional step.

### 16.3 Comment philosophy — self-documenting code, minimal but intentful comments
The standard is **"make the code read like prose; comment the *why*, not the *what*."**
- Names are descriptive (`checkAndConsumeQuota`, `computeJourney`, `analyseTargetGap`).
- Comments are reserved for **intent and rationale** that code can't express — e.g.,
  *why* `getUser()` is used over `getSession()`, *why* the AI base URL points at Qwen
  and how to swap providers, *why* `student_profiles` is keyed by `user_id`.
- We avoid redundant line-by-line narration of obvious code.

### 16.4 Naming & structure conventions
- Components `PascalCase`; hooks `useX`; pure helpers `camelCase`.
- Server Components: `page.tsx`; their interactive children: `XxxClient.tsx`.
- API routes by resource/action: `app/api/<resource>/<action>/route.ts`.
- SQL migrations: timestamped, idempotent (`ADD COLUMN IF NOT EXISTS`).

### 16.5 Git & review workflow
- Conventional-style commit messages (`feat:`, `fix:`, `security:`).
- No secrets in commits; `.env*` is git-ignored.
- The build (`tsc` + ESLint) is the merge gate.

---

## 17. Testing & Quality Assurance

- **Unit testing:** Vitest (`npm run test`) — **96 unit tests** over the pure logic:
  gamification/assessment/evidence/runes, the knowledge-base pipeline (chunking,
  ingest planning, retrieval, citations, staleness, refresh diffing) and the
  community domain (report validation, anonymity display, BG lines, filters).
  Integration-style: tests exercise public interfaces only, with fake stores for
  the vector DB — no network in the suite.
- **Static analysis as the primary gate at MS1:** `tsc --noEmit` + `next build`
  (which runs ESLint and type-checks every route) must pass before merge — this
  catches the bulk of regressions cheaply.
- **Manual QA:** end-to-end flows (sign-up → onboarding → roadmap → adopt → parent
  link) are walked through on each milestone, on both desktop and mobile widths.

---

## 18. Getting Started (Local Development)

### Prerequisites
- Node.js 18+ and npm
- A Supabase project (free tier) and a Qwen (DashScope) API key
- A Qdrant Cloud cluster (free tier) for the RAG knowledge base — optional in dev;
  AI features degrade gracefully without it

### Setup
```bash
git clone <repo-url>
cd orbital
npm install
cp .env.example .env.local     # fill in your keys (see below)
npm run dev                     # http://localhost:3000
```

### Database
Apply the schema and policies to your Supabase project, then run the migrations in
`supabase/migrations/` (in timestamp order) via the Supabase SQL editor. Migrations are
idempotent and safe to re-run.

### Scripts
| Command | Action |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (also type-checks + lints) |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Vitest unit tests |
| `npm run kb:ingest` | Chunk + embed `content/kb/*.md` into Qdrant (idempotent) |
| `npm run kb:stale` | List KB docs whose `last_verified` is >90 days old |
| `npm run kb:refresh` | Fetch all KB `source_urls`, diff against the last snapshot (`-- --update` to accept) |

### Required environment variables
See `.env.example`. Core keys:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — client/server Supabase
- `SUPABASE_SERVICE_ROLE_KEY` — server-only privileged writes
- `QWEN_API_KEY` — the AI provider key (**required**; also used for KB embeddings)
- `QDRANT_URL`, `QDRANT_API_KEY` — Qdrant Cloud (RAG features no-op if unset)
- `KB_ADMIN_SECRET` — bearer secret for `/api/kb/ingest` (falls back to `CRON_SECRET`)
- `CRON_SECRET` — protects cron routes
- `NEXT_PUBLIC_APP_URL` — app origin

---

## 19. Deployment

- **Hosting:** Vercel (zero-config for Next.js). Set all environment variables in the
  Vercel project settings.
- **Database:** Supabase Cloud. Configure **Authentication → URL Configuration** with
  the production Site URL and allow-listed redirect URLs (`…/auth/callback`).
- **Email confirmation:** for production sign-up emails, configure custom SMTP in
  Supabase (a verified domain is required); for early demos, email confirmation can be
  disabled so sign-up logs the user straight in.
- **Migrations:** apply new SQL migrations to the cloud database as part of release.

---

## 20. Milestone Delivery Plan

| Milestone | Target | Deliverables |
|---|---|---|
| **M1 — Proof of Concept** *(current)* | End May 2026 | Auth, onboarding, School & Curriculum Navigator, Smart Calendar, basic AI Roadmap, README ≥ 9 pages |
| **M2 — Prototype** | End June 2026 | Portfolio + gamification, Parent dashboard, School Application Assistant (AI gap analysis), refinement, README ≥ 18 pages |
| **M3 — Extended System** | End July 2026 | Community hub, polish, user testing, full end-to-end demo |

---

## 21. Known Limitations & Future Work

- **Community admission reports** are live (anonymous-by-default, RLS-backed);
  proof-of-offer upload + verified badges and 一亩三分地-style contribute-to-read
  gating are schema-reserved but not yet enabled. Aggregate stats (offer profiles
  per institution/route) are future work.
- **Knowledge base** quarterly refresh is human-in-the-loop by design (`kb:refresh`
  diffs official pages; an editor updates the markdown and re-ingests); an automated
  re-crawl draft pipeline is future work (KB-10 backlog).
- **School Navigator** uses a curated static dataset; a managed schools table is a
  future enhancement.
- **In-app reminders** (using the `reminder_sent_*` flags) are scaffolded but not yet
  scheduled.
- **Accessibility** has a baseline (semantic HTML, labelled inputs); a full audit
  (ARIA, focus rings, contrast) is planned.
- **Automated test coverage** will expand from core `lib/` logic toward component and
  integration tests in M2.

---

## 22. Appendix

### 22.1 Environment variable reference
| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Supabase anon key (RLS-guarded) |
| `SUPABASE_SERVICE_ROLE_KEY` | server | Privileged server-only writes |
| `QWEN_API_KEY` | server | Qwen/DashScope API key (chat + KB embeddings) |
| `QDRANT_URL` | server | Qdrant Cloud cluster URL (RAG knowledge base) |
| `QDRANT_API_KEY` | server | Qdrant Cloud API key |
| `KB_ADMIN_SECRET` | server | Bearer secret for runtime KB ingest (falls back to `CRON_SECRET`) |
| `CRON_SECRET` | server | Protects `/api/cron/*` routes |
| `NEXT_PUBLIC_APP_URL` | public | App origin for redirects |

### 22.2 Glossary
- **RSC** — React Server Component.
- **RLS** — Row-Level Security (Postgres authorization in the database).
- **DSA** — Direct School Admission (a Singapore admission route).
- **DTO** — Data Transfer Object (here, DB row → UI view model).
- **Adopt** — the explicit user action that persists a previewed AI roadmap.

### 22.3 Design token reference (`tailwind.config.ts`)
- Brand: `blue #1A56DB`, `green #057A55`, `amber #B45309`, `red #E02424`.
- Neutrals: `t900 #111928 … t300 #9CA3AF`, `bg #F3F6FB`, `border #E5E7EB`.
- Fonts: `Inter` (body), `Plus Jakarta Sans` (display), `Noto Sans SC` (Chinese).

---

*Novara — built by Team Cyber Grape for NUS Orbital 2026.*
