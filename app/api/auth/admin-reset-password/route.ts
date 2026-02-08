import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

/** Reset admin password when forgotten. Requires ADMIN_PASSWORD_RESET_SECRET in env. */
export async function POST(req: Request) {
  try {
    const { email, newPassword, resetCode } = await req.json();
    const trimmedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const trimmedPassword = typeof newPassword === 'string' ? newPassword.trim() : '';
    if (!trimmedEmail || trimmedPassword.length < 6) {
      return NextResponse.json({ error: 'Email and new password (min 6 characters) required' }, { status: 400 });
    }

    const secret = process.env.ADMIN_PASSWORD_RESET_SECRET;
    if (!secret || typeof resetCode !== 'string' || resetCode.trim() !== secret) {
      return NextResponse.json({ error: 'Invalid reset code' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: user, error: fetchError } = await supabase
      .from('tech_users')
      .select('id, role')
      .eq('role', 'admin')
      .eq('email', trimmedEmail)
      .single();

    if (fetchError || !user) {
      return NextResponse.json({ error: 'No admin account with that email' }, { status: 404 });
    }

    const password_hash = await bcrypt.hash(trimmedPassword, 10);
    const { error: updateError } = await supabase
      .from('tech_users')
      .update({ password_hash })
      .eq('id', user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Admin reset password error:', e);
    return NextResponse.json({ error: 'Reset failed' }, { status: 500 });
  }
}
