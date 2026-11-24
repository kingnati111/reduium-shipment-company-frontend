import { randomInt } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  TRACKING_ALPHABET,
  computeCheckCharacter,
  formatTrackingNumber,
  generateTrackingNumber,
  normalizeTrackingNumber,
} from './tracking-number.js';
import { SHIPMENT_STATUSES, STATUS_INFO } from './statuses.js';
import { trackingNumberSchema } from './schemas.js';

describe('tracking numbers', () => {
  it('generates numbers in the RDM-XXXX-XXXX-X format that validate', () => {
    for (let i = 0; i < 500; i++) {
      const tn = generateTrackingNumber(randomInt);
      expect(tn).toMatch(/^RDM-[2-9A-HJKMNP-TV-Z]{4}-[2-9A-HJKMNP-TV-Z]{4}-[2-9A-HJKMNP-TV-Z]$/);
      expect(normalizeTrackingNumber(tn)).toBe(tn);
    }
  });

  it('accepts loosely typed input and returns the canonical form', () => {
    const tn = generateTrackingNumber(randomInt);
    const loose = `  ${tn.toLowerCase().replace(/-/g, ' ')} `;
    expect(normalizeTrackingNumber(loose)).toBe(tn);
    expect(normalizeTrackingNumber(tn.replace(/-/g, ''))).toBe(tn);
  });

  it('rejects every single-character typo', () => {
    const body = 'ABCD2345';
    const tn = formatTrackingNumber(body, computeCheckCharacter(body));
    const compact = tn.replace(/-/g, '').slice(3); // body + check
    for (let pos = 0; pos < compact.length; pos++) {
      for (const c of TRACKING_ALPHABET) {
        if (c === compact[pos]) continue;
        const typo = 'RDM' + compact.slice(0, pos) + c + compact.slice(pos + 1);
        expect(normalizeTrackingNumber(typo)).toBeNull();
      }
    }
  });

  it('rejects malformed input', () => {
    for (const bad of [
      '',
      'RDM',
      'XYZ-ABCD-2345-A',
      'RDM-ABCD-2345',
      'RDM-ABCD-2345-AA',
      'RDM-0BCD-2345-A',
      "RDM' OR 1=1 --",
    ]) {
      expect(normalizeTrackingNumber(bad)).toBeNull();
    }
  });

  it('zod schema returns friendly errors', () => {
    expect(trackingNumberSchema.safeParse('').success).toBe(false);
    const bad = trackingNumberSchema.safeParse('hello');
    expect(bad.success).toBe(false);
    if (!bad.success) expect(bad.error.issues[0]?.message).toMatch(/RDM-XXXX-XXXX-X/);
    const tn = generateTrackingNumber(randomInt);
    expect(trackingNumberSchema.parse(tn.toLowerCase())).toBe(tn);
  });
});

describe('statuses', () => {
  it('defines all 12 statuses with display info', () => {
    expect(SHIPMENT_STATUSES).toHaveLength(12);
    for (const s of SHIPMENT_STATUSES) expect(STATUS_INFO[s].label.length).toBeGreaterThan(0);
  });
});
