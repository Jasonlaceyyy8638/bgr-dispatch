import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    return NextResponse.json(
      { error: 'STRIPE_SECRET_KEY not set' },
      { status: 500 }
    );
  }
  const stripe = new Stripe(secretKey);
  try {
    const { amount } = await request.json();
    const amountCents = Math.round(Number(amount) * 100);

    if (!amountCents || amountCents < 50) {
      return NextResponse.json(
        { error: 'Amount must be at least $0.50' },
        { status: 400 }
      );
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Stripe error';
    console.error('Stripe payment-intent error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}