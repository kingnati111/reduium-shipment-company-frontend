import { STATUS_INFO, getJourneyProgress, type PublicTrackingResult } from '@reduium/shared';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/cn';

/**
 * Five-stage progress bar: Registered → At origin → In transit → Out for
 * delivery → Delivered. Completed stages are solid, the current stage is
 * highlighted, upcoming stages are pale. If the shipment is delayed, on hold
 * or a delivery was attempted, the current stage shows that in its own tone.
 */
export function JourneyProgress({ shipment }: { shipment: PublicTrackingResult }) {
  const { t } = useTranslation('tracking');
  const { t: tShipment } = useTranslation('shipment');
  const { steps, exception } = getJourneyProgress(shipment.status, shipment.events);
  const delivered = shipment.status === 'DELIVERED';
  const exceptionTone = exception ? STATUS_INFO[exception].tone : null;

  return (
    <ol className="grid grid-cols-5 gap-1.5 sm:gap-2" aria-label={t('journey.label')}>
      {steps.map((step, i) => {
        const current = step.state === 'current';
        return (
          <li
            key={step.phase}
            aria-current={current ? 'step' : undefined}
            data-state={step.state}
            className="min-w-0"
          >
            <div
              className={cn(
                'h-1.5 rounded-full',
                step.state === 'complete' && (delivered ? 'bg-tone-success' : 'bg-ink'),
                current && !exceptionTone && 'bg-signal',
                current && exceptionTone === 'caution' && 'bg-tone-caution',
                current && exceptionTone === 'critical' && 'bg-tone-critical',
                step.state === 'upcoming' && 'bg-fog',
              )}
            />
            <div className="mt-2.5 flex items-start gap-1.5">
              <span
                aria-hidden
                className={cn(
                  'mt-px hidden size-4 shrink-0 items-center justify-center rounded-full sm:flex',
                  step.state === 'complete' &&
                    (delivered ? 'bg-tone-success text-paper' : 'bg-ink text-paper'),
                  current && 'border-2 border-current bg-paper-50',
                  current && !exceptionTone && 'text-signal-600',
                  current && exceptionTone === 'caution' && 'text-tone-caution',
                  current && exceptionTone === 'critical' && 'text-tone-critical',
                  step.state === 'upcoming' && 'border border-fog',
                )}
              >
                {step.state === 'complete' && <Check className="size-2.5" strokeWidth={3.5} />}
              </span>
              <span
                className={cn(
                  'text-[0.7rem] leading-tight sm:text-xs',
                  step.state === 'upcoming' ? 'text-ink-400' : 'font-medium text-ink',
                )}
              >
                <span className="sr-only">
                  {t('journey.step', { index: i + 1, total: steps.length })}{' '}
                </span>
                {tShipment(`journey.${step.phase}`)}
                <span className="sr-only">, {t(`journey.state.${step.state}`)}</span>
                {current && exception && (
                  <span
                    className={cn(
                      'mt-0.5 block font-semibold',
                      exceptionTone === 'critical' ? 'text-tone-critical' : 'text-tone-caution',
                    )}
                  >
                    {tShipment(`status.${exception}.label`)}
                  </span>
                )}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
