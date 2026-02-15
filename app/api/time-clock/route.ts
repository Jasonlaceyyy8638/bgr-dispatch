import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

// POST: clock in, clock out, break in, break out (body: { action: 'in'|'out'|'break_in'|'break_out', tech_id: string, job_id?: number })
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = ['out', 'break_in', 'break_out'].includes(body?.action) ? body.action : 'in';
    const techId = body?.tech_id?.trim();
    if (!techId) {
      return NextResponse.json({ error: 'tech_id required' }, { status: 400 });
    }
    const jobId = body?.job_id != null ? Number(body.job_id) : null;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, anonKey);

    if (action === 'in') {
      const insert: { tech_id: string; clock_in: string; job_id?: number } = {
        tech_id: techId,
        clock_in: new Date().toISOString(),
      };
      if (jobId != null && !Number.isNaN(jobId)) insert.job_id = jobId;
      const { data, error } = await supabase
        .from('time_entries')
        .insert(insert)
        .select('id, clock_in, job_id')
        .single();
      if (error) {
        console.error('Time clock in error:', error);
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true, action: 'in', entry: data });
    }

    const { data: open, error: openErr } = await supabase
      .from('time_entries')
      .select('id, break_start, break_end')
      .eq('tech_id', techId)
      .is('clock_out', null)
      .order('clock_in', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (openErr || !open?.id) {
      return NextResponse.json(
        { error: action === 'out' ? 'No open clock-in found. Clock in first.' : 'No open shift to set break on.' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    if (action === 'break_in') {
      const { error: upErr } = await supabase
        .from('time_entries')
        .update({ break_start: now })
        .eq('id', open.id);
      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });
      return NextResponse.json({ ok: true, action: 'break_in', break_start: now });
    }
    if (action === 'break_out') {
      const { error: upErr } = await supabase
        .from('time_entries')
        .update({ break_end: now })
        .eq('id', open.id);
      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });
      return NextResponse.json({ ok: true, action: 'break_out', break_end: now });
    }

    // Clock out
    const { error: updateErr } = await supabase
      .from('time_entries')
      .update({ clock_out: now })
      .eq('id', open.id);
    if (updateErr) {
      console.error('Time clock out error:', updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true, action: 'out', clock_out: now });
  } catch (e) {
    console.error('Time clock error:', e);
    return NextResponse.json({ error: 'Failed to save time' }, { status: 500 });
  }
}

// GET: list entries for a tech (query: tech_id, date=YYYY-MM-DD) or all techs for admin (query: all=1, date=YYYY-MM-DD)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const techId = searchParams.get('tech_id')?.trim();
    const all = searchParams.get('all') === '1';
    const dateParam = searchParams.get('date')?.trim() || new Date().toISOString().slice(0, 10);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, anonKey);

    const dayStart = `${dateParam}T00:00:00.000Z`;
    const dayEnd = `${dateParam}T23:59:59.999Z`;

    if (all) {
      const { data: entries, error: entriesErr } = await supabase
        .from('time_entries')
        .select('id, tech_id, clock_in, clock_out, break_start, break_end, job_id, edited_at, edit_note')
        .gte('clock_in', dayStart)
        .lte('clock_in', dayEnd)
        .order('clock_in', { ascending: true });
      if (entriesErr) {
        return NextResponse.json({ error: entriesErr.message }, { status: 400 });
      }
      const techIds = [...new Set((entries || []).map((e: { tech_id: string }) => e.tech_id))];
      const jobIds = [...new Set((entries || []).map((e: { job_id?: number | null }) => e.job_id).filter(Boolean))] as number[];
      let techNames: Record<string, string> = {};
      let jobLabels: Record<string, string> = {};
      if (techIds.length > 0) {
        const { data: techs } = await supabase.from('tech_users').select('id, name').in('id', techIds);
        techNames = (techs || []).reduce((acc: Record<string, string>, t: { id: string; name: string }) => {
          acc[t.id] = t.name || '—';
          return acc;
        }, {});
      }
      if (jobIds.length > 0) {
        const { data: jobs } = await supabase.from('jobs').select('id, customer_name').in('id', jobIds);
        (jobs || []).forEach((j: { id: number; customer_name?: string }) => {
          jobLabels[String(j.id)] = j.customer_name || `Job #${j.id}`;
        });
      }
      return NextResponse.json({
        date: dateParam,
        entries: (entries || []).map((e: { tech_id: string; job_id?: number | null; [k: string]: unknown }) => ({
          ...e,
          tech_name: techNames[e.tech_id] || '—',
          job_label: e.job_id ? jobLabels[String(e.job_id)] || `#${e.job_id}` : null,
        })),
      });
    }

    if (!techId) {
      return NextResponse.json({ error: 'tech_id required' }, { status: 400 });
    }

    const { data: entries, error } = await supabase
      .from('time_entries')
      .select('id, clock_in, clock_out, break_start, break_end, job_id, edited_at, edit_note')
      .eq('tech_id', techId)
      .gte('clock_in', dayStart)
      .lte('clock_in', dayEnd)
      .order('clock_in', { ascending: true });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ date: dateParam, entries: entries || [] });
  } catch (e) {
    console.error('Time clock GET error:', e);
    return NextResponse.json({ error: 'Failed to load time entries' }, { status: 500 });
  }
}
