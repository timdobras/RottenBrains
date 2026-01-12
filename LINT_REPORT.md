# ESLint Report - RottenBrains Codebase

**Date:** October 2, 2025
**Status:** ✅ Linter Successfully Configured

---

## 📊 Summary

### Total Issues: **445**

- **Errors:** 20 (must fix)
- **Warnings:** 425 (should fix)

---

## 🔴 Breakdown by Category

### TypeScript Issues (172 total)

| Rule                                       | Count | Severity | Description                              |
| ------------------------------------------ | ----- | -------- | ---------------------------------------- |
| `@typescript-eslint/no-unused-vars`        | 99    | Warning  | Unused variables/imports                 |
| `@typescript-eslint/no-explicit-any`       | 70    | Warning  | Using `any` type                         |
| `@typescript-eslint/ban-ts-comment`        | 2     | Warning  | Using `@ts-ignore` or `@ts-expect-error` |
| `@typescript-eslint/no-non-null-assertion` | 1     | Warning  | Using non-null assertion `!`             |

### Code Quality Issues (257 total)

| Rule                          | Count | Severity | Description                         |
| ----------------------------- | ----- | -------- | ----------------------------------- |
| `import/order`                | ~150  | Warning  | Imports not properly ordered        |
| `no-console`                  | ~45   | Warning  | console.log/info in code            |
| `no-img-element`              | ~40   | Warning  | Using `<img>` instead of `<Image>`  |
| `react/no-unescaped-entities` | 14    | Error    | Unescaped quotes/apostrophes        |
| `react/jsx-key`               | 6     | Error    | Missing keys in lists               |
| `prefer-const`                | 2     | Warning  | Should use `const` instead of `let` |
| `eqeqeq`                      | ~5    | Warning  | Using `==` instead of `===`         |

---

## 🎯 Priority Fixes

### 🔴 Critical (Errors - Must Fix): 20 issues

#### 1. Missing React Keys (6 errors)

**Files affected:**

- `app/blog/PostCardMain.tsx:49`
- `app/loading.tsx:8`
- `app/protected/media/[media_type]/[media_id]/page.tsx:238`
- And 3 more...

**Fix:**

```typescript
// Before
{items.map((item) => <Component />)}

// After
{items.map((item) => <Component key={item.id} />)}
```

#### 2. Unescaped Entities (14 errors)

**Files affected:**

- `app/(auth)/login/page.tsx:46`
- `app/cookie-policy/page.tsx` (5 instances)
- `app/legal/page.tsx` (2 instances)
- `app/page.tsx` (2 instances)
- And more...

**Fix:**

```typescript
// Before
<p>Don't forget</p>

// After
<p>Don&apos;t forget</p>
// or
<p>{"Don't forget"}</p>
```

---

### 🟡 High Priority (Warnings - Should Fix): 425 issues

#### 1. TypeScript: Unused Variables (99 warnings)

**Most common in:**

- Import statements not being used
- Function parameters not being used
- Variables declared but never referenced

**Fix:**

```typescript
// If truly not needed - remove
// If needed later - prefix with underscore
const _unusedVar = something;
function handleClick(_event: Event) {}
```

#### 2. TypeScript: `any` Types (70 warnings)

**Files with most occurrences:**

- `app/page.tsx` (6 instances)
- `app/protected/media/[media_type]/[media_id]/page.tsx` (13 instances)
- `app/protected/explore/page.tsx` (3 instances)

**Fix:**

```typescript
// Before
const data: any = await fetchData();

// After
import { IMedia } from '@/types';
const data: IMedia[] = await fetchData();
```

#### 3. Import Order (150+ warnings)

**Impact:** Code organization and readability

**Fix (auto-fixable):**

```bash
npm run lint:fix
```

**Expected order:**

1. Built-in modules (`react`, `next/*`)
2. External packages (`@/*`)
3. Internal modules (relative imports)

#### 4. Console Statements (45 warnings)

**Already created migration script!**

**Fix:**

```bash
# Preview changes
./scripts/migrate-to-logger.sh --dry-run

# Apply changes
./scripts/migrate-to-logger.sh
```

#### 5. Using `<img>` Instead of Next.js `<Image>` (40 warnings)

**Impact:** Performance (slower LCP, higher bandwidth)

**Files most affected:**

- `app/protected/media/[media_type]/[media_id]/page.tsx` (6 instances)
- `app/protected/user/[userId]/layout.tsx`
- `app/blog/` pages

**Fix:**

```typescript
// Before
<img src={imageUrl} alt="Description" />

// After
import Image from 'next/image';
<Image src={imageUrl} alt="Description" width={500} height={300} />
```

---

## 🚀 Quick Wins (Auto-Fixable)

These can be fixed automatically:

### 1. Import Order (~150 issues)

```bash
npm run lint:fix
```

This will automatically reorder imports to match the configured style.

### 2. Format Code

```bash
npm run format
```

Already done! ✅

### 3. Console Statements (45 issues)

```bash
./scripts/migrate-to-logger.sh
```

Already created the script! ✅

---

## 📋 Detailed Action Plan

### Phase 1: Fix Critical Errors (1-2 hours)

**Priority:** Must fix before production

1. **Add missing React keys** (6 errors)

   - Search for `.map(` without `key=`
   - Add unique keys to all list items

2. **Fix unescaped entities** (14 errors)
   - Replace `'` with `&apos;` or `{'` in JSX
   - Replace `"` with `&quot;` or `{"` in JSX

