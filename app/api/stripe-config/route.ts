import { NextResponse } from 'next/server';

export async function GET() {
  const key =
    process.env.STRIPE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ||
    '';
  return NextResponse.json({ publishableKey: key });
}
