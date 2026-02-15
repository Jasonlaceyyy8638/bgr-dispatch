import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

// PATCH: admin edit punch (body: { clock_in?, clock_out?, edit_note? })
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id?.trim()) {
      return NextResponse.json({ error: 'Entry id required' }, { status: 400 });
    }
    const body = await request.json();
    const updates: { clock_in?: string; clock_out?: string | null; edit_note?: string | null; edited_at?: string } = {};
    if (body.clock_in != null) updates.clock_in = body.clock_in;
    if (body.clock_out !== undefined) updates.clock_out = body.clock_out === '' || body.clock_out == null ? null : body.clock_out;
    if (body.edit_note !== undefined) updates.edit_note = body.edit_note === '' ? null : body.edit_note;
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }
    updates.edited_at = new Date().toISOString();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, anonKey);

    const { data, error } = await supabase
      .from('time_entries')
      .update(updates)
      .eq('id', id.trim())
      .select('id, clock_in, clock_out, edited_at, edit_note')
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true, entry: data });
  } catch (e) {
    console.error('Time clock PATCH error:', e);
    return NextResponse.json({ error: 'Failed to update punch' }, { status: 500 });
  }
}
