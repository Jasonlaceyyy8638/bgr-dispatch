import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const VALID_STATUSES = ['booked', 'Authorized', 'Closed', 'en_route', 'on_site'];

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const id = body.id != null ? String(body.id).trim() : '';
    if (!id) {
      return NextResponse.json({ error: 'Job id required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    const updates: Record<string, unknown> = {};
    if (body.status !== undefined) {
      const s = String(body.status).trim();
      if (VALID_STATUSES.includes(s)) updates.status = s;
    }
    if (body.assigned_tech_id !== undefined) {
      updates.assigned_tech_id = body.assigned_tech_id === '' || body.assigned_tech_id == null ? null : String(body.assigned_tech_id);
    }
    if (body.dispatcher_notes !== undefined) {
      updates.dispatcher_notes = body.dispatcher_notes === '' ? null : String(body.dispatcher_notes);
    }
    if (body.job_photo_url !== undefined) {
      updates.job_photo_url = body.job_photo_url === '' ? null : String(body.job_photo_url);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { error } = await supabase.from('jobs').update(updates).eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Update job error:', e);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
