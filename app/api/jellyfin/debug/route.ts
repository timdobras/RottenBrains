import { NextRequest, NextResponse } from 'next/server';
import { validateConnection } from '@/lib/jellyfin/client';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/serviceClient';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceClient();

    const { data: config, error: configError } = await serviceClient
      .from('user_jellyfin_config')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (configError || !config) {
      return NextResponse.json({
        configured: false,
        message: 'No Jellyfin configuration found',
      });
    }

    const webhookUrl = `${req.nextUrl.origin}/api/jellyfin/webhook?token=${config.webhook_secret}`;

    const connectivityResult = await validateConnection(
      config.server_url,
      config.api_key,
      config.jellyfin_user_id
    );

    const { data: watchHistoryStats } = await serviceClient
      .from('watch_history')
      .select('media_type, media_id, percentage_watched, sync_source, created_at')
      .eq('user_id', user.id)
      .eq('sync_source', 'jellyfin')
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      configured: true,
      syncEnabled: config.sync_enabled,
      serverUrl: config.server_url,
      webhookUrl,
      serverName: connectivityResult.serverName,
      serverReachable: connectivityResult.valid,
      serverError: connectivityResult.error || null,
      jellyfinWatchHistory: watchHistoryStats || [],
    });
  } catch (error) {
    logger.error('Error in Jellyfin debug endpoint:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
