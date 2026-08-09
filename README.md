# WebFlowAI

AI-powered app builder. Describe what you want, get working code running live in your browser.

## Stack

- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS, Zustand
- **AI:** Vercel AI SDK + Azure OpenAI
- **Runtime:** E2B (remote Node.js sandboxes)
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
| `AZURE_OPENAI_API_KEY` | Azure OpenAI API key |
| `AZURE_RESOURCE_NAME` | Azure OpenAI resource name |
| `WEBFLOWAI_MODEL` | Azure deployment name |
| `E2B_API_KEY` | E2B sandbox API key |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk auth (public) |
| `CLERK_SECRET_KEY` | Clerk auth (server) |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` | Billing |

## How it works

```
User prompt → /api/chat → Azure OpenAI generates files → Stream results to browser → E2B runs the app
```

## Docker

```bash
docker compose up --build
```

Runs the app + postgres. Available at `http://localhost:3000`.
