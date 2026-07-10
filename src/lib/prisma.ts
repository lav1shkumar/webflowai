import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const LOG = "[prisma]";

/** Mask credentials so we can safely log the connection target. */
function describeUrl(raw: string | undefined): string {
  if (!raw) return "<empty>";
  try {
    const u = new URL(raw);
    return `${u.protocol}//${u.username ? "***" : ""}@${u.hostname}:${u.port}${u.pathname}${u.search}`;
  } catch {
    return "<unparseable>";
  }
}

const url = process.env.DATABASE_URL!;

console.log(`${LOG} boot`, {
  cwd: process.cwd(),
  nodeEnv: process.env.NODE_ENV,
  hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
  target: describeUrl(process.env.DATABASE_URL),
});

// AWS RDS global CA bundle, committed at the project root. Verifying against it
// lets us keep certificate validation on instead of `rejectUnauthorized: false`.
const caPath = join(process.cwd(), "global-bundle.pem");
let ca: string;
try {
  ca = readFileSync(caPath, "utf8");
  console.log(`${LOG} loaded CA bundle`, { caPath, bytes: ca.length });
} catch (err) {
  console.error(`${LOG} FAILED to read CA bundle`, { caPath, err });
  throw err;
}

const adapter = new PrismaPg({
  connectionString: url,
  ssl: {
    ca,
    rejectUnauthorized: true,
  },
  // Fail fast instead of hanging forever when the DB is unreachable.
  connectionTimeoutMillis: 10_000,
});

console.log(`${LOG} adapter created (connectionTimeoutMillis=10000)`);

const global = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  global.prisma ??
  (global.prisma = new PrismaClient({
    adapter,
    // Surface every query + error to stdout so CloudWatch shows exactly where
    // a request stalls or fails.
    log: [
      { level: "query", emit: "event" },
      { level: "error", emit: "event" },
      { level: "warn", emit: "event" },
      { level: "info", emit: "event" },
    ],
  }));

// Attach listeners once (guard against re-registration on hot reload).
const g = global as unknown as { prismaLogging?: boolean };
if (!g.prismaLogging) {
  g.prismaLogging = true;
  // @ts-expect-error event typings depend on the `log` config above
  prisma.$on("query", (e: { query: string; duration: number }) => {
    console.log(`${LOG} query (${e.duration}ms): ${e.query}`);
  });
  // @ts-expect-error event typings depend on the `log` config above
  prisma.$on("error", (e: unknown) => {
    console.error(`${LOG} error`, e);
  });
  // @ts-expect-error event typings depend on the `log` config above
  prisma.$on("warn", (e: unknown) => {
    console.warn(`${LOG} warn`, e);
  });
  // @ts-expect-error event typings depend on the `log` config above
  prisma.$on("info", (e: unknown) => {
    console.info(`${LOG} info`, e);
  });
}

/**
 * One-shot connectivity probe. Logs how long it takes to reach the DB (or how
 * it fails). Call this from a route/server action while debugging.
 */
export async function pingDb(): Promise<void> {
  const started = Date.now();
  console.log(`${LOG} ping: connecting...`);
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log(`${LOG} ping: OK in ${Date.now() - started}ms`);
  } catch (err) {
    console.error(`${LOG} ping: FAILED after ${Date.now() - started}ms`, err);
    throw err;
  }
}
