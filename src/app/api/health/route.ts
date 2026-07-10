export async function GET() {
  console.log(`[health] ping ${new Date().toISOString()}`);
  return Response.json({ status: 'healthy' }, { status: 200 });
}
