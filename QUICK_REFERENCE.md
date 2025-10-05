# Quick Reference Guide

Quick reference for using the new utilities in the RottenBrains codebase.

---

## 🪵 Logging

```typescript
import { logger } from '@/lib/logger';

// Development only (silent in production)
logger.debug('Variable value:', someVar);
logger.info('Operation completed');
logger.warn('Deprecated function used');

// Always logged (even in production)
logger.error('Critical error:', error);

// Performance timing
logger.time('operationName');
// ... code to measure
logger.timeEnd('operationName');
```

**Note:** `logger.debug()`, `logger.info()`, and `logger.warn()` are silent in production. Only `logger.error()` runs in production.

---

## 🔢 Constants

```typescript
import { PAGINATION, MEDIA_TYPES, ROUTES, ERROR_CODES, WATCH_HISTORY } from '@/lib/constants';

// Pagination
PAGINATION.POSTS_PER_PAGE; // 10
PAGINATION.MEDIA_PER_PAGE; // 12
PAGINATION.MAX_PAGES; // 10
PAGINATION.INFINITE_SCROLL_THRESHOLD; // 0.1

// Media Types
MEDIA_TYPES.MOVIE; // 'movie'
MEDIA_TYPES.TV; // 'tv'

// Routes (with helpers)
ROUTES.HOME; // '/'
ROUTES.EXPLORE; // '/protected/explore'
ROUTES.WATCH_MOVIE(123); // '/protected/watch/movie/123'
ROUTES.WATCH_TV(456, 1, 5); // '/protected/watch/tv/456/1/5'
ROUTES.USER_PROFILE('john'); // '/protected/user/john'

// Watch History
WATCH_HISTORY.CONTINUE_WATCHING_THRESHOLD; // 5%
WATCH_HISTORY.COMPLETED_THRESHOLD; // 90%
WATCH_HISTORY.HIDE_DURATION_DAYS; // 30

// Error Codes
ERROR_CODES.AUTH_UNAUTHORIZED;
ERROR_CODES.DB_QUERY_FAILED;
ERROR_CODES.VALIDATION_FAILED;
```

---

## ✅ Validation

```typescript
import {
  upsertWatchHistorySchema,
  userSchema,
  postSchema,
  searchQuerySchema,
} from '@/lib/validations';

// Validate and parse
try {
  const validated = upsertWatchHistorySchema.parse(input);
  // validated is now type-safe
} catch (error) {
  // error is a ZodError with detailed validation errors
  console.error(error.errors);
}

// Get TypeScript type from schema
import { z } from 'zod';
type User = z.infer<typeof userSchema>;
type Post = z.infer<typeof postSchema>;
```

**Available Schemas:**

- `userSchema`, `updateUserSchema`
- `watchHistorySchema`, `upsertWatchHistorySchema`, `getWatchTimeSchema`
- `postSchema`, `createPostSchema`, `updatePostSchema`
- `mediaSchema`
- `commentSchema`, `createCommentSchema`
- `likeSchema`, `saveSchema`
- `searchQuerySchema`
- `paginationSchema`
- `genreStatsSchema`
- `hideFromContinueWatchingSchema`

---

## ⚠️ Error Handling

```typescript
import {
  DatabaseError,
  ValidationError,
  AuthError,
  NotFoundError,
  handleError,
  isAppError,
} from '@/lib/errors';

// Throw custom errors
throw new DatabaseError('Failed to fetch user');
throw new ValidationError('Invalid input', { email: 'Invalid format' });
throw new AuthError('Unauthorized');
throw new NotFoundError('Resource not found');

// Handle errors
try {
  await someOperation();
} catch (error) {
  // Option 1: Use handleError utility
  const errorInfo = handleError(error, 'operationName');
  // Returns: { error: string, code: ErrorCode, statusCode: number }

  // Option 2: Check if it's an AppError
  if (isAppError(error)) {
    console.log(error.code, error.statusCode);
  }

  // Option 3: Re-throw
  throw error;
}

// Wrap function with error handling
import { withErrorHandling } from '@/lib/errors';
const safeFunction = withErrorHandling(myFunction, 'myFunction');
```

---

## ♾️ Infinite Scroll

```typescript
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

// Basic usage
const { items, loading, hasMore, ref } = useInfiniteScroll({
  fetchFunction: async (page) => {
    const response = await fetchMedia(page);
    return response.results;
  },
});

// Advanced usage with all options
const {
  items,        // Array of loaded items
  loading,      // Boolean: currently loading
  hasMore,      // Boolean: more items available
  page,         // Current page number
  ref,          // Ref for sentinel element
  inView,       // Boolean: sentinel is in view
  loadMore,     // Function: manually trigger load
  reset,        // Function: reset to initial state
  error,        // Error if loading failed
} = useInfiniteScroll({
  fetchFunction: async (page) => {
    return await fetchData(page);
  },
  initialPage: 1,
  maxPages: 10,
  threshold: 0.1,
  rootMargin: '200px',
  debug: true,
  onComplete: () => console.log('All loaded'),
  onError: (error) => console.error('Failed', error),
});

// In JSX
return (
  <div>
    {items.map(item => <Card key={item.id} data={item} />)}
    {hasMore && <div ref={ref}>Loading more...</div>}
    {loading && <Spinner />}
    {error && <ErrorMessage error={error} />}
  </div>
);
```

---

## 🔄 Migration Examples

### Replace console.log

```typescript
// Before
console.log('User data:', user);
console.error('Error:', error);

// After
import { logger } from '@/lib/logger';
logger.debug('User data:', user);
logger.error('Error:', error);
```

