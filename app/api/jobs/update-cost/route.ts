import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const id = body.id != null ? String(body.id).trim() : '';
    const costAmount = body.cost_amount != null ? Number(body.cost_amount) : null;
    if (!id) {
      return NextResponse.json({ error: 'Job id required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error } = await supabase
      .from('jobs')
      .update({ cost_amount: costAmount })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Update job cost error:', e);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
