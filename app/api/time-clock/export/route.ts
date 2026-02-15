import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

function workedMinutes(entry: { clock_in: string; clock_out: string | null; break_start?: string | null; break_end?: string | null }) {
  const end = entry.clock_out ? new Date(entry.clock_out).getTime() : Date.now();
  let mins = (end - new Date(entry.clock_in).getTime()) / 60000;
  if (entry.break_start && entry.break_end) {
    mins -= (new Date(entry.break_end).getTime() - new Date(entry.break_start).getTime()) / 60000;
  } else if (entry.break_start && !entry.clock_out) {
    mins -= (Date.now() - new Date(entry.break_start).getTime()) / 60000;
  }
  return mins;
}

// GET: pay period export ?from=YYYY-MM-DD&to=YYYY-MM-DD returns CSV
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get('from')?.trim();
    const toParam = searchParams.get('to')?.trim();
    if (!fromParam || !toParam) {
      return NextResponse.json({ error: 'from and to (YYYY-MM-DD) required' }, { status: 400 });
    }
    const from = `${fromParam}T00:00:00.000Z`;
    const to = `${toParam}T23:59:59.999Z`;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, anonKey);

    const { data: entries, error } = await supabase
      .from('time_entries')
      .select('id, tech_id, clock_in, clock_out, break_start, break_end, job_id, edited_at, edit_note')
      .gte('clock_in', from)
      .lte('clock_in', to)
      .order('clock_in', { ascending: true });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const list = entries || [];
    const techIds = [...new Set(list.map((e: { tech_id: string }) => e.tech_id))];
    let techNames: Record<string, string> = {};
    if (techIds.length > 0) {
      const { data: techs } = await supabase.from('tech_users').select('id, name').in('id', techIds);
      techNames = (techs || []).reduce((acc: Record<string, string>, t: { id: string; name: string }) => {
        acc[t.id] = t.name || '—';
        return acc;
      }, {});
    }

    const rows: string[][] = [
      ['Tech', 'Date', 'Clock In', 'Clock Out', 'Break (min)', 'Worked (min)', 'Worked (hours)', 'Job ID', 'Edited', 'Note'],
    ];
    for (const e of list) {
      const mins = workedMinutes(e);
      const breakMins =
        e.break_start && e.break_end
          ? (new Date(e.break_end).getTime() - new Date(e.break_start).getTime()) / 60000
          : e.break_start && !e.clock_out
            ? (Date.now() - new Date(e.break_start).getTime()) / 60000
            : 0;
      const date = e.clock_in.slice(0, 10);
      const clockIn = new Date(e.clock_in).toLocaleString();
      const clockOut = e.clock_out ? new Date(e.clock_out).toLocaleString() : '';
      rows.push([
        techNames[e.tech_id] || e.tech_id,
        date,
        clockIn,
        clockOut,
        String(Math.round(breakMins)),
        String(Math.round(mins)),
        (mins / 60).toFixed(2),
        e.job_id != null ? String(e.job_id) : '',
        e.edited_at ? 'Yes' : '',
        (e.edit_note || '').replace(/"/g, '""'),
      ]);
    }

    const csv = rows.map((r) => r.map((c) => (c.includes(',') || c.includes('"') ? `"${c}"` : c)).join(',')).join('\n');
    const bom = '\uFEFF';
    return new NextResponse(bom + csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="time-clock-${fromParam}-${toParam}.csv"`,
      },
    });
  } catch (e) {
    console.error('Time clock export error:', e);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
