# CLAUDE.md

This file provides comprehensive guidance to Claude Code (claude.ai/code) when working with this repository.

## Project Overview

RottenBrains is a social media platform for movie and TV show enthusiasts built with Next.js 15, TypeScript, Tailwind CSS, and Supabase. It enables users to share reviews, discover content through recommendations, stream movies/TV shows, and includes advanced features like VPN detection for security-conscious users.

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
npx supabase start       # Start local Supabase instance
npx supabase db push     # Apply migrations to production
npx supabase db diff     # Generate migration from remote changes
npx supabase migration new <name>  # Create new migration file
```

## Architecture & Code Organization

### Core Stack
- **Frontend Framework**: Next.js 15 with App Router (React 19)
- **Styling**: Tailwind CSS with shadcn/ui components
- **Database & Auth**: Supabase (PostgreSQL with RLS + Auth)
- **State Management**: React Context (UserContext, VideoProvider, SidebarContext)
- **Data Fetching**: Server Components for SSR, client-side fetch for interactivity
- **External APIs**: TMDB for movie/TV metadata
- **Deployment**: Vercel
- **Analytics**: Vercel Analytics & Speed Insights

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

6. **VPN Detection System**:
   - Users save known IP addresses in settings
   - Warning banner when browsing from known IPs (not using VPN)
   - Database table `user_ip_addresses` with RLS policies
   - Development testing via `NEXT_PUBLIC_TEST_IP` environment variable

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
- `watch_history` - Progress tracking (percentage_watched)
- `likes`, `saves`, `follows` - Social interactions
- `notifications` - Activity notifications
- `hidden_media` - Hide from continue watching
- `user_ip_addresses` - Known IP addresses for VPN detection

## Environment Variables

Required in `.env.local`:
```
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# TMDB API
NEXT_PUBLIC_TMDB_API_KEY=

# Production
VERCEL_URL= (for production deployments)

# Development/Testing
NEXT_PUBLIC_TEST_IP= (optional, for testing VPN detection locally)
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

The codebase recently underwent significant updates:

### Code Quality Refactoring (see IMPROVEMENTS.md)
- Centralized logging, constants, and error handling
- Input validation with Zod schemas
- Reusable infinite scroll hook
- Fixed UserContext re-rendering issues
- Migration from console.log to structured logging

### VPN Detection Feature (January 2025)
- IPAddressManager component for saving known IPs in settings
- VPNWarningProduction component showing warning banner
- Database table `user_ip_addresses` with RLS policies
- API endpoints: `/api/check-vpn-status`, `/api/check-ip`
- Development debug panel for testing
- Environment variable `NEXT_PUBLIC_TEST_IP` for local testing

## API Endpoints

### Core APIs
- `/api/saveWatchTime` - Track video watch progress
- `/api/hideFromContinueWatching` - Hide media from continue watching
- `/api/new-episodes` - Check for new episodes
- `/api/updateGenres` - Update user genre preferences

### VPN Detection APIs
- `/api/check-vpn-status` - Server-side IP detection
  - Returns current IP and whether it's a known IP
  - In production: uses request headers from Vercel
  - In development: returns localhost indicator or test IP

- `/api/check-ip` - Client-provided IP validation
  - POST endpoint accepting `{ ip: string }`
  - Checks if IP exists in user's saved addresses
  - Returns `{ ip, isKnownIP, isUsingVPN }`

## Security & Best Practices

### Authentication & Authorization
- All `/protected/*` routes require authentication via middleware
- RLS policies enforce data access at database level
- Session management handled by Supabase Auth

### Input Validation
- Use Zod schemas for all user inputs
- Validate at API boundaries before processing
- Type-safe parsing with proper error messages

### Error Handling
- Use typed error classes from `lib/errors.ts`
- Log errors with appropriate severity levels
- Return proper HTTP status codes

### Performance
- Server Components by default for initial page load
- Client Components only for interactivity
- Image optimization via Next.js Image component
- Lazy loading with dynamic imports
- Memoization for expensive computations

## Troubleshooting Guide

### VPN Detection Issues
**Problem**: VPN detection not working in development
- **Solution**: Set `NEXT_PUBLIC_TEST_IP=your.public.ip` in `.env.local`
- **Note**: localhost always shows as `::ffff:127.0.0.1` or `127.0.0.1`

**Problem**: Warning banner not showing
- **Check**: User has saved IP addresses in settings
- **Check**: Current IP matches a saved IP
- **Check**: Banner not dismissed by user

### Build Errors
**TypeScript errors**: Run `npm run type-check` to identify issues
**ESLint errors**: Run `npm run lint:fix` for auto-fixes
**Missing env vars**: Check all required variables are set

### Database Issues
**Migration not applied**: Run `npx supabase db push`
**RLS policy blocking**: Check Supabase dashboard for policy errors
**Auth errors**: Verify redirect URLs in Supabase settings

## Deployment Checklist

Before deploying to production:
- [ ] Run `npm run build` locally - should complete without errors
- [ ] Run `npm run type-check` - no TypeScript errors
- [ ] Run `npm run lint` - address any critical issues
- [ ] Apply database migrations: `npx supabase db push`
- [ ] Set all required environment variables in Vercel
- [ ] Test authentication flow
- [ ] Verify VPN detection works (if applicable)
- [ ] Check API endpoints return expected data
- [ ] Review error tracking/monitoring setup

## Notes for AI Assistants

When working on this codebase:

1. **Always use utility libraries**
   - `logger` instead of `console.log`
   - Constants from `lib/constants.ts`
   - Error classes from `lib/errors.ts`
   - Validation schemas from `lib/validations.ts`

2. **Follow established patterns**
   - Server Components by default
   - Client Components with `'use client'` directive when needed
   - API routes with proper error handling
   - Database queries with RLS consideration

3. **Maintain code quality**
   - Strict TypeScript (avoid `any`)
   - Proper error boundaries
   - Input validation on all user data
   - Performance optimizations where applicable

4. **Testing considerations**
   - VPN detection requires special setup in development
   - Use environment variables for configuration
   - Test with different user roles/permissions

5. **Documentation**
   - Update this file when adding major features
   - Document new API endpoints
   - Add JSDoc comments for complex functions
   - Keep README.md updated for users

Remember: This is a production application. Prioritize security, performance, and user experience.