export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const [{ getRedis }, { prisma }] = await Promise.all([
      import("@/lib/redis"),
      import("@/lib/prisma"),
    ]);

    // Check both services in the background so availability doesn't block startup.
    void getRedis().catch(() =>
      console.error("[redis] Startup connection failed"),
    );
    void prisma.$queryRaw`SELECT 1`
      .then(() => console.log("[db] Connected successfully"))
      .catch(() => console.error("[db] Startup connection failed"));
  }
}
