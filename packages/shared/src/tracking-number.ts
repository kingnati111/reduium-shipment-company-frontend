/**
 * Reduium tracking numbers look like:  RDM-7K4P-9X2Q-R
 *
 *   RDM        fixed prefix (identifies Reduium)
 *   7K4P9X2Q   8 random characters  (30^8 ≈ 656 billion combinations)
 *   R          check character (Luhn mod N)
 *
 * The alphabet leaves out characters people confuse when reading or typing:
 * 0/O, 1/I/L, and U (avoids accidental words). The check character catches
 * every single-character typo and most swapped neighbours, so an obviously
 * mistyped number can be rejected without querying the database.
 */

export const TRACKING_PREFIX = 'RDM';
export const TRACKING_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
export const TRACKING_BODY_LENGTH = 8;

const N = TRACKING_ALPHABET.length;

function codePoint(char: string): number {
  return TRACKING_ALPHABET.indexOf(char);
}

/** Luhn mod N check character for the given body. */
export function computeCheckCharacter(body: string): string {
  let factor = 2;
  let sum = 0;
  for (let i = body.length - 1; i >= 0; i--) {
    const cp = codePoint(body[i]!);
    if (cp < 0) throw new Error('Invalid character in tracking body');
    let addend = factor * cp;
    factor = factor === 2 ? 1 : 2;
    addend = Math.floor(addend / N) + (addend % N);
    sum += addend;
  }
  return TRACKING_ALPHABET[(N - (sum % N)) % N]!;
}

/** Display format: RDM-XXXX-XXXX-C */
export function formatTrackingNumber(body: string, check: string): string {
  return `${TRACKING_PREFIX}-${body.slice(0, 4)}-${body.slice(4, 8)}-${check}`;
}

/**
 * Accepts what a customer might type ("rdm 7k4p9x2qr", "RDM-7K4P-9X2Q-R")
 * and returns the canonical form, or null if it is not a valid number.
 */
export function normalizeTrackingNumber(input: string): string | null {
  const compact = input.toUpperCase().replace(/[\s-]/g, '');
  if (!compact.startsWith(TRACKING_PREFIX)) return null;

  const rest = compact.slice(TRACKING_PREFIX.length);
  if (rest.length !== TRACKING_BODY_LENGTH + 1) return null;
  if (![...rest].every((c) => TRACKING_ALPHABET.includes(c))) return null;

  const body = rest.slice(0, TRACKING_BODY_LENGTH);
  const check = rest.slice(TRACKING_BODY_LENGTH);
  if (computeCheckCharacter(body) !== check) return null;

  return formatTrackingNumber(body, check);
}

export function isValidTrackingNumber(input: string): boolean {
  return normalizeTrackingNumber(input) !== null;
}

/**
 * Creates a new tracking number. `randomIndex(max)` must return a
 * cryptographically secure integer in [0, max). The API passes Node's
 * crypto.randomInt, so numbers cannot be predicted.
 */
export function generateTrackingNumber(randomIndex: (max: number) => number): string {
  let body = '';
  for (let i = 0; i < TRACKING_BODY_LENGTH; i++) {
    body += TRACKING_ALPHABET[randomIndex(N)]!;
  }
  return formatTrackingNumber(body, computeCheckCharacter(body));
}

export const TRACKING_NUMBER_ERROR =
  'That does not look like a Reduium tracking number. It should look like RDM-XXXX-XXXX-X.';
