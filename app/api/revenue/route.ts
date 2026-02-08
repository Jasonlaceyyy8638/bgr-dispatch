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

    let jobs: any[] | null = null;
    let hasCostColumn = false;
    const selectWithCost = 'id, customer_name, job_description, service_type, price, payment_amount, cost_amount, payment_method, created_at, assigned_tech_id';
    const selectWithoutCost = 'id, customer_name, job_description, service_type, price, payment_amount, payment_method, created_at, assigned_tech_id';

    const { data: dataWithCost, error: errWithCost } = await supabase
      .from('jobs')
      .select(selectWithCost)
      .eq('status', 'Closed')
      .order('created_at', { ascending: false })
      .limit(100);

    if (errWithCost && (errWithCost.message?.includes('cost_amount') || errWithCost.message?.includes('does not exist'))) {
      const { data: dataNoCost, error: errNoCost } = await supabase
        .from('jobs')
        .select(selectWithoutCost)
        .eq('status', 'Closed')
        .order('created_at', { ascending: false })
        .limit(100);
      if (errNoCost) {
        console.error('Revenue fetch error:', errNoCost);
        return NextResponse.json({ error: errNoCost.message, txs: [] }, { status: 200 });
      }
      jobs = dataNoCost;
      hasCostColumn = false;
    } else if (errWithCost) {
      console.error('Revenue fetch error:', errWithCost);
      return NextResponse.json({ error: errWithCost.message, txs: [] }, { status: 200 });
    } else {
      jobs = dataWithCost;
      hasCostColumn = true;
    }

    const list = (jobs ?? []).filter((j: any) => (Number(j.price) || Number(j.payment_amount) || 0) > 0);
    const techIds = [...new Set(list.map((j: any) => j.assigned_tech_id).filter(Boolean))] as string[];
    let byId: Record<string, string> = {};
    if (techIds.length > 0) {
      const { data: techs } = await supabase.from('tech_users').select('id, name').in('id', techIds);
      byId = Object.fromEntries((techs ?? []).map((t: any) => [t.id, t.name]));
    }
    const cardFeePercent = Number(process.env.CARD_FEE_PERCENT) || 2.9;
    const cardFeeFixed = Number(process.env.CARD_FEE_FIXED) || 0.3;

    function cardFeeForJob(j: any): number {
      const method = (j.payment_method || '').toString().toLowerCase();
      if (method !== 'card') return 0;
      const amt = Number(j.payment_amount) || Number(j.price) || 0;
      const fee = amt * (cardFeePercent / 100) + cardFeeFixed;
      return Math.round(fee * 100) / 100;
    }

    const totalRevenue = list.reduce((s: number, j: any) => s + (Number(j.payment_amount) || Number(j.price) || 0), 0);
    const manualCost = hasCostColumn ? list.reduce((s: number, j: any) => s + (Number(j.cost_amount) || 0), 0) : 0;
    const totalCardFees = list.reduce((s: number, j: any) => s + cardFeeForJob(j), 0);
    const totalCost = manualCost + totalCardFees;
    const netProfit = totalRevenue - totalCost;

    const txs = list.map((j: any) => {
      const amt = Number(j.payment_amount) || Number(j.price) || 0;
      const d = j.created_at ? new Date(j.created_at) : new Date();
      const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      const costAmt = hasCostColumn ? (Number(j.cost_amount) || 0) : 0;
      const cardFeeAmt = cardFeeForJob(j);
      return {
        id: j.id,
        time,
        name: j.customer_name || '—',
        service: (j.service_type || j.job_description || 'Service').slice(0, 80),
        tech: j.assigned_tech_id ? (byId[j.assigned_tech_id] ?? '—') : '—',
        amount: `+$${amt.toFixed(2)}`,
        amountNum: amt,
        costAmount: costAmt,
        cardFeeAmount: cardFeeAmt,
        paymentMethod: (j.payment_method || '').toString(),
      };
    });
    return NextResponse.json({
      txs,
      totalRevenue,
      totalCost,
      totalCardFees,
      netProfit,
      cardFeePercent,
      cardFeeFixed,
      error: null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load revenue';
    console.error('Revenue error:', e);
    return NextResponse.json({ error: message, txs: [] }, { status: 200 });
  }
}
