import { describe, expect, it } from 'vitest';
import {
  supportListQuerySchema,
  supportNoteSchema,
  supportReplySchema,
  supportRequestCreateSchema,
  supportUpdateSchema,
} from './schemas.js';
import {
  OPEN_SUPPORT_STATUSES,
  SUPPORT_STATUSES,
  generateSupportReference,
  isOpenSupportStatus,
  normalizeSupportReference,
} from './support.js';

describe('support references', () => {
  it('are SUP-XXXX-XXXX from the no-look-alike alphabet', () => {
    let i = 0;
    const ref = generateSupportReference((max) => i++ % max);
    expect(ref).toBe('SUP-2345-6789');
    for (let n = 0; n < 200; n++) {
      expect(generateSupportReference((max) => Math.floor(Math.random() * max))).toMatch(
        /^SUP-[2-9A-HJKMNP-TV-Z]{4}-[2-9A-HJKMNP-TV-Z]{4}$/,
      );
    }
  });

  it('normalise what people type, and reject anything else', () => {
    expect(normalizeSupportReference('sup 7k3m qx9p')).toBe('SUP-7K3M-QX9P');
    expect(normalizeSupportReference(' SUP-7K3M-QX9P ')).toBe('SUP-7K3M-QX9P');
    expect(normalizeSupportReference('SUP-0K3M-QX9P')).toBeNull(); // 0 is a look-alike
    expect(normalizeSupportReference('SUP-7K3M-QX9')).toBeNull();
    expect(normalizeSupportReference('RDM-7K3M-QX9P')).toBeNull();
  });
});

describe('support statuses', () => {
  it('open statuses are the first three, in workflow order', () => {
    expect(SUPPORT_STATUSES.slice(0, 3)).toEqual([...OPEN_SUPPORT_STATUSES]);
    expect(isOpenSupportStatus('WAITING_ON_CUSTOMER')).toBe(true);
    expect(isOpenSupportStatus('RESOLVED')).toBe(false);
  });
});

describe('support validation', () => {
  const valid = {
    name: ' Casey ',
    email: ' Casey@Example.COM ',
    topic: 'BILLING',
    subject: ' Invoice ',
    message: '  Please resend my invoice.  ',
  };

  it('the public form needs a topic and normalises input', () => {
    expect(supportRequestCreateSchema.parse(valid)).toMatchObject({
      name: 'Casey',
      email: 'casey@example.com',
      phone: null,
      trackingNumber: null,
      topic: 'BILLING',
      message: 'Please resend my invoice.',
    });
    expect(supportRequestCreateSchema.safeParse({ ...valid, topic: undefined }).success).toBe(
      false,
    );
    expect(supportRequestCreateSchema.safeParse({ ...valid, topic: 'SPAM' }).success).toBe(false);
  });

  it('inbox queries default to the open view, newest first', () => {
    expect(supportListQuerySchema.parse({})).toMatchObject({
      view: 'open',
      sort: 'newest',
      page: 1,
      pageSize: 25,
    });
    expect(supportListQuerySchema.parse({ status: '', q: '' })).toMatchObject({
      status: undefined,
      q: undefined,
    });
    expect(supportListQuerySchema.safeParse({ view: 'everything' }).success).toBe(false);
  });

  it('a change must change something, and carry the version it started from', () => {
    const at = '2026-11-23T10:00:00.000Z';
    expect(supportUpdateSchema.safeParse({ expectedUpdatedAt: at }).success).toBe(false);
    expect(supportUpdateSchema.safeParse({ priority: 'URGENT' }).success).toBe(false);
    expect(
      supportUpdateSchema.safeParse({ expectedUpdatedAt: at, assignedToId: null }).success,
    ).toBe(true);
    expect(
      supportUpdateSchema.safeParse({ expectedUpdatedAt: at, assignedToId: 'not-a-uuid' }).success,
    ).toBe(false);
  });

  it('notes and replies must not be blank; replies default to not changing the status', () => {
    expect(supportNoteSchema.safeParse({ body: '   ' }).success).toBe(false);
    expect(supportNoteSchema.parse({ body: ' ok ' })).toEqual({ body: 'ok' });
    expect(supportReplySchema.parse({ body: 'Hello' })).toEqual({
      body: 'Hello',
      markWaiting: false,
    });
    expect(supportReplySchema.safeParse({ body: 'x'.repeat(5001) }).success).toBe(false);
  });
});
