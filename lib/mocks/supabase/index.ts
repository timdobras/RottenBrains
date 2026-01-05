/**
 * Mock Supabase client for offline development
 * Mimics the Supabase client interface with proper TypeScript compatibility
 */

import {
  mockUsers,
  MOCK_CURRENT_USER_ID,
  getMockUserById,
  searchMockUsers,
} from '../data/users';
import {
  mockPosts,
  mockComments,
  mockLikes,
  mockSaves,
  getMockPostsByUser,
  getMockPostsByMedia,
  getMockFeedPosts,
} from '../data/posts';
import {
  mockWatchHistory,
  getMockWatchHistoryForUser,
  getMockWatchProgress,
} from '../data/watch-history';
import {
  mockFollows,
  mockNotifications,
} from '../data/follows';

// Type for mock query result - matches Supabase response structure
interface MockResult<T> {
  data: T | null;
  error: null | { message: string; code?: string };
  count?: number;
  status: number;
  statusText: string;
}

// Create success response
function createSuccessResponse<T>(data: T, count?: number): MockResult<T> {
  return {
    data,
    error: null,
    count,
    status: 200,
    statusText: 'OK',
  };
}

// Create a chainable mock query builder that properly supports all operations
function createMockQueryBuilder(table: string): any {
  let filters: Record<string, any> = {};
  let selectFields: string = '*';
  let limitCount: number | null = null;
  let orderField: string | null = null;
  let orderAsc: boolean = true;
  let singleResult: boolean = false;
  let countMode: string | null = null;
  let pendingData: any = null;
  let operation: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';

  const executeQuery = (): MockResult<any> => {
    let data: any[] = [];

    // Handle insert/update/delete operations
    if (operation === 'insert' || operation === 'upsert') {
      return createSuccessResponse(pendingData);
    }
    if (operation === 'update') {
      return createSuccessResponse(pendingData);
    }
    if (operation === 'delete') {
      return createSuccessResponse(null);
    }

    // Handle select operations
    switch (table) {
      case 'users':
        data = filterData(mockUsers, filters);
        break;
      case 'posts':
        data = filterData(mockPosts, filters);
        data = data.map((post) => ({
          ...post,
          users: getMockUserById(post.user_id),
        }));
        break;
      case 'comments':
        data = filterData(mockComments, filters);
        data = data.map((comment) => ({
          ...comment,
          users: getMockUserById(comment.user_id),
        }));
        break;
      case 'likes':
        data = filterData(mockLikes, filters);
        break;
      case 'saves':
        data = filterData(mockSaves, filters);
        break;
      case 'watch_history':
        data = filterData(mockWatchHistory, filters);
        break;
      case 'follows':
        data = filterData(mockFollows, filters);
        break;
      case 'notifications':
        data = filterData(mockNotifications, filters);
        data = data.map((notif) => ({
          ...notif,
          from_user: getMockUserById(notif.from_user_id),
        }));
        break;
      case 'user_ip_addresses':
      case 'hidden_media':
        data = [];
        break;
      default:
        console.warn(`[Mock Supabase] Unknown table: ${table}`);
        data = [];
    }

    // Apply ordering
    if (orderField) {
      data.sort((a, b) => {
        const aVal = a[orderField!];
        const bVal = b[orderField!];
        if (aVal < bVal) return orderAsc ? -1 : 1;
        if (aVal > bVal) return orderAsc ? 1 : -1;
        return 0;
      });
    }

    // Apply limit
    if (limitCount !== null) {
      data = data.slice(0, limitCount);
    }

    // Handle count mode
    if (countMode === 'exact') {
      return createSuccessResponse(singleResult ? data[0] || null : data, data.length);
    }

    // Handle single result
    if (singleResult) {
      return createSuccessResponse(data[0] || null);
    }

    return createSuccessResponse(data, data.length);
  };

  // Create the builder object with all chainable methods
  const builder: any = {
    select(fields: string = '*', options?: { count?: 'exact' | 'planned' | 'estimated' }) {
      selectFields = fields;
      operation = 'select';
      if (options?.count) {
        countMode = options.count;
      }
      return builder;
    },
    insert(data: any, options?: any) {
      pendingData = data;
      operation = 'insert';
      return builder;
    },
    upsert(data: any, options?: any) {
      pendingData = data;
      operation = 'upsert';
      return builder;
    },
    update(data: any) {
      pendingData = data;
      operation = 'update';
      return builder;
    },
    delete() {
      operation = 'delete';
      return builder;
    },
    eq(column: string, value: any) {
      filters[column] = value;
      return builder;
    },
    neq(column: string, value: any) {
      filters[`${column}_neq`] = value;
      return builder;
    },
    gt(column: string, value: any) {
      filters[`${column}_gt`] = value;
      return builder;
    },
    gte(column: string, value: any) {
      filters[`${column}_gte`] = value;
      return builder;
    },
    lt(column: string, value: any) {
      filters[`${column}_lt`] = value;
      return builder;
    },
    lte(column: string, value: any) {
      filters[`${column}_lte`] = value;
      return builder;
    },
    in(column: string, values: any[]) {
      filters[`${column}_in`] = values;
      return builder;
    },
    contains(column: string, value: any) {
      filters[`${column}_contains`] = value;
      return builder;
    },
    ilike(column: string, pattern: string) {
      filters[`${column}_ilike`] = pattern;
      return builder;
    },
    or(conditions: string) {
      filters['_or'] = conditions;
      return builder;
    },
    is(column: string, value: any) {
      filters[column] = value;
      return builder;
    },
    order(column: string, options?: { ascending?: boolean }) {
      orderField = column;
      orderAsc = options?.ascending !== false;
      return builder;
    },
    limit(count: number) {
      limitCount = count;
      return builder;
    },
    range(from: number, to: number) {
      limitCount = to - from + 1;
      return builder;
    },
    single() {
      singleResult = true;
      return builder;
    },
    maybeSingle() {
      singleResult = true;
      return builder;
    },
    // Make it thenable (Promise-like)
    then(resolve: (result: MockResult<any>) => void, reject?: ((error: any) => void)) {
      try {
        const result = executeQuery();
        resolve(result);
      } catch (error) {
        if (reject) reject(error);
      }
    },
    // Support async/await
    catch(reject: ((error: any) => void)) {
      return builder;
    },
    finally(callback: () => void) {
      callback();
      return builder;
    },
  };

  return builder;
}

