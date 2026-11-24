/**
 * Shipping methods (services) Reduium offers.
 *
 * Used by the website's services section and, from Stage 3, stored on every
 * shipment record, so the public site and admin tools always use the same list.
 *
 * ⚠ Business decision: confirm this list matches the services Reduium
 * actually provides before launch.
 */
export const SHIPPING_METHODS = ['EXPRESS', 'AIR', 'OCEAN', 'ROAD'] as const;
export type ShippingMethod = (typeof SHIPPING_METHODS)[number];

export interface ShippingMethodInfo {
  /** Short manifest code, shown in mono type. */
  code: string;
  label: string;
  summary: string;
  bestFor: string;
}

export const SHIPPING_METHOD_INFO: Record<ShippingMethod, ShippingMethodInfo> = {
  EXPRESS: {
    code: 'EXP',
    label: 'Express Parcel',
    summary:
      'Priority handling for documents and small parcels, with the fewest stops between collection and delivery.',
    bestFor: 'Documents, samples, urgent orders',
  },
  AIR: {
    code: 'AIR',
    label: 'Air Freight',
    summary:
      'Scheduled air cargo for time-sensitive consignments moving between countries and continents.',
    bestFor: 'High-value or time-critical cargo',
  },
  OCEAN: {
    code: 'SEA',
    label: 'Ocean Freight',
    summary:
      'Full and shared container shipping for large volumes where cost matters more than speed.',
    bestFor: 'Bulk stock, heavy and oversized goods',
  },
  ROAD: {
    code: 'RD',
    label: 'Road & Ground',
    summary: 'Domestic and cross-border trucking, plus the final leg from facility to door.',
    bestFor: 'Regional distribution, pallets',
  },
};
