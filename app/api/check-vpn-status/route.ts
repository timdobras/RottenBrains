import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { getFreshPublicIP } from '@/lib/ipDetection';

// Force dynamic rendering to prevent caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Try multiple header sources (in order of reliability)
    const headers = {
      'cf-connecting-ip': request.headers.get('cf-connecting-ip'), // Cloudflare
      'x-real-ip': request.headers.get('x-real-ip'), // Nginx proxy
      'x-forwarded-for': request.headers.get('x-forwarded-for'), // Standard proxy
      'x-client-ip': request.headers.get('x-client-ip'), // Some proxies
      'true-client-ip': request.headers.get('true-client-ip'), // Akamai, Cloudflare Enterprise
      'x-cluster-client-ip': request.headers.get('x-cluster-client-ip'), // Some load balancers
    };

    // Log all headers for debugging
    logger.debug('IP Detection - All Headers:', headers);

    // Get IP from the first available header
    let clientIP = 'unknown';
    for (const [key, value] of Object.entries(headers)) {
      if (value) {
        // x-forwarded-for can have multiple IPs, take the first
        clientIP = value.split(',')[0].trim();
        logger.debug(`IP detected from ${key}: ${clientIP}`);
        break;
      }
    }

    let isDevelopment = false;
    let detectionMethod = 'headers';

    // Check if we're on localhost
    const isLocalhost =
      clientIP === '::ffff:127.0.0.1' ||
      clientIP === '127.0.0.1' ||
      clientIP === '::1' ||
      clientIP === 'localhost' ||
      clientIP === 'unknown';

    if (isLocalhost) {
      isDevelopment = true;
      logger.debug('Localhost detected. In production, real IP would be available from headers.');

      // Only allow test_ip parameter in development environment
      if (process.env.NODE_ENV === 'development') {
        const testIP = request.nextUrl.searchParams.get('test_ip');
        if (testIP) {
          clientIP = testIP;
          detectionMethod = 'test_param';
          logger.debug('Using test IP from query param:', clientIP);
        }
      }
      // Allow manual IP override via environment variable in development (if test_ip not set)
      if (process.env.NODE_ENV === 'development' && detectionMethod !== 'test_param') {
        // Check for manual IP in environment variable
        const manualIP = process.env.NEXT_PUBLIC_TEST_IP;
        if (manualIP) {
          clientIP = manualIP;
          detectionMethod = 'env_variable';
          logger.debug('Using manual test IP from env:', clientIP);
        } else {
          logger.debug(
            'Localhost detected. In production, real IP will be available from headers.'
          );
          logger.debug('To test locally, add NEXT_PUBLIC_TEST_IP=your.ip.here to .env.local');
          clientIP = 'localhost';
          detectionMethod = 'localhost';
        }
      }
    }

    logger.debug('Final client IP:', clientIP);

    if (clientIP === 'unknown') {
      return NextResponse.json({
        isUsingVPN: null,
        currentIP: null,
        message: 'Unable to detect IP address',
      });
    }

    // Skip database check for localhost - can't query with invalid inet format
    if (clientIP === 'localhost') {
      const response = NextResponse.json({
        isUsingVPN: null,
        currentIP: 'localhost',
        isKnownIP: false,
        isDevelopment: true,
        detectionMethod: 'localhost',
        savedIPInfo: null,
        message: 'Running on localhost - VPN detection disabled. Set NEXT_PUBLIC_TEST_IP in .env.local to test.',
        timestamp: Date.now(),
      });

      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      response.headers.set('Surrogate-Control', 'no-store');

      return response;
    }

    // Check if this IP is in the user's saved non-VPN IPs
    const { data: savedIPs, error: dbError } = await supabase
      .from('user_ip_addresses')
      .select('*')
      .eq('user_id', user.id)
      .eq('ip_address', clientIP)
      .eq('is_trusted', true)
      .single();

    logger.debug('Database check result:', {
      userId: user.id,
      clientIP,
      foundIP: !!savedIPs,
      dbError: dbError?.code,
    });

    if (dbError && dbError.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is fine
      logger.error('Error checking IP addresses:', dbError);
      throw dbError;
    }

    // If IP is found in saved IPs, user is NOT using VPN
    // If IP is not found, we assume they might be using VPN (or just a new location)
    const isKnownIP = !!savedIPs;

    const response = NextResponse.json({
      isUsingVPN: !isKnownIP,
      currentIP: clientIP,
      isKnownIP,
      isDevelopment,
      detectionMethod,
      savedIPInfo: isKnownIP
        ? {
            label: savedIPs.label,
            created_at: savedIPs.created_at,
          }
        : null,
      message: isKnownIP
        ? `Connected from known IP${savedIPs.label ? ` (${savedIPs.label})` : ''}`
        : 'Connected from unknown IP - consider using a VPN',
      timestamp: Date.now(),
    });

    // Set headers to prevent any caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('Surrogate-Control', 'no-store');

    return response;
  } catch (error) {
    logger.error('Error in check-vpn-status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Also create a POST endpoint to save current IP
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { label } = body;

    // Get client IP
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');

    let clientIP = forwarded ? forwarded.split(',')[0].trim() : realIP || 'unknown';

    // If we're on localhost, try to get the real public IP
    if (
      clientIP === '::ffff:127.0.0.1' ||
      clientIP === '127.0.0.1' ||
      clientIP === '::1' ||
      clientIP === 'unknown'
    ) {
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        clientIP = ipData.ip;
      } catch (error) {
        logger.error('Error fetching public IP:', error);
      }
    }

    if (clientIP === 'unknown') {
      return NextResponse.json(
        {
          error: 'Unable to detect IP address',
        },
        { status: 400 }
      );
    }

    // Save the IP address
    const { data, error } = await supabase
      .from('user_ip_addresses')
      .insert({
        user_id: user.id,
        ip_address: clientIP,
        label: label || null,
        is_trusted: true,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          {
            error: 'This IP address is already saved',
          },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'IP address saved successfully',
    });
  } catch (error) {
    logger.error('Error saving IP address:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
