import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { name, phone } = await req.json();
    const trimmedPhone = typeof phone === 'string' ? phone.trim() : '';
    const trimmedName = typeof name === 'string' ? name.trim() : '';
    if (!trimmedName) {
      return NextResponse.json({ error: 'Name required' }, { status: 400 });
    }
    if (!trimmedPhone) {
      return NextResponse.json({ error: 'Phone required to save customer' }, { status: 400 });
    }
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Server missing Supabase config' }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { error } = await supabase.from('customers').upsert(
      { name: trimmedName, phone: trimmedPhone },
      { onConflict: 'phone' }
    );
    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json(
          { error: 'Customers table not found. Run the SQL in supabase-customers-table.sql in Supabase → SQL Editor.' },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to save customer';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
