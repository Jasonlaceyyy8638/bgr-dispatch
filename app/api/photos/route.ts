import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const supabase = serviceKey
      ? createClient(supabaseUrl, serviceKey)
      : createClient(supabaseUrl, anonKey);

    const { data: closedJobIds, error: jobsError } = await supabase
      .from('jobs')
      .select('id')
      .eq('status', 'Closed');
    if (jobsError || !closedJobIds?.length) {
      return NextResponse.json({ photos: [] });
    }
    const ids = closedJobIds.map((r: { id: number }) => r.id);

    const { data: photos, error } = await supabase
      .from('job_photos')
      .select('id, job_id, photo_url, address, customer_name, created_at')
      .in('job_id', ids)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('job_photos fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ photos: photos ?? [] });
  } catch (e) {
    console.error('Fetch photos error:', e);
    return NextResponse.json({ error: 'Failed to load photos' }, { status: 500 });
  }
}
