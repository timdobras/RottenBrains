import { getLastEpisodeFromTMDB } from "@/lib/tmdb";
import {
  getAllUsers,
  getTvWatchListForUser,
  upsertNewEpisodeRecord,
} from "./supabase/serverQueries";

export async function dailyNewEpisodesJob(): Promise<void> {
  console.log("--- Starting dailyNewEpisodesJob ---");

  const users = await getAllUsers();
  if (users.length === 0) {
    console.log("No users found. Exiting job.");
    return;
  }

  // We'll define the "30 days ago" boundary once so we don't keep re-computing
  const THIRTY_DAYS_AGO = new Date();
  THIRTY_DAYS_AGO.setDate(THIRTY_DAYS_AGO.getDate() - 30);

  for (const user of users) {
    const watchList = await getTvWatchListForUser(user.id);
    if (watchList.length === 0) {
      continue; // no TV items for this user
    }

    for (const { media_id: tvId } of watchList) {
      const lastEpInfo = await getLastEpisodeFromTMDB(tvId);
      if (!lastEpInfo) {
        continue; // no last-episode data
      }

      const { lastAirDate, season_number, episode_number } = lastEpInfo;
      const lastAir = new Date(lastAirDate);

      if (lastAir >= THIRTY_DAYS_AGO) {
        // This show has a new episode within the last 30 days
        await upsertNewEpisodeRecord(
          user.id,
          tvId,
          lastAirDate,
          season_number,
          episode_number,
        );
      }
    }
  }

  console.log("--- dailyNewEpisodesJob completed successfully ---");
}
