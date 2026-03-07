/**
 * Shared constants for the discover/explore feature.
 * Used by FilterSidebar, ActiveFilters, and other discover components.
 */

// ─── Sort Options ───────────────────────────────────────────────────

export const MOVIE_SORT_OPTIONS = [
  { value: 'popularity.desc', label: 'Most Popular' },
  { value: 'popularity.asc', label: 'Least Popular' },
  { value: 'vote_average.desc', label: 'Highest Rated' },
  { value: 'vote_average.asc', label: 'Lowest Rated' },
  { value: 'primary_release_date.desc', label: 'Newest First' },
  { value: 'primary_release_date.asc', label: 'Oldest First' },
  { value: 'revenue.desc', label: 'Highest Revenue' },
  { value: 'revenue.asc', label: 'Lowest Revenue' },
  { value: 'title.asc', label: 'Title A-Z' },
  { value: 'title.desc', label: 'Title Z-A' },
  { value: 'vote_count.desc', label: 'Most Votes' },
] as const;

export const TV_SORT_OPTIONS = [
  { value: 'popularity.desc', label: 'Most Popular' },
  { value: 'popularity.asc', label: 'Least Popular' },
  { value: 'vote_average.desc', label: 'Highest Rated' },
  { value: 'vote_average.asc', label: 'Lowest Rated' },
  { value: 'first_air_date.desc', label: 'Newest First' },
  { value: 'first_air_date.asc', label: 'Oldest First' },
  { value: 'name.asc', label: 'Name A-Z' },
  { value: 'name.desc', label: 'Name Z-A' },
  { value: 'vote_count.desc', label: 'Most Votes' },
] as const;

/** Combined sort label lookup (both movie and TV sort values) */
export const SORT_LABELS: Record<string, string> = Object.fromEntries([
  ...MOVIE_SORT_OPTIONS.map((o) => [o.value, o.label]),
  ...TV_SORT_OPTIONS.map((o) => [o.value, o.label]),
]);

// ─── Languages ──────────────────────────────────────────────────────

export const LANGUAGES = [
  { code: '', label: 'Any' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'it', label: 'Italian' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'zh', label: 'Chinese' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ar', label: 'Arabic' },
  { code: 'ru', label: 'Russian' },
  { code: 'tr', label: 'Turkish' },
  { code: 'th', label: 'Thai' },
  { code: 'sv', label: 'Swedish' },
  { code: 'da', label: 'Danish' },
  { code: 'nl', label: 'Dutch' },
  { code: 'pl', label: 'Polish' },
  { code: 'no', label: 'Norwegian' },
  { code: 'fi', label: 'Finnish' },
] as const;

/** Language code → label lookup */
export const LANGUAGE_LABELS: Record<string, string> = Object.fromEntries(
  LANGUAGES.filter((l) => l.code).map((l) => [l.code, l.label])
);

// ─── Countries ──────────────────────────────────────────────────────

export const COUNTRIES = [
  { code: '', label: 'Any' },
  { code: 'US', label: 'United States' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'CA', label: 'Canada' },
  { code: 'AU', label: 'Australia' },
  { code: 'DE', label: 'Germany' },
  { code: 'FR', label: 'France' },
  { code: 'ES', label: 'Spain' },
  { code: 'IT', label: 'Italy' },
  { code: 'JP', label: 'Japan' },
  { code: 'KR', label: 'South Korea' },
  { code: 'IN', label: 'India' },
  { code: 'BR', label: 'Brazil' },
  { code: 'MX', label: 'Mexico' },
  { code: 'SE', label: 'Sweden' },
  { code: 'DK', label: 'Denmark' },
  { code: 'NO', label: 'Norway' },
  { code: 'NZ', label: 'New Zealand' },
  { code: 'IE', label: 'Ireland' },
  { code: 'TR', label: 'Turkey' },
  { code: 'RU', label: 'Russia' },
  { code: 'CN', label: 'China' },
  { code: 'TW', label: 'Taiwan' },
  { code: 'HK', label: 'Hong Kong' },
  { code: 'TH', label: 'Thailand' },
] as const;

/** Country code → label lookup */
export const COUNTRY_LABELS: Record<string, string> = Object.fromEntries(
  COUNTRIES.filter((c) => c.code).map((c) => [c.code, c.label])
);

// ─── Certifications (US, Movie only) ───────────────────────────────

export const US_CERTIFICATIONS = [
  { value: '', label: 'Any' },
  { value: 'G', label: 'G' },
  { value: 'PG', label: 'PG' },
  { value: 'PG-13', label: 'PG-13' },
  { value: 'R', label: 'R' },
  { value: 'NC-17', label: 'NC-17' },
] as const;

// ─── Release Types (Movie only) ────────────────────────────────────

export const MOVIE_RELEASE_TYPES = [
  { value: '3', label: 'Theatrical' },
  { value: '4', label: 'Digital' },
  { value: '5', label: 'Physical' },
  { value: '6', label: 'TV' },
  { value: '1', label: 'Premiere' },
  { value: '2', label: 'Theatrical Limited' },
] as const;

/** Release type value → label lookup */
export const RELEASE_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  MOVIE_RELEASE_TYPES.map((r) => [r.value, r.label])
);

// ─── TV Statuses ────────────────────────────────────────────────────

export const TV_STATUSES = [
  { value: '0', label: 'Returning Series' },
  { value: '1', label: 'Planned' },
  { value: '2', label: 'In Production' },
  { value: '3', label: 'Ended' },
  { value: '4', label: 'Cancelled' },
  { value: '5', label: 'Pilot' },
] as const;

/** TV status value → label lookup */
export const TV_STATUS_LABELS: Record<string, string> = Object.fromEntries(
  TV_STATUSES.map((s) => [s.value, s.label])
);

// ─── TV Types ───────────────────────────────────────────────────────

export const TV_TYPES = [
  { value: '4', label: 'Scripted' },
  { value: '2', label: 'Miniseries' },
  { value: '0', label: 'Documentary' },
  { value: '3', label: 'Reality' },
  { value: '5', label: 'Talk Show' },
  { value: '1', label: 'News' },
  { value: '6', label: 'Video' },
] as const;

/** TV type value → label lookup */
export const TV_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  TV_TYPES.map((t) => [t.value, t.label])
);
