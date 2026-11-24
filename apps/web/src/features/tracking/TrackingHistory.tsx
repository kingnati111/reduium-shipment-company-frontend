import { STATUS_INFO, type PublicTrackingEvent } from '@reduium/shared';
import { MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Panel } from '../../components/ui/Panel';
import { STATUS_ICONS } from '../../components/ui/status-styles';
import { cn } from '../../lib/cn';
import { useFormatters, visitorTimeZone } from './format';

const TONE_MARKER = {
  neutral: 'border-tone-neutral text-tone-neutral',
  progress: 'border-tone-progress text-tone-progress',
  success: 'border-tone-success text-tone-success',
  caution: 'border-tone-caution text-tone-caution',
  critical: 'border-tone-critical text-tone-critical',
} as const;

/**
 * The full history, oldest first, exactly in the order the API returns it
 * (event time, then entry order, decided by the database). The newest entry
 * is the current status and is highlighted as the latest update.
 *
 * Descriptions: when staff kept the STANDARD description for a status (the
 * admin form fills it in automatically), the visitor sees it in their own
 * language. A note staff typed themselves is shown exactly as written.
 * Locations are place names and are shown as entered.
 */
export function TrackingHistory({ events }: { events: PublicTrackingEvent[] }) {
  const { t } = useTranslation('tracking');
  const { t: tShipment } = useTranslation('shipment');
  const format = useFormatters();
  const isStandard = (event: PublicTrackingEvent) =>
    event.description === STATUS_INFO[event.status].description;
  const describe = (event: PublicTrackingEvent) =>
    isStandard(event) ? tShipment(`status.${event.status}.description`) : event.description;

  return (
    <Panel
      label={t('history.title')}
      reference={t('history.count', { count: events.length })}
      bodyClassName="p-0"
    >
      {events.length === 0 ? (
        <p className="p-5 text-ink-600">{t('history.empty')}</p>
      ) : (
        <>
          <p className="border-b border-fog px-5 py-2.5 text-xs text-ink-400">
            {t('history.note', { timeZone: visitorTimeZone() })}
          </p>
          <ol className="px-5 py-4" aria-label={t('history.listLabel')}>
            {events.map((event, i) => {
              const latest = i === events.length - 1;
              const info = STATUS_INFO[event.status];
              const Icon = STATUS_ICONS[event.status];
              return (
                <li
                  key={`${event.occurredAt}-${i}`}
                  aria-current={latest ? 'step' : undefined}
                  data-latest={latest || undefined}
                  className="relative flex gap-4 pb-6 last:pb-0"
                >
                  {/* connector line between markers */}
                  {!latest && (
                    <span
                      aria-hidden
                      className="absolute top-8 bottom-0 start-[15px] w-px bg-fog"
                    />
                  )}
                  <span
                    aria-hidden
                    className={cn(
                      'relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 bg-paper-50',
                      latest
                        ? cn(TONE_MARKER[info.tone], 'ring-4 ring-signal/15')
                        : 'border-fog text-ink-400',
                    )}
                  >
                    <Icon className="size-4" strokeWidth={2.25} />
                  </span>

                  <div
                    className={cn(
                      'min-w-0 flex-1',
                      latest && '-mt-1 rounded-md border border-fog bg-paper p-3 sm:p-4',
                    )}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <p className={cn('font-semibold', latest ? 'text-ink' : 'text-ink-800')}>
                        {tShipment(`status.${event.status}.label`)}
                        {latest && (
                          <span className="type-label ms-2 align-middle text-[0.625rem] text-signal-600">
                            {t('history.latest')}
                          </span>
                        )}
                      </p>
                      <time
                        dateTime={event.occurredAt}
                        className="type-data text-xs whitespace-nowrap text-ink-400"
                      >
                        {format.eventDate(event.occurredAt)} · {format.eventTime(event.occurredAt)}
                      </time>
                    </div>
                    <p
                      className="mt-1 text-sm text-ink-600"
                      data-shipment-data={isStandard(event) ? undefined : ''}
                      dir={isStandard(event) ? undefined : 'auto'}
                    >
                      {describe(event)}
                    </p>
                    <p className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-600">
                      <MapPin aria-hidden className="size-3.5 shrink-0 text-ink-400" />
                      <span className="sr-only">{t('history.location')} </span>
                      <span data-shipment-data dir="auto">
                        {event.location}
                      </span>
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </Panel>
  );
}
