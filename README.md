# WebFlowAI

> Build production-ready SaaS applications from a prompt.

WebFlowAI turns natural-language ideas into working full-stack apps. A multi-agent
AI pipeline plans, generates, applies, and reviews code, then runs it live in an
in-browser dev environment powered by WebContainers — with a Cursor/Lovable-style
workspace (AI chat · file explorer · editor · live preview · terminal).

The app runs in a **self-contained demo mode** out of the box. It boots without
any API keys, and progressively activates real auth, AI, and billing as you add
credentials.

---

## Tech stack

| Layer       | Choice                                                        |
| ----------- | ------------------------------------------------------------- |
| Framework   | Next.js 15 (App Router) · React 19 · TypeScript (strict)      |
| UI          | Tailwind CSS · shadcn-style primitives (Radix) · Framer Motion |
| State       | Zustand                                                       |
| AI          | Vercel AI SDK (`ai`) · `@ai-sdk/openai`                       |
| Runtime     | WebContainer API (in-browser Node.js)                        |
| Auth        | Clerk                                                         |
| Database    | PostgreSQL · Prisma 7 (driver adapter: `pg`)                  |
| Billing     | Razorpay (provider-agnostic; Stripe-ready)                    |

---

## Prerequisites

- **Node.js ≥ 20** (developed on v26)
- **pnpm ≥ 9** (`npm install -g pnpm`)
- **Docker** + Docker Compose — used to run local PostgreSQL

---

## Quick start

```bash
# 1. Install dependencies
pnpm install

# 2. Create your env file
cp .env.example .env

# 3. Start Postgres (Docker) + apply the Prisma schema
pnpm db:up          # boots the postgres container and waits until healthy
pnpm db:push        # creates tables from prisma/schema.prisma

# 4. Run the dev server (this also starts Postgres automatically)
pnpm dev
```

Open **http://localhost:3000**.

> `pnpm dev` is wired to `pnpm db:up && next dev`, so the database container is
> started for you on every run. Use `pnpm dev:no-db` to skip Docker (e.g. if you
> point `DATABASE_URL` at a hosted database).

---

## Environment variables

Copy `.env.example` to `.env`. Everything is optional for demo mode; add keys to
enable the corresponding real integration.

| Variable | Purpose | Required? |
| --- | --- | --- |
| `DATABASE_URL` | Postgres connection (matches `docker-compose.yml`) | For DB features |
| `OPENAI_API_KEY` | Enables real AI generation (otherwise heuristic demo mode) | Optional |
| `WEBFLOWAI_MODEL` | Model id (default `gpt-4o-mini`) | Optional |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | Enables real auth (otherwise demo auth) | Optional |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` | Enables real billing | Optional |

The default `DATABASE_URL` already matches the Docker credentials:

```
postgresql://webflowai:webflowai@localhost:5432/webflowai?schema=public
```

---

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start Postgres (Docker) + Next.js dev server |
| `pnpm dev:no-db` | Start Next.js only (no Docker) |
| `pnpm build` | Production build |
| `pnpm start` | Run the production build |
| `pnpm typecheck` | Strict TypeScript check (no emit) |
| `pnpm lint` | ESLint (next/core-web-vitals) |
| `pnpm db:up` / `pnpm db:down` | Start / stop the Postgres container |
| `pnpm db:push` | Sync Prisma schema to the database |
| `pnpm db:reset` | Drop volume, recreate, and re-push schema |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm db:generate` | Regenerate the Prisma client |

---

## Project structure

```
src/
├─ app/
│  ├─ (marketing)/         # Public landing site (9 sections)
│  ├─ (auth)/              # Sign-in / sign-up (Clerk + demo fallback)
│  ├─ (app)/               # Authenticated shell: dashboard, projects,
│  │                       #   templates, settings/*
│  ├─ workspace/[id]/      # Full-screen IDE workspace
│  ├─ onboarding/          # Multi-step onboarding
│  ├─ api/                 # chat (NDJSON stream), billing, webhooks
│  ├─ layout.tsx           # Root layout (fonts, theme, conditional Clerk)
│  └─ globals.css          # Design system tokens + utilities
├─ components/
│  ├─ ui/                  # Reusable primitives (button, card, dialog, …)
│  ├─ marketing/           # Landing sections
│  ├─ workspace/           # IDE panels (chat, editor, preview, terminal, …)
│  ├─ dashboard/ app/ auth/ shared/
├─ features/
│  ├─ ai/                  # Multi-agent pipeline
│  │  ├─ agents/           #   planner · architect · generator · file-op · reviewer
│  │  ├─ orchestrator.ts   #   coordinates agents + review retry loop
│  │  ├─ types.ts prompts.ts model.ts
│  ├─ webcontainer/        # In-browser runtime service + file utils
│  ├─ workspace/           # Zustand store (files, chat, terminal, preview)
│  ├─ billing/             # Razorpay provider + plans (Stripe-ready)
│  └─ templates/           # Starter template catalog
├─ lib/                    # prisma, env, utils, mock data
├─ config/                 # site config + routes
└─ middleware.ts           # Clerk route protection (demo passthrough)

prisma/schema.prisma        # User, Project, File, Message, Generation,
                            # Deployment, Subscription, Payment, UsageEvent, ApiKey
docker-compose.yml          # Local PostgreSQL 16
```

---

## How the AI pipeline works

```
Prompt ─▶ Planner ─▶ Architect ─▶ Generator ─▶ File Operation ─▶ Reviewer
            │            │            │              │               │
         execution    project       complete       apply          quality
           plan      blueprint     file contents   changes        gate (retry)
```

Each agent implements a common `Agent` interface and emits streamed events
(`phase`, `log`, `file`, `review`, …). The `Orchestrator` threads a shared
context through the agents and retries generation if the Reviewer rejects.
Events drive the live workspace UI; the server route at `/api/chat` streams the
same events as NDJSON.

---

## Live preview (WebContainers)

The in-browser preview requires a **cross-origin-isolated** context
(`SharedArrayBuffer`). The required `COOP`/`COEP` headers are set globally in
`next.config.ts`. Preview works in modern Chromium-based desktop browsers; the
rest of the workspace works everywhere and degrades gracefully where the runtime
is unavailable.

---

## Production build

```bash
pnpm build
pnpm start
```

The build is verified to compile with strict TypeScript and zero lint errors.

---

## Notes / roadmap

- **Demo mode** is intentional: no keys are needed to explore the full UI. Agents
  operate on an in-memory workspace and produce deterministic scaffolds.
- **Next steps to go fully live:** persist agent output to the Prisma data layer,
  attach real Clerk users to projects, and connect the Razorpay checkout widget on
  the client using the session returned by `/api/billing/checkout`.
