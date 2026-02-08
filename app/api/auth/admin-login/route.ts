import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    const trimmedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!trimmedEmail || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: user, error } = await supabase
      .from('tech_users')
      .select('id, name, role, email, password_hash')
      .eq('role', 'admin')
      .eq('email', trimmedEmail)
      .single();

    if (error || !user?.password_hash) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const match = await bcrypt.compare(String(password), user.password_hash);
    if (!match) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const { password_hash: _, ...safeUser } = user;
    return NextResponse.json({ user: safeUser });
  } catch (e) {
    console.error('Admin login error:', e);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
