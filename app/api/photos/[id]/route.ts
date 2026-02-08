import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const BUCKET = 'job-photos';

/** Extract storage path from public URL (e.g. .../job-photos/123/12345.jpg -> 123/12345.jpg) */
function pathFromPublicUrl(url: string): string | null {
  try {
    const match = url.match(/\/job-photos\/(.+)$/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id?.trim()) {
      return NextResponse.json({ error: 'Photo id required' }, { status: 400 });
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

    const { data: row, error: fetchError } = await supabase
      .from('job_photos')
      .select('id, photo_url')
      .eq('id', id.trim())
      .single();

    if (fetchError || !row) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    const photoUrl = (row as { photo_url?: string }).photo_url;
    const storagePath = photoUrl ? pathFromPublicUrl(photoUrl) : null;
    if (storagePath) {
      await supabase.storage.from(BUCKET).remove([storagePath]);
    }

    const { error: deleteError } = await supabase
      .from('job_photos')
      .delete()
      .eq('id', id.trim());

    if (deleteError) {
      console.error('job_photos delete error:', deleteError);
      return NextResponse.json({ error: deleteError.message || 'Could not delete photo' }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Delete photo error:', e);
    return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 });
  }
}
