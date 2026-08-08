/** Where the whole app state lives in localStorage. */
export const STORAGE_KEY = 'finance-manager:state';

/**
 * Bump this whenever the persisted shape changes, and add a matching step to
 * `migrate()` in src/lib/storage.ts so existing saves keep working.
 */
export const SCHEMA_VERSION = 1;

/** Filename stem used when exporting a backup. */
export const EXPORT_FILENAME_PREFIX = 'finance-manager-backup';

/** Percentages are stored as basis points (1% = 100bp) so they stay integers. */
export const BASIS_POINTS_TOTAL = 10_000;

/** A category's bar turns amber once spending passes this share of its budget. */
export const WARN_THRESHOLD = 0.85;
