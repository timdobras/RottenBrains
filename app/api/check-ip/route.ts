import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

// This endpoint checks if a given IP is in the user's saved list
// The IP is provided by the client to avoid server-side caching issues
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the IP from the request body (provided by client)
    const body = await request.json();
    const { ip } = body;

    if (!ip) {
      return NextResponse.json({
        error: 'IP address is required',
        isKnownIP: false
      }, { status: 400 });
    }

    console.log(`[Check-IP] Checking if ${ip} is in saved list for user ${user.id}`);

    // Check if this IP is in the user's saved non-VPN IPs
    const { data: savedIPs, error: dbError } = await supabase
      .from('user_ip_addresses')
      .select('*')
      .eq('user_id', user.id)
      .eq('ip_address', ip)
      .eq('is_trusted', true)
      .single();

    if (dbError && dbError.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is fine
      logger.error('Error checking IP addresses:', dbError);
      throw dbError;
    }

    const isKnownIP = !!savedIPs;

    console.log(`[Check-IP] Result: IP ${ip} is ${isKnownIP ? 'KNOWN' : 'UNKNOWN'}`);

    return NextResponse.json({
      ip,
      isKnownIP,
      isUsingVPN: !isKnownIP,
      savedIPInfo: isKnownIP ? {
        label: savedIPs.label,
        created_at: savedIPs.created_at
      } : null,
      message: isKnownIP
        ? `Connected from known IP${savedIPs.label ? ` (${savedIPs.label})` : ''}`
        : 'Connected from unknown IP - consider using a VPN'
    });

  } catch (error) {
    logger.error('Error in check-ip:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}