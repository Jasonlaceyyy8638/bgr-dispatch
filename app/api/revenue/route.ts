import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Missing Supabase config', txs: [] }, { status: 200 });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('id, customer_name, job_description, service_type, price, payment_amount, payment_method, created_at, assigned_tech_id')
      .eq('status', 'Closed')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      console.error('Revenue fetch error:', error);
      return NextResponse.json({ error: error.message, txs: [] }, { status: 200 });
    }
    const list = (jobs ?? []).filter((j: any) => (Number(j.price) || Number(j.payment_amount) || 0) > 0);
    const techIds = [...new Set(list.map((j: any) => j.assigned_tech_id).filter(Boolean))] as string[];
    let byId: Record<string, string> = {};
    if (techIds.length > 0) {
      const { data: techs } = await supabase.from('tech_users').select('id, name').in('id', techIds);
      byId = Object.fromEntries((techs ?? []).map((t: any) => [t.id, t.name]));
    }
    const txs = list.map((j: any) => {
      const amt = Number(j.payment_amount) || Number(j.price) || 0;
      const d = j.created_at ? new Date(j.created_at) : new Date();
      const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      return {
        id: j.id,
        time,
        name: j.customer_name || '—',
        service: (j.service_type || j.job_description || 'Service').slice(0, 80),
        tech: j.assigned_tech_id ? (byId[j.assigned_tech_id] ?? '—') : '—',
        amount: `+$${amt.toFixed(2)}`,
        amountNum: amt,
      };
    });
    return NextResponse.json({ txs, error: null });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load revenue';
    console.error('Revenue error:', e);
    return NextResponse.json({ error: message, txs: [] }, { status: 200 });
  }
}
