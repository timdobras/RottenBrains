# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RottenBrains is a social media platform for movie and TV show enthusiasts built with Next.js 15, TypeScript, Tailwind CSS, and Supabase. It enables users to share reviews, discover content through recommendations, and stream movies/TV shows.

## Development Commands

```bash
# Development
npm run dev              # Start dev server at localhost:3000

# Building & Production
npm run build            # Build for production
npm run start            # Start production server

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix auto-fixable lint issues
npm run format           # Format with Prettier
npm run format:check     # Check formatting
npm run type-check       # TypeScript type checking

# Database (requires Supabase CLI)
npx supabase db diff     # Generate migration from remote changes
```

## Architecture & Code Organization

### Core Stack
- **Frontend Framework**: Next.js 15 with App Router (React 19)
- **Styling**: Tailwind CSS with shadcn/ui components
- **Database & Auth**: Supabase (PostgreSQL + Auth)
- **State Management**: React Context (UserContext, VideoProvider, SidebarContext)
- **Data Fetching**: Tanstack Query for client-side, server components for SSR
- **External APIs**: TMDB for movie/TV metadata

### Project Structure

```
app/                    # Next.js App Router pages
├── (auth)/            # Public auth pages
├── protected/         # Authenticated routes
│   ├── watch/        # Streaming player pages
│   ├── media/        # Movie/TV details
│   ├── user/         # User profiles
│   └── ...
lib/                   # Core utilities and services
├── supabase/         # Database client and queries
├── tmdb/             # TMDB API integration
├── client/           # Client-side utilities
├── server/           # Server-side utilities
├── constants.ts      # Centralized constants
├── logger.ts         # Logging utility
├── errors.ts         # Error handling classes
└── validations.ts    # Zod schemas
components/           # React components
├── ui/              # Base UI components (shadcn)
├── features/        # Feature-specific components
└── common/          # Shared components
hooks/               # Custom React hooks
├── useInfiniteScroll.ts  # Infinite scroll implementation
└── [Context].tsx         # Context providers
```

### Key Architectural Patterns

1. **Authentication Flow**:
   - Supabase Auth with OAuth providers (Google)
   - Session management via middleware (`middleware.ts`)
   - Protected routes under `/app/protected/`

2. **Data Flow**:
   - Server Components fetch data directly via `lib/supabase/server.ts`
   - Client Components use `lib/supabase/client.ts` or Tanstack Query
   - Watch history tracked in Supabase with percentage completion

3. **Media Streaming**:
   - Embedded player at `/protected/watch/[media_type]/[media_id]`
   - Progress tracking with `saveWatchTime` API
   - Continue watching functionality with threshold-based completion

4. **Social Features**:
   - Posts/reviews stored in `posts` table
   - Comments with nested replies (`parent_id` reference)
   - Likes, saves, and follows tracked in junction tables

5. **Infinite Scrolling**:
   - Centralized hook at `hooks/useInfiniteScroll.ts`
   - Used across explore, search, user feeds
   - Configurable pagination with `PAGINATION` constants

## Important Utilities & Patterns

### Logging
```typescript
import { logger } from '@/lib/logger';
// Use logger.debug/info/warn (dev only) or logger.error (always)
```

### Constants
```typescript
import { PAGINATION, MEDIA_TYPES, ROUTES, WATCH_HISTORY } from '@/lib/constants';
// Centralized magic numbers and route helpers
```

### Error Handling
```typescript
import { DatabaseError, ValidationError, handleError } from '@/lib/errors';
// Throw typed errors, use handleError() utility
```

### Validation
```typescript
import { postSchema, userSchema } from '@/lib/validations';
// Zod schemas for runtime validation
```

### Infinite Scroll
```typescript
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
// Reusable hook for paginated lists
```

## Database Schema

Key tables in Supabase:
- `users` - User profiles with settings
- `posts` - Reviews and social posts
- `comments` - Nested comment threads
- `watch_history` - Progress tracking
- `likes`, `saves`, `follows` - Social interactions
- `notifications` - Activity notifications
- `hidden_media` - Hide from continue watching

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
VERCEL_URL= (for production)
```

## Common Development Tasks

### Adding a New Page
1. Create route in `app/` following Next.js conventions
2. Use `app/protected/` for authenticated routes
3. Import shared layouts and providers as needed

### Working with Media Data
- Use TMDB API via `lib/tmdb/tmdbApi.ts`
- Media types: `'movie'` or `'tv'` (use `MEDIA_TYPES` constants)
- Cache responses when appropriate

### Implementing Features
1. Check existing utilities in `lib/` before creating new ones
2. Use `logger` instead of `console.log`
3. Add Zod validation for user inputs
4. Use typed errors from `lib/errors.ts`
5. Apply `useInfiniteScroll` for paginated lists

### Styling Guidelines
- Use Tailwind utility classes
- Dark mode support via `dark:` prefix
- Components in `components/ui/` follow shadcn patterns
- Custom CSS variables defined in `globals.css`

## Performance Considerations

- Server Components by default for data fetching
- Client Components only when needed (interactivity)
- Image optimization with Next.js Image component
- Lazy loading with dynamic imports for heavy components
- Memoization with useCallback/useMemo for expensive operations

## Testing & Quality

- TypeScript strict mode enabled
- ESLint configuration in `.eslintrc.json`
- Prettier for formatting (`.prettierrc.json`)
- Run `npm run type-check` before commits

## Recent Improvements

The codebase recently underwent refactoring (see IMPROVEMENTS.md) with:
- Centralized logging, constants, and error handling
- Input validation with Zod schemas
- Reusable infinite scroll hook
- Fixed UserContext re-rendering issues
- Migration from console.log to structured logging