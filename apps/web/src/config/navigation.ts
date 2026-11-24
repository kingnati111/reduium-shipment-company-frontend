/**
 * Main site navigation. Homepage sections are reached by #anchor. Paths are
 * written without a language; components add the current one (/es/#track).
 * Labels are dictionary keys (src/locales/<language>/common.json).
 */
export interface NavItem {
  labelKey: 'nav.track' | 'nav.services' | 'nav.howTrackingWorks' | 'nav.about' | 'nav.support';
  to: string;
}

export const mainNav: NavItem[] = [
  { labelKey: 'nav.track', to: '/#track' },
  { labelKey: 'nav.services', to: '/#services' },
  { labelKey: 'nav.howTrackingWorks', to: '/#how-it-works' },
  { labelKey: 'nav.about', to: '/#about' },
  { labelKey: 'nav.support', to: '/#support' },
];
