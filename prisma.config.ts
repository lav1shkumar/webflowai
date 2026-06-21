import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Prisma 7 configuration.
 *
 * In Prisma 7 the connection URL is no longer declared in `schema.prisma`.
 * The CLI (migrate / db push / studio) reads it from here, while the runtime
 * Prisma Client connects through a driver adapter (see `src/lib/prisma.ts`).
 *
 * We read `process.env.DATABASE_URL` directly (rather than the `env()` helper)
 * so commands that don't need a database — e.g. `prisma generate` during a
 * type-check or CI build — don't fail when the variable is absent.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
