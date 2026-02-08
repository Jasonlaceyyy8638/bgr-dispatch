import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const VALID_STATUSES = ['booked', 'Authorized', 'Closed', 'en_route', 'on_site'];

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const id = body.id != null ? String(body.id).trim() : '';
    if (!id) {
      return NextResponse.json({ error: 'Job id required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);
    const supabaseAdmin = serviceKey ? createClient(supabaseUrl, serviceKey) : supabase;

    const updates: Record<string, unknown> = {};
    if (body.status !== undefined) {
      const s = String(body.status).trim();
      if (VALID_STATUSES.includes(s)) updates.status = s;
    }
    if (body.assigned_tech_id !== undefined) {
      updates.assigned_tech_id = body.assigned_tech_id === '' || body.assigned_tech_id == null ? null : String(body.assigned_tech_id);
    }
    if (body.dispatcher_notes !== undefined) {
      updates.dispatcher_notes = body.dispatcher_notes === '' ? null : String(body.dispatcher_notes);
    }
    if (body.job_photo_url !== undefined) {
      updates.job_photo_url = body.job_photo_url === '' ? null : String(body.job_photo_url);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { error } = await supabase.from('jobs').update(updates).eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // When a job photo is added (e.g. paste URL), insert into job_photos (multiple per job)
    if (updates.job_photo_url !== undefined) {
      const url = updates.job_photo_url as string | null;
      if (url) {
        const { data: jobRow } = await supabase
          .from('jobs')
          .select('customer_name, street_address, address, city, state, zip_code')
          .eq('id', id)
          .single();
        if (jobRow) {
          const street = (jobRow as { street_address?: string; address?: string }).street_address || (jobRow as { address?: string }).address || '';
          const fullAddress = [street, jobRow.city, jobRow.state, jobRow.zip_code].filter(Boolean).join(', ');
          await supabaseAdmin.from('job_photos').insert({
            job_id: Number(id),
            photo_url: url,
            address: fullAddress || null,
            customer_name: jobRow.customer_name || null,
          });
        }
      }
    }

    // When job is closed, ensure current photo is in job_photos so it shows on the Photos sidebar page
    if (updates.status === 'Closed') {
      const { data: closedJob } = await supabase
        .from('jobs')
        .select('job_photo_url, customer_name, street_address, address, city, state, zip_code')
        .eq('id', id)
        .single();
      if (closedJob?.job_photo_url) {
        const street = (closedJob as { street_address?: string; address?: string }).street_address || (closedJob as { address?: string }).address || '';
        const fullAddress = [street, closedJob.city, closedJob.state, closedJob.zip_code].filter(Boolean).join(', ');
        await supabaseAdmin.from('job_photos').insert({
          job_id: Number(id),
          photo_url: closedJob.job_photo_url,
          address: fullAddress || null,
          customer_name: closedJob.customer_name || null,
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Update job error:', e);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
