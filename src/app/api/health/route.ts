import { NextResponse } from 'next/server';


export const dynamic = 'force-dynamic'; 

export async function GET() {
  console.log(`[health] ping ${new Date().toISOString()}`);
  return NextResponse.json({ status: 'healthy' }, { status: 200 });
}
