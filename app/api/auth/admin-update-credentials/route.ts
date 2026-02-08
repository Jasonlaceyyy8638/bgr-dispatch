import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { currentPassword, newEmail, newPassword, adminId } = body;
    if (!currentPassword || typeof currentPassword !== 'string') {
      return NextResponse.json({ error: 'Current password required' }, { status: 400 });
    }
    const hasNewEmail = typeof newEmail === 'string' && newEmail.trim().length > 0;
    const hasNewPassword = typeof newPassword === 'string' && newPassword.trim().length >= 6;
    if (!hasNewEmail && !hasNewPassword) {
      return NextResponse.json({ error: 'Provide new email and/or new password (min 6 characters)' }, { status: 400 });
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

    const { data: user, error: fetchError } = await supabase
      .from('tech_users')
      .select('id, email, password_hash')
      .eq('id', id)
      .eq('role', 'admin')
      .single();

    if (fetchError || !user?.password_hash) {
      return NextResponse.json({ error: 'Admin not found or not set up' }, { status: 401 });
    }

    const match = await bcrypt.compare(currentPassword, user.password_hash);
    if (!match) {
      return NextResponse.json({ error: 'Current password is wrong' }, { status: 401 });
    }

    const updates: { email?: string; password_hash?: string } = {};
    if (hasNewEmail) {
      updates.email = (newEmail as string).trim().toLowerCase();
    }
    if (hasNewPassword) {
      updates.password_hash = await bcrypt.hash((newPassword as string).trim(), 10);
    }

    const { error: updateError } = await supabase
      .from('tech_users')
      .update(updates)
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Admin update credentials error:', e);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
