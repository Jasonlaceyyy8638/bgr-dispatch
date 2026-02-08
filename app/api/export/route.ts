import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'jobs';
    const from = searchParams.get('from') || '';
    const to = searchParams.get('to') || '';
    const format = searchParams.get('format') || 'csv';

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    let query = supabase.from('jobs').select('id, customer_name, phone_number, street_address, city, state, zip_code, job_description, service_type, status, price, payment_amount, payment_method, created_at, scheduled_date, start_time, assigned_tech_id, tech_users(name)');

    if (from) {
      const fromDate = new Date(from);
      if (!isNaN(fromDate.getTime())) {
        query = query.gte('created_at', fromDate.toISOString().slice(0, 10));
      }
    }
    if (to) {
      const toDate = new Date(to);
      if (!isNaN(toDate.getTime())) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        query = query.lte('created_at', end.toISOString());
      }
    }

    if (type === 'revenue') {
      query = query.eq('status', 'Closed');
    }
    const { data: rows, error } = await query.order('created_at', { ascending: false }).limit(2000);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const list = rows || [];
    const techById: Record<string, string> = {};
    list.forEach((j: any) => {
      if (j.tech_users?.name) techById[j.assigned_tech_id] = j.tech_users.name;
    });

    const escape = (v: unknown) => {
      const s = v == null ? '' : String(v);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    if (type === 'revenue') {
      if (format === 'json') {
        const txs = list.map((j: any) => {
          const d = j.created_at ? new Date(j.created_at) : new Date();
          return {
            date: d.toLocaleDateString(),
            time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
            customer: j.customer_name || '',
            service: (j.service_type || j.job_description || '').slice(0, 80),
            tech: techById[j.assigned_tech_id] || '',
            amount: Number(j.payment_amount ?? j.price ?? 0),
            paymentMethod: j.payment_method || '',
          };
        });
        return NextResponse.json({ txs });
      }
      const header = 'Date,Time,Customer,Service,Tech,Amount,Payment Method';
      const lines = list.map((j: any) => {
        const d = j.created_at ? new Date(j.created_at) : new Date();
        const date = d.toLocaleDateString();
        const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        const amt = Number(j.payment_amount ?? j.price ?? 0).toFixed(2);
        return [date, time, j.customer_name || '', (j.service_type || j.job_description || '').slice(0, 80), techById[j.assigned_tech_id] || '', amt, j.payment_method || ''].map(escape).join(',');
      });
      const csv = [header, ...lines].join('\r\n');
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="revenue-${from || 'all'}-${to || 'all'}.csv"`,
        },
      });
    }

    if (format === 'json') {
      const jobs = list.map((j: any) => {
        const addr = j.street_address || '';
        const created = j.created_at ? new Date(j.created_at).toLocaleString() : '';
        return {
          customer: j.customer_name || '',
          phone: j.phone_number || '',
          address: addr,
          city: j.city || '',
          state: j.state || '',
          zip: j.zip_code || '',
          description: (j.job_description || j.service_type || '').slice(0, 120),
          status: j.status || '',
          price: j.price != null ? Number(j.price) : '',
          paymentAmount: j.payment_amount != null ? Number(j.payment_amount) : '',
          paymentMethod: j.payment_method || '',
          created,
          scheduled: j.scheduled_date || '',
          startTime: j.start_time || '',
          tech: techById[j.assigned_tech_id] || '',
        };
      });
      return NextResponse.json({ jobs });
    }

    const header = 'ID,Customer,Phone,Address,City,State,ZIP,Description,Status,Price,Payment Amount,Payment Method,Created,Scheduled,Start Time,Tech';
    const lines = list.map((j: any) => {
      const addr = j.street_address || '';
      const created = j.created_at ? new Date(j.created_at).toLocaleString() : '';
      const price = j.price != null ? Number(j.price) : '';
      const payAmt = j.payment_amount != null ? Number(j.payment_amount) : '';
      return [
        j.id,
        j.customer_name || '',
        j.phone_number || '',
        addr,
        j.city || '',
        j.state || '',
        j.zip_code || '',
        (j.job_description || j.service_type || '').slice(0, 200),
        j.status || '',
        price,
        payAmt,
        j.payment_method || '',
        created,
        j.scheduled_date || '',
        j.start_time || '',
        techById[j.assigned_tech_id] || '',
      ].map(escape).join(',');
    });
    const csv = [header, ...lines].join('\r\n');
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="jobs-${from || 'all'}-${to || 'all'}.csv"`,
      },
    });
  } catch (e) {
    console.error('Export error:', e);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
