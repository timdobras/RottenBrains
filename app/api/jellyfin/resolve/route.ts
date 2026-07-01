import { NextRequest, NextResponse } from 'next/server';
import { getItemByTmdbId, getEpisode, getServerInfo } from '@/lib/jellyfin/client';
import { getJellyfinConfigForPlayback } from '@/lib/jellyfin/sync';
import { logger } from '@/lib/logger';
import { getCurrentUser } from '@/lib/server/current-user';

/**
 * POST /api/jellyfin/resolve
 *
 * Resolves a TMDB ID to a Jellyfin playback URL.
 * Requires authentication. Does NOT require sync_enabled.
 *
 * Body: { tmdb_id, media_type, season_number?, episode_number? }
 * Returns: { found: true, jellyfin_url, jellyfin_item_id } or { found: false, reason }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { tmdb_id, media_type, season_number, episode_number } = body;

    if (!tmdb_id || !media_type) {
      return NextResponse.json(
        { error: 'Missing required fields: tmdb_id, media_type' },
        { status: 400 }
      );
    }

    if (media_type !== 'movie' && media_type !== 'tv') {
      return NextResponse.json({ error: 'media_type must be "movie" or "tv"' }, { status: 400 });
    }

    const config = await getJellyfinConfigForPlayback(user.id);
    if (!config) {
      return NextResponse.json({
        found: false,
        configured: false,
        reason: 'No Jellyfin configuration found',
      });
    }

    // Resolve TMDB ID to Jellyfin item
    let jellyfinItem = null;
    const parsedTmdbId = Number(tmdb_id);

    if (media_type === 'movie') {
      jellyfinItem = await getItemByTmdbId(config, parsedTmdbId, 'movie');
    } else {
      const series = await getItemByTmdbId(config, parsedTmdbId, 'tv');
      if (series && season_number && episode_number) {
        jellyfinItem = await getEpisode(config, series.Id, season_number, episode_number);
      } else {
        jellyfinItem = series;
      }
    }

    if (!jellyfinItem) {
      return NextResponse.json({
        found: false,
        configured: true,
        reason: 'Item not found in Jellyfin library',
      });
    }

    const serverUrl = config.server_url.replace(/\/+$/, '');

    // Fetch server ID for the web client URL
    let serverId = '';
    try {
      const serverInfo = await getServerInfo(config);
      serverId = serverInfo.Id;
    } catch {
      logger.warn('Could not fetch Jellyfin server ID, URL may not work correctly');
    }

    const serverIdParam = serverId ? `&serverId=${serverId}` : '';
    const jellyfinUrl = `${serverUrl}/web/index.html#/details?id=${jellyfinItem.Id}${serverIdParam}`;

    return NextResponse.json({
      found: true,
      configured: true,
      jellyfin_url: jellyfinUrl,
      jellyfin_item_id: jellyfinItem.Id,
    });
  } catch (error) {
    logger.error('Error in Jellyfin resolve endpoint:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
