import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import { readFile } from 'fs/promises';
import path from 'path';

const rawKey = process.env.RESEND_API_KEY?.trim() || '';
const resendApiKey = rawKey.startsWith('re_') && rawKey.length > 10 ? rawKey : null;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

function generateInvoiceNumber(): string {
  const r = Math.floor(10000 + Math.random() * 90000);
  return `INV-${r}`;
}

async function getLogoAttachment(): Promise<{ content: Buffer; contentId: string } | null> {
  try {
    const filePath = path.join(process.cwd(), 'public', 'logo.png');
    const content = await readFile(filePath);
    return { content, contentId: 'logo' };
  } catch {
    return null;
  }
}

function buildInvoiceHtml(params: {
  total: string;
  invoiceNumber: string;
  businessName: string;
  location: string;
  phone: string;
  reviewLink: string;
  useCidLogo: boolean;
  baseUrl: string;
  warrantyUrl?: string;
}): string {
  const { total, invoiceNumber, businessName, location, phone, reviewLink, useCidLogo, baseUrl, warrantyUrl } = params;
  const red = '#dc2626';
  const border = '#262626';
  const muted = '#a3a3a3';
  const label = '#737373';
  const logoBlock = useCidLogo
    ? '<img src="cid:logo" alt="' + businessName + '" style="max-width:280px; width:auto; height:auto; display:block; margin:0 auto;" />'
    : '<span style="font-size:18px; font-weight:bold; text-transform:uppercase; letter-spacing:0.08em; color:#fff;">' + businessName + '</span>';
  return `
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <meta name="x-apple-color-scheme" content="dark">
  <title>Receipt - ${businessName}</title>
  <style type="text/css">
    :root { color-scheme: dark; }
    html, body, table, td { background-color: #000000 !important; background: #000000 !important; }
    .logo-cell img { max-width: 280px !important; width: auto !important; height: auto !important; }
  </style>
  <!--[if mso]>
  <style type="text/css">body, table, td { background-color: #000000 !important; }</style>
  <![endif]-->
</head>
  <body bgcolor="#000000" style="margin:0; padding:0; background-color:#000000 !important; background:#000000 !important; color:#fff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" bgcolor="#000000"><tr><td bgcolor="#000000"><![endif]-->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#000000" style="background-color:#000000 !important; background:#000000 !important; min-height:100vh;">
  <tr><td bgcolor="#000000" style="background-color:#000000 !important; background:#000000 !important; padding:24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#000000" style="background-color:#000000 !important; background:#000000 !important; border:2px solid #000000;">
    <tr>
      <td bgcolor="#000000" style="padding:24px; background-color:#000000 !important; background:#000000 !important; border:2px solid #000000;">
        <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#000000" style="max-width:600px; margin:0 auto; background-color:#000000 !important; background:#000000 !important;">
          <tr>
            <td style="padding:0; background-color:#000000; border-bottom:3px solid ${red};" bgcolor="#000000">
              <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#000000">
                <tr>
                  <td class="logo-cell" style="padding:28px 24px; text-align:center; background-color:#000000;" bgcolor="#000000">
                    ${logoBlock}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 24px 16px; background-color:#000000;" bgcolor="#000000">
              <p style="margin:0 0 4px 0; font-size:10px; font-weight:bold; text-transform:uppercase; letter-spacing:0.12em; color:${label};" bgcolor="#000000">${businessName}</p>
              <p style="margin:0 0 8px 0; font-size:11px; font-weight:600; color:${muted};" bgcolor="#000000">Invoice ${invoiceNumber}</p>
              <p style="margin:0; font-size:18px; font-weight:bold; text-transform:uppercase; letter-spacing:0.04em; color:#fff; border-left:4px solid ${red}; padding-left:12px;" bgcolor="#000000">${location}, Ohio</p>
              <p style="margin:8px 0 0 0; font-size:14px; color:${muted}; font-weight:600;" bgcolor="#000000">${phone}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 24px; background-color:#000000; border:1px solid ${border}; border-left:4px solid ${red};" bgcolor="#000000">
              <p style="margin:0 0 6px 0; font-size:10px; font-weight:bold; text-transform:uppercase; letter-spacing:0.1em; color:${label};" bgcolor="#000000">Thank you for your business</p>
              <p style="margin:0; font-size:26px; font-weight:bold; color:${red}; letter-spacing:0.02em;" bgcolor="#000000">$${total}</p>
            </td>
          </tr>
          <tr><td style="height:16px; background-color:#000000;" bgcolor="#000000"></td></tr>
          <tr>
            <td style="padding:20px 24px; border-top:1px solid ${border}; background-color:#000000;" bgcolor="#000000">
              ${warrantyUrl ? `<p style="margin:0 0 10px 0; font-size:12px; color:${muted}; line-height:1.5;" bgcolor="#000000">Your warranty &amp; service agreement (90-day labor, 10-year parts) is available at the link below. Save or print it for your records.</p><p style="margin:0 0 14px 0;" bgcolor="#000000"><a href="${warrantyUrl}" style="color:${red}; font-size:12px; font-weight:bold; text-decoration:underline;">View warranty &amp; invoice details</a></p>` : ''}
              <p style="margin:0 0 14px 0; font-size:13px; color:${muted}; line-height:1.5;" bgcolor="#000000">We'd really appreciate it if you could take a moment to leave us an honest review of your service today.</p>
              <a href="${reviewLink}" style="display:inline-block; background-color:${red}; color:#fff !important; font-size:11px; font-weight:bold; text-transform:uppercase; letter-spacing:0.08em; text-decoration:none; padding:12px 20px; border-radius:2px;">Leave a review</a>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px; font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:0.06em; color:${label}; border-top:1px solid ${border}; background-color:#000000;" bgcolor="#000000">
              ${businessName} · ${location}, OH · ${phone}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  </td></tr>
  </table>
  <!--[if mso]></td></tr></table><![endif]-->
</body>
</html>
  `.trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, contact, total, reviewLink, businessName, location, jobId } = body;

    const business = businessName || 'Buckeye Garage Door Repair';
    const loc = location || 'Dayton';
    const phone = '937-913-4844';
    const review = reviewLink || 'https://g.page/r/CR9wZbE17p6bEBM/review';
    const invoiceNumber = generateInvoiceNumber();
    const logoAttachment = await getLogoAttachment();

    if (jobId && typeof jobId === 'string' && jobId.trim()) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        await supabase.from('jobs').update({ invoice_number: invoiceNumber }).eq('id', jobId.trim());
      }
    }

    const origin = body.origin && typeof body.origin === 'string' ? body.origin.replace(/\/$/, '') : '';
    const jobIdForLink = body.jobId && typeof body.jobId === 'string' && body.jobId.trim() ? body.jobId.trim() : '';
    const warrantyLink = origin && jobIdForLink ? `${origin}/invoice/${jobIdForLink}/warranty` : '';
    const message = warrantyLink
      ? `BGR SUITE: Thanks for choosing ${business}!

Your total: $${total}
Warranty & receipt: ${warrantyLink}

We'd really appreciate a review: ${review}

Thank you for choosing us in the ${loc} community!`
      : `BGR SUITE: Thanks for choosing ${business}!

Your total: $${total}

We'd really appreciate it if you could take a moment to leave us an honest review of your service today: ${review}

Thank you for choosing us in the ${loc} community!`;

    if (type === 'text') {
      const SDK = require('@ringcentral/sdk').SDK;
      const rcsdk = new SDK({
        server: process.env.RINGCENTRAL_SERVER_URL,
        clientId: process.env.RINGCENTRAL_CLIENT_ID,
        clientSecret: process.env.RINGCENTRAL_CLIENT_SECRET,
      });
      const platform = rcsdk.platform();
      await platform.login({ jwt: process.env.RINGCENTRAL_JWT });
      await platform.post('/restapi/v1.0/account/~/extension/~/sms', {
        from: { phoneNumber: process.env.RINGCENTRAL_FROM_NUMBER },
        to: [{ phoneNumber: contact }],
        text: message,
      });
      return NextResponse.json({ success: true });
    }

    if (type === 'email') {
      const email = (contact || '').trim();
      if (!email) {
        return NextResponse.json({ error: 'Email address required' }, { status: 400 });
      }
      if (!resend) {
        return NextResponse.json(
          { error: 'Email not configured. Add RESEND_API_KEY to .env.local and set RESEND_FROM_EMAIL (e.g. Buckeye Garage Door Repair <receipts@yourdomain.com>).' },
          { status: 500 }
        );
      }
      const fromEmail = (process.env.RESEND_FROM_EMAIL || 'Buckeye Garage Door Repair <onboarding@resend.dev>').trim();
      const baseUrl = (typeof origin === 'string' && origin && !origin.includes('localhost')) ? origin.replace(/\/$/, '') : '';
      const warrantyUrl = baseUrl && jobIdForLink ? `${baseUrl}/invoice/${jobIdForLink}/warranty` : undefined;
      const html = buildInvoiceHtml({
        total: String(total),
        invoiceNumber,
        businessName: business,
        location: loc,
        phone,
        reviewLink: review,
        useCidLogo: !!logoAttachment,
        baseUrl,
        warrantyUrl,
      });
      const attachments = logoAttachment
        ? [{ content: logoAttachment.content.toString('base64'), filename: 'logo.png', contentType: 'image/png' as const, contentId: 'logo' }]
        : undefined;
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: [email],
        subject: `Your receipt from ${business} — $${total} (${invoiceNumber})`,
        html,
        attachments,
      });
      if (error) {
        console.error('Resend error:', error);
        const msg =
          error.message?.toLowerCase().includes('invalid') && error.message?.toLowerCase().includes('api key')
            ? 'Resend API key is invalid. In .env.local set RESEND_API_KEY to your full key from resend.com (starts with re_). Remove any spaces or quotes, then restart the dev server.'
            : error.message;
        return NextResponse.json({ error: msg }, { status: 500 });
      }
      return NextResponse.json({ success: true, id: data?.id });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error: unknown) {
    console.error('Receipt Error:', error);
    let message = 'Failed to send receipt. Try again.';
    if (error instanceof Error) {
      message = error.message;
    } else if (error && typeof error === 'object') {
      const o = error as Record<string, unknown>;
      if (typeof o.message === 'string') message = o.message;
      else if (o.error && typeof o.error === 'object' && typeof (o.error as Record<string, unknown>).message === 'string')
        message = (o.error as Record<string, unknown>).message as string;
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