### Phase 2: Auto-Fix Warnings (10 minutes)

**Tools:** Automated scripts

```bash
# 1. Fix import order
npm run lint:fix

# 2. Migrate console.log to logger
./scripts/migrate-to-logger.sh

# 3. Verify changes
npm run type-check
git diff

# 4. Test application
npm run dev
```

**Expected fixes:** ~195 warnings automatically resolved

### Phase 3: Replace `any` Types (4-6 hours)

**Priority:** Improve type safety

**Files to focus on (most `any` types):**

1. `app/protected/media/[media_type]/[media_id]/page.tsx` (13)
2. `app/page.tsx` (6)
3. `app/protected/explore/page.tsx` (3)
4. `components/features/home/InfiniteScroll.tsx` (3)

**Strategy:**

```typescript
// 1. Identify the actual type
const data: any = await fetchData();
console.log(data); // Inspect structure

// 2. Create or use existing type
import { IMedia } from '@/types';
const data: IMedia[] = await fetchData();

// 3. If truly unknown, use `unknown` instead of `any`
const data: unknown = await fetchData();
// Forces type checking before use
if (isMedia(data)) {
  // Now TypeScript knows the type
}
```

### Phase 4: Remove Unused Variables (2-3 hours)

**Priority:** Code cleanliness

**Strategy:**

```bash
# Find all unused imports
npm run lint 2>&1 | grep "is defined but never used"

# For each file, either:
# 1. Remove the unused import/variable
# 2. Prefix with _ if needed for future
# 3. Actually use it if it should be used
```

### Phase 5: Replace `<img>` with `<Image>` (3-4 hours)

**Priority:** Performance improvement

**Files:** 40 instances across ~15 files

**Strategy:**

```typescript
// 1. Import Next.js Image
import Image from 'next/image';

// 2. Replace img tags
// Before
<img src={url} alt={alt} className="..." />

// After
<Image
  src={url}
  alt={alt}
  width={500}
  height={300}
  className="..."
  priority // for above-fold images
/>

// 3. For dynamic sizes, use fill
<div className="relative h-64 w-full">
  <Image
    src={url}
    alt={alt}
    fill
    className="object-cover"
  />
</div>
```

---

## 📈 Progress Tracking

### Current State

- ✅ ESLint configured
- ✅ Prettier configured
- ✅ All code formatted
- ✅ Migration script created
- ⏳ Errors: 20 remaining
- ⏳ Warnings: 425 remaining

### After Quick Wins

- ✅ Import order fixed (~150 warnings)
- ✅ Console.log migrated (~45 warnings)
- ⏳ Errors: 20 remaining
- ⏳ Warnings: ~230 remaining

### After Phase 1 (Critical)

- ✅ All errors fixed
- ⏳ Warnings: ~230 remaining

### After All Phases

- ✅ All errors fixed
- ✅ Most warnings fixed
- ⏳ Some acceptable warnings remain (e.g., specific any types that can't be typed)

---

## 🎓 Best Practices Going Forward

### Before Committing

```bash
# 1. Run linter
npm run lint

# 2. Fix auto-fixable issues
npm run lint:fix

# 3. Check types
npm run type-check

# 4. Format code
npm run format

# 5. Review changes
git diff

# 6. Test
npm run dev
```

### When Writing New Code

#### ✅ DO:

- Use proper TypeScript types
- Import Image from next/image
- Use logger instead of console.log
- Add keys to list items
- Use constants from @/lib/constants
- Escape HTML entities

#### ❌ DON'T:

- Use `any` type
- Use `<img>` tag
- Use `console.log` in production code
- Forget keys in `.map()`
- Leave unused imports

---

## 🔧 Tools Available

### NPM Scripts

```bash
npm run lint          # Check for issues
npm run lint:fix      # Auto-fix issues
npm run format        # Format all files
npm run format:check  # Check formatting
npm run type-check    # TypeScript check
```

### Custom Scripts

```bash
# Migrate console.log to logger
./scripts/migrate-to-logger.sh --dry-run  # Preview
./scripts/migrate-to-logger.sh             # Apply
```

---

## 📊 Expected Timeline

| Phase                       | Time            | Issues Fixed   |
| --------------------------- | --------------- | -------------- |
| Phase 1: Critical Errors    | 1-2 hours       | 20 errors      |
| Phase 2: Auto-fixes         | 10 minutes      | ~195 warnings  |
| Phase 3: Replace `any`      | 4-6 hours       | 70 warnings    |
| Phase 4: Remove unused      | 2-3 hours       | 99 warnings    |
| Phase 5: Image optimization | 3-4 hours       | 40 warnings    |
| **Total**                   | **11-16 hours** | **424 issues** |

---

## 💡 Tips

1. **Use ESLint in your IDE** - Get real-time feedback as you code
2. **Fix errors first** - They break functionality
3. **Auto-fix when possible** - Save time
4. **Fix files with most issues first** - Bigger impact
5. **Test after each phase** - Ensure nothing breaks

---

## 📚 Resources

- [ESLint Rules](https://eslint.org/docs/rules/)
- [TypeScript ESLint](https://typescript-eslint.io/)
- [Next.js Image Optimization](https://nextjs.org/docs/basic-features/image-optimization)
- [React Keys](https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key)

---

**Status:** ✅ Ready to begin cleanup
**Next Step:** Run `npm run lint:fix` to auto-fix import order
