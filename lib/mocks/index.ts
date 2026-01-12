/**
 * Mock data layer for offline development
 * Usage: NEXT_PUBLIC_OFFLINE_MODE=true npm run dev
 */

export { isOfflineMode, getOfflineModeStatus } from './config';
export { getMockTMDBData } from './tmdb';
export { createMockServerClient, createMockBrowserClient } from './supabase';
