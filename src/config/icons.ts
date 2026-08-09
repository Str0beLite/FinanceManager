import {
  faArrowDown,
  faArrowUp,
  faCalendarDays,
  faChartPie,
  faChevronLeft,
  faChevronRight,
  faGear,
  faLock,
  faPlus,
  faReceipt,
  faRotate,
  faSliders,
  faTableCellsLarge,
  faWallet,
  type IconDefinition,
} from '@fortawesome/free-solid-svg-icons';

/**
 * Every icon the app can draw, named by meaning rather than by glyph.
 *
 * Components ask for `"hardSet"`, not for a padlock, so re-drawing a concept is
 * a one-line change here instead of a hunt through the features. It also keeps
 * the icon package imported in exactly one place, so the bundle only carries
 * the glyphs actually listed below.
 */
export const ICONS = {
  // Navigation
  budget: faChartPie,
  spend: faReceipt,
  plan: faSliders,
  history: faCalendarDays,
  settings: faGear,

  // Concepts
  brand: faWallet,
  categories: faTableCellsLarge,
  subscriptions: faRotate,
  hardSet: faLock,
  closed: faLock,

  // Controls
  add: faPlus,
  moveUp: faArrowUp,
  moveDown: faArrowDown,
  previous: faChevronLeft,
  next: faChevronRight,
} as const satisfies Record<string, IconDefinition>;

export type IconName = keyof typeof ICONS;
