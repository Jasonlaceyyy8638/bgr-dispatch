import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const BUCKET = 'job-photos';

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    // Service role bypasses Storage RLS so uploads work without policy headaches
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
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
      upsert: false,
    });

    if (error) {
      console.error('Upload photo error:', error);
      const isBucketMissing = error.message?.toLowerCase().includes('not found') || error.message?.toLowerCase().includes('bucket');
      const message = isBucketMissing
        ? 'Storage bucket "job-photos" not found. In Supabase Dashboard go to Storage → New bucket → name it exactly job-photos → set Public → add a policy to allow insert.'
        : error.message;
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

    // Always insert into job_photos so the Photos page shows it (use job details if we can read the job row)
    const jobIdTrim = jobId.trim();
    const jobIdNum = Number(jobIdTrim);
    let address: string | null = null;
    let customer_name: string | null = null;
    const { data: jobRow } = await supabase.from('jobs').select('customer_name, street_address, address, city, state, zip_code').eq('id', jobIdNum).single();
    if (jobRow) {
      const street = (jobRow as { street_address?: string; address?: string }).street_address || (jobRow as { address?: string }).address || '';
      address = [street, jobRow.city, jobRow.state, jobRow.zip_code].filter(Boolean).join(', ') || null;
      customer_name = jobRow.customer_name || null;
      await supabase.from('jobs').update({ job_photo_url: publicUrl }).eq('id', jobIdNum);
    }
    const { data: inserted, error: insertError } = await supabase.from('job_photos').insert({
      job_id: jobIdNum,
      photo_url: publicUrl,
      address,
      customer_name,
    }).select('id, photo_url').single();
    if (insertError) {
      console.error('job_photos insert error:', insertError);
      return NextResponse.json({ error: insertError.message || 'Could not save photo to gallery.' }, { status: 400 });
    }
    return NextResponse.json({ url: publicUrl, photo: inserted });
  } catch (e) {
    console.error('Upload photo error:', e);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
