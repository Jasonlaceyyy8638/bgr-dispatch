import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id?.trim()) {
      return NextResponse.json({ error: 'Job id required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const supabase = serviceKey
      ? createClient(supabaseUrl, serviceKey)
      : createClient(supabaseUrl, anonKey);

    const jobId = id.trim();
    const jobIdNum = Number(jobId);
    const { data: photos, error } = await supabase
      .from('job_photos')
      .select('id, photo_url')
      .eq('job_id', jobIdNum)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('job_photos fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ photos: photos ?? [] });
  } catch (e) {
    console.error('Fetch job photos error:', e);
    return NextResponse.json({ error: 'Failed to load photos' }, { status: 500 });
  }
}
