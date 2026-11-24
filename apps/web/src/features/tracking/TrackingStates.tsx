import type { LucideIcon } from 'lucide-react';
import { Info, RotateCw, SearchX, Timer, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button';
import { LocaleLink } from '../../i18n/LocaleLink';
import { cn } from '../../lib/cn';

type Tone = 'neutral' | 'caution' | 'critical';

const TONES: Record<Tone, string> = {
  neutral: 'border-fog bg-paper-50 [&_svg.state-icon]:text-ink-400',
  caution: 'border-tone-caution/40 bg-tone-caution-bg [&_svg.state-icon]:text-tone-caution',
  critical: 'border-tone-critical/40 bg-tone-critical-bg [&_svg.state-icon]:text-tone-critical',
};

function StateMessage({
  tone,
  icon: Icon,
  title,
  children,
  actions,
}: {
  tone: Tone;
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section
      aria-labelledby="tracking-state-title"
      className={cn('rounded-md border p-5 sm:p-7', TONES[tone])}
    >
      <div className="flex items-start gap-4">
        <Icon aria-hidden className="state-icon mt-1 size-6 shrink-0" />
        <div className="min-w-0">
          <h2 id="tracking-state-title" className="type-display text-xl text-ink sm:text-2xl">
            {title}
          </h2>
          <div className="mt-2 space-y-2 text-ink-600">{children}</div>
          {actions && <div className="mt-5 flex flex-wrap gap-3">{actions}</div>}
        </div>
      </div>
    </section>
  );
}

/** Tracking numbers stay left-to-right and monospaced, even inside Arabic text. */
const code = <bdi dir="ltr" translate="no" className="type-data font-medium text-ink" />;

export function TrackingLoading({ trackingNumber }: { trackingNumber: string }) {
  const { t } = useTranslation('tracking');
  return (
    <div aria-busy="true" className="space-y-6">
      <p className="text-ink-600">
        <Trans t={t} i18nKey="states.loading" values={{ trackingNumber }} components={{ code }} />
      </p>
      <div className="animate-pulse space-y-6 motion-reduce:animate-none" aria-hidden>
        <div className="rounded-md border border-fog bg-paper-50 p-7">
          <div className="h-7 w-40 rounded-xs bg-fog-200" />
          <div className="mt-5 h-9 w-2/3 rounded-xs bg-fog-200" />
          <div className="mt-8 grid grid-cols-5 gap-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-1.5 rounded-full bg-fog-200" />
            ))}
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-10 rounded-xs bg-fog-200" />
            ))}
          </div>
        </div>
        <div className="h-48 rounded-md border border-fog bg-paper-50" />
      </div>
    </div>
  );
}

export function TrackingNotFound({ trackingNumber }: { trackingNumber: string }) {
  const { t } = useTranslation('tracking');
  return (
    <StateMessage
      tone="neutral"
      icon={SearchX}
      title={t('states.notFound.title')}
      actions={
        <LocaleLink to="/support" className="font-semibold text-ink underline underline-offset-4">
          {t('states.notFound.contactSupport')}
        </LocaleLink>
      }
    >
      <p>
        <Trans
          t={t}
          i18nKey="states.notFound.body1"
          values={{ trackingNumber }}
          components={{ code }}
        />
      </p>
      <p>{t('states.notFound.body2')}</p>
    </StateMessage>
  );
}

/** The number isn't in the right format (checked in the browser and by the API). */
export function TrackingInvalid() {
  const { t } = useTranslation('tracking');
  return (
    <StateMessage tone="critical" icon={TriangleAlert} title={t('states.invalid.title')}>
      <p>{t('form.invalid')}</p>
      <p>
        <Trans t={t} i18nKey="states.invalid.example" components={{ code }} />
      </p>
    </StateMessage>
  );
}

export function TrackingRateLimited({ retryAfterSeconds }: { retryAfterSeconds: number }) {
  const { t } = useTranslation('tracking');
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return (
    <StateMessage tone="caution" icon={Timer} title={t('states.rateLimited.title')}>
      <p>{t('states.rateLimited.body', { count: minutes })}</p>
    </StateMessage>
  );
}

export function TrackingError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation('tracking');
  return (
    <StateMessage
      tone="critical"
      icon={TriangleAlert}
      title={t('states.error.title')}
      actions={
        <Button variant="secondary" onClick={onRetry}>
          <RotateCw aria-hidden className="size-4" />
          {t('states.error.retry')}
        </Button>
      }
    >
      <p>{t('states.error.body')}</p>
    </StateMessage>
  );
}

export function TrackingIntro() {
  const { t } = useTranslation('tracking');
  return (
    <StateMessage tone="neutral" icon={Info} title={t('states.intro.title')}>
      <p>
        <Trans t={t} i18nKey="states.intro.body" components={{ code }} />
      </p>
    </StateMessage>
  );
}
