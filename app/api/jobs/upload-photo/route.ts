import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const BUCKET = 'job-photos';

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const jobId = formData.get('jobId') as string | null;
    if (!file || !jobId?.trim()) {
      return NextResponse.json({ error: 'File and jobId required' }, { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(ext) ? ext : 'jpg';
    const path = `${jobId.trim()}/${Date.now()}.${safeExt}`;

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType: file.type || `image/${safeExt}`,
      upsert: true,
    });

    if (error) {
      console.error('Upload photo error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return NextResponse.json({ url: urlData.publicUrl });
  } catch (e) {
    console.error('Upload photo error:', e);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
