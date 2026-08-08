/**
 * IDs only need to be unique within one browser's save file, so a UUID is
 * plenty. The fallback covers non-secure contexts, where `randomUUID` is absent.
 */
export function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
