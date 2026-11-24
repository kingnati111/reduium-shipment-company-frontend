import { SHIPPING_METHOD_INFO, STATUS_INFO, type PublicTrackingResult } from '@reduium/shared';
import { ArrowRight, FlaskConical } from 'lucide-react';
import type { ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { LocaleLink } from '../../i18n/LocaleLink';
import { cn } from '../../lib/cn';
import { useFormatters } from './format';
import { JourneyProgress } from './JourneyProgress';

/** Statuses with extra advice for the customer (what to know, what to do). */
const ADVICE_STATUSES = ['DELAYED', 'ON_HOLD', 'DELIVERY_ATTEMPTED'] as const;
type AdviceStatus = (typeof ADVICE_STATUSES)[number];
const hasAdvice = (s: string): s is AdviceStatus =>
  (ADVICE_STATUSES as readonly string[]).includes(s);

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="type-label text-ink-400">{label}</dt>
      <dd className="mt-1.5 text-ink">{children}</dd>
    </div>
  );
}

export function TrackingSummary({ shipment }: { shipment: PublicTrackingResult }) {
  const { t } = useTranslation('tracking');
  const { t: tShipment } = useTranslation('shipment');
  const format = useFormatters();
  const info = STATUS_INFO[shipment.status];
  const advice = hasAdvice(shipment.status) ? shipment.status : null;
  const delivered = shipment.status === 'DELIVERED';
  const method = SHIPPING_METHOD_INFO[shipment.shippingMethod];
  const unavailable = <span className="text-ink-400">{t('summary.notAvailable')}</span>;

  return (
    <section
      aria-labelledby="shipment-status"
      className="rounded-md border border-fog bg-paper-50 shadow-card"
    >
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-fog px-5 py-2.5">
        <span className="type-label text-ink-400">{t('summary.shipment')}</span>
        <span className="type-data text-sm font-medium tracking-[0.06em] text-ink">
          <span className="sr-only">{t('summary.trackingNumberLabel')} </span>
          <bdi dir="ltr" translate="no">
            {shipment.trackingNumber}
          </bdi>
        </span>
      </header>

      <div className="space-y-7 p-5 sm:p-7">
        {shipment.isTestData && (
          <p
            role="note"
            className="flex items-start gap-2.5 rounded-sm border border-tone-caution/40 bg-tone-caution-bg px-3.5 py-2.5 text-sm text-tone-caution"
          >
            <FlaskConical aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span>
              <Trans
                t={t}
                i18nKey="summary.testData"
                components={{ strong: <strong className="font-semibold" /> }}
              />
            </span>
          </p>
        )}

        <div>
          <StatusBadge status={shipment.status} />
          <h2
            id="shipment-status"
            className="type-display mt-4 text-3xl leading-tight text-ink sm:text-4xl"
          >
            {tShipment(`status.${shipment.status}.label`)}
          </h2>
          {/* For exceptions, the advice below says it better than the generic description. */}
          {!advice && (
            <p className="mt-2 max-w-2xl text-ink-600">
              {delivered && shipment.deliveredAt
                ? t('summary.deliveredAt', { date: format.eventDateTime(shipment.deliveredAt) })
                : tShipment(`status.${shipment.status}.description`)}
            </p>
          )}
          {advice && (
            <p
              className={cn(
                'mt-4 max-w-2xl rounded-sm border-s-4 px-4 py-3 text-sm',
                info.tone === 'critical'
                  ? 'border-tone-critical bg-tone-critical-bg text-tone-critical'
                  : 'border-tone-caution bg-tone-caution-bg text-tone-caution',
              )}
            >
              <Trans
                t={t}
                i18nKey={`summary.advice.${advice}`}
                components={{
                  support: (
                    <LocaleLink
                      to="/support"
                      className="font-semibold underline underline-offset-2"
                    />
                  ),
                }}
              />
            </p>
          )}
        </div>

        <JourneyProgress shipment={shipment} />

        <dl className="grid gap-x-8 gap-y-6 border-t border-fog pt-6 sm:grid-cols-2 lg:grid-cols-3">
          <Fact label={t('summary.route')}>
            <span className="flex flex-wrap items-center gap-x-2">
              <span data-shipment-data dir="auto">
                {format.placeLabel(shipment.origin)}
              </span>
              <ArrowRight
                aria-label={t('summary.routeTo')}
                className="size-4 text-ink-400 rtl:-scale-x-100"
              />
              <span data-shipment-data dir="auto">
                {format.placeLabel(shipment.destination)}
              </span>
            </span>
          </Fact>
          <Fact label={t('summary.currentLocation')}>
            {shipment.currentLocation ? (
              <span data-shipment-data dir="auto">
                {shipment.currentLocation}
              </span>
            ) : (
              unavailable
            )}
          </Fact>
          {delivered ? (
            <Fact label={t('summary.delivered')}>
              {shipment.deliveredAt ? format.eventDateTime(shipment.deliveredAt) : unavailable}
            </Fact>
          ) : (
            <Fact label={t('summary.estimatedDelivery')}>
              {shipment.estimatedDeliveryDate ? (
                <>
                  {format.calendarDate(shipment.estimatedDeliveryDate)}
                  {shipment.status === 'DELAYED' && (
                    <span className="mt-0.5 block text-xs text-tone-caution">
                      {t('summary.mayChange')}
                    </span>
                  )}
                </>
              ) : (
                unavailable
              )}
            </Fact>
          )}
          <Fact label={t('summary.service')}>
            {/* A gap (not a one-sided margin) keeps the spacing right in both directions. */}
            <span className="inline-flex flex-wrap items-baseline gap-2">
              <span translate="no" className="type-data text-xs text-signal-600">
                {method.code}
              </span>
              {tShipment(`method.${shipment.shippingMethod}.label`)}
            </span>
          </Fact>
          <Fact label={t('summary.lastUpdate')}>
            <time dateTime={shipment.lastUpdatedAt}>
              {format.eventDateTime(shipment.lastUpdatedAt)}
            </time>
          </Fact>
        </dl>
      </div>
    </section>
  );
}
