import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

// POST: find techs still clocked in (open punch from previous day or older) and send SMS reminder. Call from cron or manually.
export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, anonKey);

    const now = new Date();
    const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const cutoff = endOfYesterday.toISOString();

    const { data: openEntries, error: openErr } = await supabase
      .from('time_entries')
      .select('id, tech_id, clock_in')
      .is('clock_out', null)
      .lt('clock_in', cutoff)
      .order('clock_in', { ascending: false });
    if (openErr) {
      return NextResponse.json({ error: openErr.message }, { status: 400 });
    }
    const entries = openEntries || [];
    if (entries.length === 0) {
      return NextResponse.json({ ok: true, reminded: [], message: 'No open punches to remind' });
    }

    const techIds = [...new Set(entries.map((e: { tech_id: string }) => e.tech_id))];
    const { data: techs } = await supabase.from('tech_users').select('id, name, phone').in('id', techIds);
    const techMap = (techs || []).reduce((acc: Record<string, { name: string; phone: string | null }>, t: { id: string; name: string; phone?: string | null }) => {
      acc[t.id] = { name: t.name || '—', phone: t.phone ?? null };
      return acc;
    }, {});

    const reminded: { tech_id: string; name: string; sent: boolean }[] = [];
    let smsSent = 0;

    if (process.env.RINGCENTRAL_CLIENT_ID && process.env.RINGCENTRAL_JWT && process.env.RINGCENTRAL_FROM_NUMBER) {
      const SDK = require('@ringcentral/sdk').SDK;
      const rcsdk = new SDK({
        server: process.env.RINGCENTRAL_SERVER_URL,
        clientId: process.env.RINGCENTRAL_CLIENT_ID,
        clientSecret: process.env.RINGCENTRAL_CLIENT_SECRET,
      });
      const platform = rcsdk.platform();
      await platform.login({ jwt: process.env.RINGCENTRAL_JWT });

      for (const techId of techIds) {
        const tech = techMap[techId];
        const name = tech?.name || '—';
        const phone = tech?.phone?.trim();
        if (!phone) {
          reminded.push({ tech_id: techId, name, sent: false });
          continue;
        }
        const message = `BGR Dispatch: You appear to still be clocked in from a previous shift. Please clock out in the app if you forgot.`;
        try {
          await platform.post('/restapi/v1.0/account/~/extension/~/sms', {
            from: { phoneNumber: process.env.RINGCENTRAL_FROM_NUMBER },
            to: [{ phoneNumber: phone }],
            text: message,
          });
          reminded.push({ tech_id: techId, name, sent: true });
          smsSent++;
        } catch (err) {
          console.error('Remind SMS error for', techId, err);
          reminded.push({ tech_id: techId, name, sent: false });
        }
      }
    } else {
      for (const techId of techIds) {
        const tech = techMap[techId];
        reminded.push({ tech_id: techId, name: tech?.name || '—', sent: false });
      }
    }

    return NextResponse.json({
      ok: true,
      reminded,
      open_count: entries.length,
      sms_sent: smsSent,
      message: smsSent > 0 ? `Reminder sent to ${smsSent} tech(s).` : 'No SMS sent (missing RingCentral config or phone numbers).',
    });
  } catch (e) {
    console.error('Time clock remind error:', e);
    return NextResponse.json({ error: 'Remind failed' }, { status: 500 });
  }
}
