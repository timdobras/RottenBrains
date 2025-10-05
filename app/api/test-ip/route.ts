import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Get all possible IP headers
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');

  // Try multiple IP detection services
  let externalIPs: Record<string, string | null> = {};

  try {
    const ipifyResponse = await fetch(`https://api.ipify.org?format=json&_t=${Date.now()}`, {
      cache: 'no-store'
    });
    const ipifyData = await ipifyResponse.json();
    externalIPs.ipify = ipifyData.ip;
  } catch (e) {
    externalIPs.ipify = 'Error: ' + (e as Error).message;
  }

  try {
    const ipapiResponse = await fetch(`https://ipapi.co/json/?_t=${Date.now()}`, {
      cache: 'no-store'
    });
    const ipapiData = await ipapiResponse.json();
    externalIPs.ipapi = ipapiData.ip;
  } catch (e) {
    externalIPs.ipapi = 'Error: ' + (e as Error).message;
  }

  try {
    const ipinfoResponse = await fetch(`https://ipinfo.io/json?_t=${Date.now()}`, {
      cache: 'no-store'
    });
    const ipinfoData = await ipinfoResponse.json();
    externalIPs.ipinfo = ipinfoData.ip;
  } catch (e) {
    externalIPs.ipinfo = 'Error: ' + (e as Error).message;
  }

  return NextResponse.json({
    headers: {
      'x-forwarded-for': forwarded,
      'x-real-ip': realIP,
      'cf-connecting-ip': cfConnectingIP,
    },
    externalServices: externalIPs,
    timestamp: new Date().toISOString(),
    info: 'Test different VPN states and refresh to see if IP changes'
  });
}