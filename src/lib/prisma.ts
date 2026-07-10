import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const url = process.env.DATABASE_URL!;

// AWS RDS global CA bundle, committed at the project root. Verifying against it
// lets us keep certificate validation on instead of `rejectUnauthorized: false`.

const ca = readFileSync(join(process.cwd(), "global-bundle.pem"), "utf8");

const adapter = new PrismaPg({
  connectionString: url,
  ssl: {
    ca,
    rejectUnauthorized: true,
  },
  connectionTimeoutMillis: 10_000,
});

const global = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  global.prisma ?? (global.prisma = new PrismaClient({ adapter }));
