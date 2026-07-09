# WebFlowAI

AI-powered app builder. Describe what you want, get working code running live in your browser.

## Stack

- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS, Zustand
- **AI:** Vercel AI SDK + Google Vertex AI (Gemini)
- **Runtime:** WebContainer API (in-browser Node.js)
- **Auth:** Clerk
- **Database:** PostgreSQL + Prisma
- **Billing:** Razorpay

## Setup

```bash
pnpm install
cp .env.example .env   # fill in your keys
docker compose up -d   # starts postgres
pnpm db:push           # creates tables
pnpm dev               # http://localhost:3000
```

## Environment

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection |
| `GOOGLE_VERTEX_API_KEY` | AI generation (Gemini) |
| `WEBFLOWAI_MODEL` | Model name (default: `gemini-2.5-flash`) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk auth (public) |
| `CLERK_SECRET_KEY` | Clerk auth (server) |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` | Billing |

## How it works

```
User prompt → /api/chat → Gemini generates code → Verifier checks for errors → Auto-fix if needed → Stream results to browser → WebContainer runs it live
```

## Docker

```bash
docker compose up --build
```

Runs the app + postgres. Available at `http://localhost:3000`.
