export type Channel = 'production' | 'beta';

/**
 * Which deployment this bundle is. Set at build time by the deploy workflow;
 * anything unset (local dev, a plain `npm run build`) is production.
 */
export const CHANNEL: Channel =
  import.meta.env.VITE_CHANNEL === 'beta' ? 'beta' : 'production';

export const IS_BETA = CHANNEL === 'beta';