### Replace magic numbers

```typescript
// Before
const limit = 12;
const maxPages = 10;
if (percentage > 90) markComplete();

// After
import { PAGINATION, WATCH_HISTORY } from '@/lib/constants';
const limit = PAGINATION.MEDIA_PER_PAGE;
const maxPages = PAGINATION.MAX_PAGES;
if (percentage > WATCH_HISTORY.COMPLETED_THRESHOLD) markComplete();
```

### Add validation

```typescript
// Before
export const upsertData = async (user_id, media_id, percentage) => {
  const percent = parseFloat(percentage); // No validation!
  // ... rest
};

// After
import { upsertWatchHistorySchema } from '@/lib/validations';

export const upsertData = async (user_id, media_id, percentage) => {
  const validated = upsertWatchHistorySchema.parse({
    user_id,
    media_id,
    new_percentage_watched: percentage,
    // ... other fields
  });
  // Now type-safe and validated!
};
```

### Replace error handling

```typescript
// Before
try {
  const data = await fetchData();
  return data;
} catch (error) {
  console.error('Error:', error);
  return null;
}

// After
import { logger } from '@/lib/logger';
import { handleError, DatabaseError } from '@/lib/errors';

try {
  const data = await fetchData();
  return data;
} catch (error) {
  logger.error('Database error:', error);
  throw new DatabaseError('Failed to fetch data');
}
```

### Migrate to useInfiniteScroll

```typescript
// Before (50+ lines)
const [items, setItems] = useState([]);
const [page, setPage] = useState(1);
const [loading, setLoading] = useState(false);
const [hasMore, setHasMore] = useState(true);
const { ref, inView } = useInView({ threshold: 0.1 });

const loadMore = useCallback(async () => {
  if (inView && hasMore && !loading) {
    setLoading(true);
    try {
      const results = await fetchData(page);
      if (results.length === 0) {
        setHasMore(false);
      } else {
        setItems((prev) => [...prev, ...results]);
        setPage((prev) => prev + 1);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }
}, [inView, hasMore, loading, page]);

useEffect(() => {
  loadMore();
}, [loadMore]);

// After (4 lines)
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

const { items, loading, hasMore, ref } = useInfiniteScroll({
  fetchFunction: (page) => fetchData(page),
});
```

---

## 📋 Checklist for New Features

When adding new code:

- [ ] Import `logger` instead of using `console.log`
- [ ] Use constants from `lib/constants.ts`
- [ ] Add Zod validation for user inputs
- [ ] Use custom error classes from `lib/errors.ts`
- [ ] Use `useInfiniteScroll` hook for infinite scrolling
- [ ] Replace `any` types with proper types
- [ ] Add error handling with try-catch
- [ ] Use `useCallback` and `useMemo` for performance

---

## 🔍 Find & Replace Commands

Quick find and replace for migration:

```bash
# Replace console.log with logger
find . -type f -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/console\.log/logger.debug/g'
find . -type f -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/console\.error/logger.error/g'
find . -type f -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/console\.warn/logger.warn/g'

# Don't forget to add import!
# import { logger } from '@/lib/logger';
```

**⚠️ Warning:** Test thoroughly after mass replacements!

---

## 💻 VSCode Snippets

Add to `.vscode/snippets.code-snippets`:

```json
{
  "Import Logger": {
    "prefix": "implogger",
    "body": ["import { logger } from '@/lib/logger';"],
    "description": "Import logger utility"
  },
  "Import Constants": {
    "prefix": "impconst",
    "body": ["import { PAGINATION, MEDIA_TYPES, ROUTES } from '@/lib/constants';"],
    "description": "Import common constants"
  },
  "Import Errors": {
    "prefix": "imperr",
    "body": ["import { DatabaseError, handleError } from '@/lib/errors';"],
    "description": "Import error utilities"
  },
  "Import Validation": {
    "prefix": "impval",
    "body": ["import { $1Schema } from '@/lib/validations';"],
    "description": "Import validation schema"
  },
  "Use Infinite Scroll": {
    "prefix": "useinf",
    "body": [
      "const { items, loading, hasMore, ref } = useInfiniteScroll({",
      "  fetchFunction: async (page) => {",
      "    const response = await $1(page);",
      "    return response.results;",
      "  },",
      "});"
    ],
    "description": "Use infinite scroll hook"
  }
}
```

---

## 🎓 Tips

1. **Logging**: Use `logger.debug()` liberally during development, it's automatically silent in production
2. **Constants**: If you find yourself typing a number twice, add it to constants
3. **Validation**: Always validate user input at the API boundary
4. **Errors**: Use specific error classes (DatabaseError, ValidationError) instead of generic Error
5. **Types**: Avoid `any` - if you don't know the type, use `unknown` and validate
6. **Performance**: Use `useCallback` for functions passed as props, `useMemo` for expensive computations

---

## 📚 Related Files

- [IMPROVEMENTS.md](IMPROVEMENTS.md) - Full documentation
- [IMPROVEMENTS_SUMMARY.md](IMPROVEMENTS_SUMMARY.md) - Summary of changes
- [lib/logger.ts](lib/logger.ts) - Logger implementation
- [lib/constants.ts](lib/constants.ts) - Constants definitions
- [lib/errors.ts](lib/errors.ts) - Error classes
- [lib/validations.ts](lib/validations.ts) - Validation schemas
- [hooks/useInfiniteScroll.ts](hooks/useInfiniteScroll.ts) - Infinite scroll hook
