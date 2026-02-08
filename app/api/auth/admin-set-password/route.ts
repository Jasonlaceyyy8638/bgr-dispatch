import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

/** Set or reset admin email + password (e.g. first-time setup). No current password required. */
export async function POST(req: Request) {
  try {
    const { email, password, adminId } = await req.json();
    const trimmedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const trimmedPassword = typeof password === 'string' ? password.trim() : '';
    if (!trimmedEmail || trimmedPassword.length < 6) {
      return NextResponse.json({ error: 'Email and password (min 6 characters) required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    const id = typeof adminId === 'string' ? adminId.trim() : '';
    if (!id) {
      return NextResponse.json({ error: 'Admin ID required' }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('tech_users')
      .select('id, role')
      .eq('id', id)
      .eq('role', 'admin')
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Admin user not found' }, { status: 404 });
    }

    const password_hash = await bcrypt.hash(trimmedPassword, 10);
    const { error } = await supabase
      .from('tech_users')
      .update({ email: trimmedEmail, password_hash })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Admin set password error:', e);
    return NextResponse.json({ error: 'Setup failed' }, { status: 500 });
  }
}
