import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { jobId } = body;
    if (!jobId || typeof jobId !== 'string') {
      return NextResponse.json({ error: 'jobId required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: job, error: jobErr } = await supabase
      .from('jobs')
      .select('customer_name, street_address, city, scheduled_date, start_time, assigned_tech_id')
      .eq('id', jobId.trim())
      .single();

    if (jobErr || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    if (!job.assigned_tech_id) {
      return NextResponse.json({ ok: true, skipped: 'no tech assigned' });
    }

    const { data: tech, error: techErr } = await supabase
      .from('tech_users')
      .select('phone')
      .eq('id', job.assigned_tech_id)
      .single();

    if (techErr || !tech?.phone?.trim()) {
      return NextResponse.json({ ok: true, skipped: 'tech has no phone' });
    }

    const address = [job.street_address, job.city].filter(Boolean).join(', ') || 'Address TBD';
    const when = [job.scheduled_date, job.start_time].filter(Boolean).join(' ') || 'Time TBD';
    const message = `BGR Dispatch: New job - ${job.customer_name || 'Customer'}, ${address}. ${when}`;

    const SDK = require('@ringcentral/sdk').SDK;
    const rcsdk = new SDK({
      server: process.env.RINGCENTRAL_SERVER_URL,
      clientId: process.env.RINGCENTRAL_CLIENT_ID,
      clientSecret: process.env.RINGCENTRAL_CLIENT_SECRET,
    });
    const platform = rcsdk.platform();
    await platform.login({ jwt: process.env.RINGCENTRAL_JWT });
    await platform.post('/restapi/v1.0/account/~/extension/~/sms', {
      from: { phoneNumber: process.env.RINGCENTRAL_FROM_NUMBER },
      to: [{ phoneNumber: tech.phone.trim() }],
      text: message,
    });

    return NextResponse.json({ ok: true, sent: true });
  } catch (err: unknown) {
    console.error('Notify tech error:', err);
    const msg = err instanceof Error ? err.message : 'Failed to send SMS';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
