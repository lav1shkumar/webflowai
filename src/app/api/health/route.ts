import { pingDb } from "@/lib/prisma";

// Never cache the health/db probe.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const wantDb = new URL(req.url).searchParams.has("db");

  if (!wantDb) {
    return Response.json({ status: "ok" }, { status: 200 });
  }

  const started = Date.now();
  try {
    await pingDb();
    return Response.json(
      { status: "ok", db: "reachable", ms: Date.now() - started },
      { status: 200 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[health] db probe failed", err);
    return Response.json(
      { status: "error", db: "unreachable", ms: Date.now() - started, error: message },
      { status: 503 },
    );
  }
}