// Filter data based on query filters
function filterData<T extends Record<string, any>>(
  data: T[],
  filters: Record<string, any>
): T[] {
  return data.filter((item) => {
    for (const [key, value] of Object.entries(filters)) {
      if (key.endsWith('_neq')) {
        const field = key.replace('_neq', '');
        if (item[field] === value) return false;
      } else if (key.endsWith('_gt')) {
        const field = key.replace('_gt', '');
        if (!(item[field] > value)) return false;
      } else if (key.endsWith('_gte')) {
        const field = key.replace('_gte', '');
        if (!(item[field] >= value)) return false;
      } else if (key.endsWith('_lt')) {
        const field = key.replace('_lt', '');
        if (!(item[field] < value)) return false;
      } else if (key.endsWith('_lte')) {
        const field = key.replace('_lte', '');
        if (!(item[field] <= value)) return false;
      } else if (key.endsWith('_in')) {
        const field = key.replace('_in', '');
        if (!value.includes(item[field])) return false;
      } else if (key.endsWith('_contains')) {
        const field = key.replace('_contains', '');
        if (!item[field]?.includes?.(value)) return false;
      } else if (key.endsWith('_ilike')) {
        const field = key.replace('_ilike', '');
        const pattern = value.replace(/%/g, '.*');
        if (!new RegExp(pattern, 'i').test(item[field] || '')) return false;
      } else if (key === '_or') {
        continue;
      } else {
        if (item[key] !== value) return false;
      }
    }
    return true;
  });
}

// Handle RPC calls
function handleMockRPC(fnName: string, params: any): any {
  const builder = {
    then(resolve: (result: MockResult<any>) => void) {
      let data: any = null;

      switch (fnName) {
        case 'fetch_user_posts':
          data = getMockPostsByUser(params.p_user_id || params.creator_id) || [];
          break;
        case 'fetch_posts_by_media':
          data = getMockPostsByMedia(params.p_media_type, params.p_media_id) || [];
          break;
        case 'get_percentage_watched':
          const progress = getMockWatchProgress(
            params.p_user_id,
            params.p_media_type,
            params.p_media_id,
            params.p_season_number,
            params.p_episode_number
          );
          data = progress?.percentage_watched || 0;
          break;
        case 'get_watch_history_for_user':
          data = getMockWatchHistoryForUser(params.p_user_id) || [];
          break;
        case 'get_following_posts':
        case 'fetch_posts_from_followed_users':
          data = getMockFeedPosts(params.p_user_id || params.user_id) || [];
          break;
        case 'search_users':
          data = searchMockUsers(params.search_query || '') || [];
          break;
        case 'get_next_episodes':
          // Return empty array for next episodes
          data = [];
          break;
        case 'get_top_movie_genres_for_user':
          // Return some default movie genres
          data = [
            { genre_code: '28', count: 5 },  // Action
            { genre_code: '878', count: 4 }, // Sci-Fi
            { genre_code: '18', count: 3 },  // Drama
          ];
          break;
        case 'get_top_tv_genres_for_user':
          // Return some default TV genres
          data = [
            { genre_code: '18', count: 5 },    // Drama
            { genre_code: '10765', count: 4 }, // Sci-Fi & Fantasy
            { genre_code: '80', count: 3 },    // Crime
          ];
          break;
        case 'get_continue_watching':
          data = getMockWatchHistoryForUser(params.p_user_id || params.user_id) || [];
          break;
        default:
          console.warn(`[Mock Supabase] Unknown RPC: ${fnName}`);
          data = [];  // Return empty array instead of null
      }

      resolve(createSuccessResponse(data));
    },
  };

  return builder;
}

