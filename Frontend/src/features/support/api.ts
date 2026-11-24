import type { SupportRequestReceipt, SupportTopic } from '@reduium/shared';

/** Same origin in development (Vite proxies /api). Set VITE_API_BASE_URL if the API lives elsewhere. */
const API_BASE: string = import.meta.env.VITE_API_BASE_URL ?? '';

export interface SupportFormValues {
  name: string;
  email: string;
  phone: string;
  trackingNumber: string;
  topic: SupportTopic | '';
  subject: string;
  message: string;
  /** Hidden spam trap: always empty when a person fills the form. */
  website: string;
}

export type SupportField = Exclude<keyof SupportFormValues, 'website'>;

/**
 * Every way sending can end; the form shows one clear, translated message for
 * each. The API's own (English) wording is not shown: the website translates
 * by error code and field name, so the API is unchanged.
 */
export type SubmitOutcome =
  | { kind: 'sent'; receipt: SupportRequestReceipt }
  | { kind: 'invalid'; fields: SupportField[] }
  | { kind: 'rejected' }
  | { kind: 'rate-limited' }
  | { kind: 'unavailable' }
  | { kind: 'error' };

export const SUPPORT_FIELDS: readonly SupportField[] = [
  'name',
  'email',
  'phone',
  'trackingNumber',
  'topic',
  'subject',
  'message',
];

const isReceipt = (v: unknown): v is SupportRequestReceipt =>
  !!v &&
  typeof (v as SupportRequestReceipt).reference === 'string' &&
  /^SUP-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test((v as SupportRequestReceipt).reference) &&
  typeof (v as SupportRequestReceipt).receivedAt === 'string';

export async function submitSupportRequest(values: SupportFormValues): Promise<SubmitOutcome> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/support`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
  } catch {
    return { kind: 'error' }; // offline, DNS failure, server down…
  }
  const body = (await res.json().catch(() => null)) as {
    error?: { code?: string; details?: { issues?: { field: string }[] } };
  } | null;

  if (res.status === 201 && isReceipt(body)) return { kind: 'sent', receipt: body };
  const code = body?.error?.code;
  if (res.status === 400 && code === 'VALIDATION_ERROR') {
    const fields = (body?.error?.details?.issues ?? [])
      .map((i) => i.field as SupportField)
      .filter((f, i, all) => SUPPORT_FIELDS.includes(f) && all.indexOf(f) === i);
    return { kind: 'invalid', fields };
  }
  if (res.status === 400 && code === 'SUBMISSION_REJECTED') return { kind: 'rejected' };
  if (res.status === 429) return { kind: 'rate-limited' };
  if (res.status === 503) return { kind: 'unavailable' };
  return { kind: 'error' };
}
