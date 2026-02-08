import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const KEYS = ['company_name', 'company_phone', 'default_tax_rate', 'card_fee_percent', 'review_link'] as const;

function envDefaults() {
  return {
    company_name: process.env.NEXT_PUBLIC_COMPANY_NAME || 'BGR',
    company_phone: process.env.NEXT_PUBLIC_COMPANY_PHONE || '',
    default_tax_rate: process.env.NEXT_PUBLIC_DEFAULT_TAX_RATE || '0',
    card_fee_percent: process.env.CARD_FEE_PERCENT || '2.9',
    review_link: process.env.NEXT_PUBLIC_REVIEW_LINK || '',
  };
}

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const defaults = envDefaults();
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(defaults);
    }
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: rows } = await supabase.from('app_settings').select('key, value');
    const map: Record<string, string> = { ...defaults };
    if (rows) {
      for (const r of rows) {
        if (r.key && r.value !== undefined) map[r.key] = String(r.value);
      }
    }
    return NextResponse.json({
      company_name: map.company_name ?? defaults.company_name,
      company_phone: map.company_phone ?? defaults.company_phone,
      default_tax_rate: map.default_tax_rate ?? defaults.default_tax_rate,
      card_fee_percent: map.card_fee_percent ?? defaults.card_fee_percent,
      review_link: map.review_link ?? defaults.review_link,
    });
  } catch {
    return NextResponse.json(envDefaults());
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    const toSave: { key: string; value: string }[] = [];
    for (const key of KEYS) {
      if (body[key] !== undefined) {
        toSave.push({ key, value: String(body[key] ?? '').trim() });
      }
    }
    if (toSave.length === 0) {
      return NextResponse.json({ error: 'No fields to save' }, { status: 400 });
    }

    for (const { key, value } of toSave) {
      const { error } = await supabase.from('app_settings').upsert({ key, value }, { onConflict: 'key' });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Settings save error:', e);
    return NextResponse.json({ error: 'Save failed' }, { status: 500 });
  }
}
