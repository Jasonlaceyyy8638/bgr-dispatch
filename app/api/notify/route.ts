import { NextResponse } from 'next/server';
const SDK = require('@ringcentral/sdk').SDK;

export async function POST(request: Request) {
  try {
    const { customerName, techName, customMessage, phone } = await request.json();

    const rcsdk = new SDK({
      server: process.env.RINGCENTRAL_SERVER_URL,
      clientId: process.env.RINGCENTRAL_CLIENT_ID,
      clientSecret: process.env.RINGCENTRAL_CLIENT_SECRET
    });

    const platform = rcsdk.platform();
    
    // Authenticate using your Production JWT
    await platform.login({ jwt: process.env.RINGCENTRAL_JWT });

    // Send the SMS Receipt
    await platform.post('/restapi/v1.0/account/~/extension/~/sms', {
      from: { phoneNumber: process.env.RINGCENTRAL_FROM_NUMBER },
      to: [{ phoneNumber: phone }],
      text: `Buckeye Garage Door: Hello ${customerName}, ${customMessage}. Tech: ${techName}`
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("SMS ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}