import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone')?.trim().replace(/\D/g, '');
    if (!phone || phone.length < 7) {
      return NextResponse.json({ hint: null, lastJob: null });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ hint: null, lastJob: null });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    const normalized = phone.replace(/\D/g, '');
    const formats = [normalized];
    if (normalized.length === 10) {
      formats.push(`${normalized.slice(0, 3)}-${normalized.slice(3, 6)}-${normalized.slice(6)}`);
    }
    const orClause = formats.map((f) => `phone_number.eq.${f}`).join(',');
    const { data: jobs } = await supabase
      .from('jobs')
      .select('id, customer_name, phone_number, created_at, service_type, job_description, status')
      .or(orClause)
      .order('created_at', { ascending: false })
      .limit(5);

    const list = jobs || [];
    const byPhone = list.filter((j: any) => (String(j.phone_number || '').replace(/\D/g, '')) === normalized);
    const last = byPhone[0] || list[0];

    if (!last) {
      return NextResponse.json({ hint: 'New customer', lastJob: null });
    }

    const date = last.created_at ? new Date(last.created_at).toLocaleDateString() : '';
    const service = (last.service_type || last.job_description || 'Job').slice(0, 50);
    return NextResponse.json({
      hint: 'Existing customer',
      lastJob: {
        date,
        service,
        status: last.status,
        id: last.id,
      },
    });
  } catch {
    return NextResponse.json({ hint: null, lastJob: null });
  }
}
