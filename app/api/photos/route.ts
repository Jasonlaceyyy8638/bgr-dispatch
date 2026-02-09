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
    // Use service role for jobs fetch when available so we can backfill customer_name (anon may be blocked by RLS on jobs)
    const jobsClient = serviceKey ? createClient(supabaseUrl, serviceKey) : supabase;

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

    const list = photos ?? [];
    if (list.length === 0) return NextResponse.json({ photos: [] });

    // Fetch each job by id with .eq() so we avoid .in() type coercion issues (Supabase bigint)
    const uniqueJobIds = [...new Set(list.map((p: { job_id: number | string }) => p.job_id))];
    const jobMap = new Map<string, { customer_name?: string; street_address?: string; address?: string; city?: string; state?: string; zip_code?: string; invoice_number?: string }>();
    for (const jobId of uniqueJobIds) {
      let job: { id: number | string; customer_name?: string; street_address?: string; address?: string; city?: string; state?: string; zip_code?: string; invoice_number?: string } | null = null;
      const { data: d1 } = await jobsClient.from('jobs').select('id, customer_name, street_address, address, city, state, zip_code, invoice_number').eq('id', jobId).maybeSingle();
      if (d1) job = d1 as typeof job;
      if (!job && !Number.isNaN(Number(jobId))) {
        const { data: d2 } = await jobsClient.from('jobs').select('id, customer_name, street_address, address, city, state, zip_code, invoice_number').eq('id', Number(jobId)).maybeSingle();
        if (d2) job = d2 as typeof job;
      }
      if (job) {
        jobMap.set(String(jobId), job);
        jobMap.set(String(Number(jobId)), job);
      }
    }

    const photosWithJob = list.map((p: { job_id: number | string; customer_name: string | null; address: string | null; [k: string]: unknown }) => {
      const job = jobMap.get(String(p.job_id)) ?? jobMap.get(String(Number(p.job_id)));
      const customer_name = p.customer_name || job?.customer_name ?? null;
      const address = p.address || (job ? [job.street_address || job.address, job.city, job.state, job.zip_code].filter(Boolean).join(', ') : null) || null;
      const invoice_number = job?.invoice_number ?? null;
      return { ...p, customer_name, address, invoice_number };
    });

    return NextResponse.json({ photos: photosWithJob });
  } catch (e) {
    console.error('Fetch photos error:', e);
    return NextResponse.json({ error: 'Failed to load photos' }, { status: 500 });
  }
}
