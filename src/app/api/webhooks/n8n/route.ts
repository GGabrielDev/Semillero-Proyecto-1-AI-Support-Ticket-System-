import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const secret = process.env.N8N_WEBHOOK_SECRET;
  const providedSecret = request.headers.get('x-webhook-secret');

  if (!secret || providedSecret !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ received: true });
}
