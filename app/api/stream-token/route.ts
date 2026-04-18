import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';

const STREAM_API_KEY = process.env.NEXT_PUBLIC_STREAM_API_KEY!;
const STREAM_API_SECRET = process.env.STREAM_API_SECRET!;

function generateStreamToken(userId: string): string {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 60 * 60 * 4; // 4 hours

  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ user_id: userId, iat: now, exp })).toString('base64url');

  const sig = createHmac('sha256', STREAM_API_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');

  return `${header}.${payload}.${sig}`;
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    if (!STREAM_API_SECRET) {
      return NextResponse.json({ token: 'demo_token', apiKey: STREAM_API_KEY, userId });
    }

    const token = generateStreamToken(userId);
    return NextResponse.json({ token, apiKey: STREAM_API_KEY, userId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
