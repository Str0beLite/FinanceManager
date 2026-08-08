export type ThemePreference = 'light' | 'dark' | 'system';

export interface Settings {
  /** Used for any month without its own paycheck override. */
  readonly defaultPaycheckCents: number;
  readonly currency: string;
  readonly locale: string;
  readonly theme: ThemePreference;
}
