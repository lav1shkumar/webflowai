export async function GET() {
  console.log(`[health] ping ${new Date().toISOString()}`);
  return Response.json({ status: "ok" }, { status: 200 });
}