// Mock realtime channel
function createMockChannel(channelName: string): any {
  return {
    on: (event: string, filter: any, callback: (...args: any[]) => any) => {
      return createMockChannel(channelName);
    },
    subscribe: (callback?: (...args: any[]) => any) => {
      if (callback) callback('SUBSCRIBED');
      return createMockChannel(channelName);
    },
    unsubscribe: () => Promise.resolve(),
  };
}

// Mock auth object with all required methods
const createMockAuth = () => ({
  getUser: () =>
    Promise.resolve({
      data: {
        user: {
          id: MOCK_CURRENT_USER_ID,
          email: 'john@example.com',
          app_metadata: {},
          user_metadata: {
            name: 'John Developer',
            full_name: 'John Developer',
            picture: 'https://ui-avatars.com/api/?name=John+Developer',
          },
          aud: 'authenticated',
          created_at: '2024-01-01T00:00:00Z',
        },
      },
      error: null,
    }),
  getSession: () =>
    Promise.resolve({
      data: {
        session: {
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
          user: {
            id: MOCK_CURRENT_USER_ID,
            email: 'john@example.com',
          },
        },
      },
      error: null,
    }),
  signOut: () => Promise.resolve({ error: null }),
  signInWithOAuth: (options: any) =>
    Promise.resolve({
      data: { provider: options?.provider, url: 'https://mock-oauth-url.com' },
      error: null,
    }),
  signInWithPassword: (credentials: any) =>
    Promise.resolve({
      data: {
        user: { id: MOCK_CURRENT_USER_ID, email: credentials?.email },
        session: { access_token: 'mock-token' },
      },
      error: null,
    }),
  signUp: (credentials: any) =>
    Promise.resolve({
      data: {
        user: { id: 'new-mock-user', email: credentials?.email },
        session: null,
      },
      error: null,
    }),
  signInWithIdToken: (credentials: any) =>
    Promise.resolve({
      data: {
        user: { id: MOCK_CURRENT_USER_ID, email: 'john@example.com' },
        session: { access_token: 'mock-token' },
      },
      error: null,
    }),
  exchangeCodeForSession: (code: string) =>
    Promise.resolve({
      data: {
        user: { id: MOCK_CURRENT_USER_ID, email: 'john@example.com' },
        session: { access_token: 'mock-token' },
      },
      error: null,
    }),
  resetPasswordForEmail: (email: string) =>
    Promise.resolve({ data: {}, error: null }),
  updateUser: (attributes: any) =>
    Promise.resolve({
      data: { user: { id: MOCK_CURRENT_USER_ID, ...attributes } },
      error: null,
    }),
  onAuthStateChange: (callback: (...args: any[]) => any) => {
    callback('SIGNED_IN', {
      user: { id: MOCK_CURRENT_USER_ID, email: 'john@example.com' },
    });
    return { data: { subscription: { unsubscribe: () => {} } } };
  },
});

// Mock storage object
const createMockStorage = () => ({
  from: (bucket: string) => ({
    upload: (path: string, file: any) =>
      Promise.resolve({ data: { path }, error: null }),
    download: (path: string) =>
      Promise.resolve({ data: new Blob(), error: null }),
    getPublicUrl: (path: string) => ({
      data: { publicUrl: `https://mock-storage.com/${bucket}/${path}` },
    }),
    remove: (paths: string[]) =>
      Promise.resolve({ data: null, error: null }),
    list: (path?: string) =>
      Promise.resolve({ data: [], error: null }),
  }),
});

// Channel tracking for cleanup
let mockChannels: Map<string, any> = new Map();

// Create the mock server client (for Server Components)
export function createMockServerClient(): any {
  return {
    auth: createMockAuth(),
    from: (table: string) => createMockQueryBuilder(table),
    rpc: (fnName: string, params?: any) => handleMockRPC(fnName, params || {}),
    storage: createMockStorage(),
    channel: (name: string) => {
      const channel = createMockChannel(name);
      mockChannels.set(name, channel);
      return channel;
    },
    removeChannel: (channel: any) => {
      return Promise.resolve();
    },
    getChannels: () => Array.from(mockChannels.values()),
  };
}

// Create the mock browser client (for Client Components)
export function createMockBrowserClient(): any {
  return {
    auth: createMockAuth(),
    from: (table: string) => createMockQueryBuilder(table),
    rpc: (fnName: string, params?: any) => handleMockRPC(fnName, params || {}),
    storage: createMockStorage(),
    channel: (name: string) => {
      const channel = createMockChannel(name);
      mockChannels.set(name, channel);
      return channel;
    },
    removeChannel: (channel: any) => {
      return Promise.resolve();
    },
    getChannels: () => Array.from(mockChannels.values()),
  };
}

// Export for convenience
export { MOCK_CURRENT_USER_ID } from '../data/users';
