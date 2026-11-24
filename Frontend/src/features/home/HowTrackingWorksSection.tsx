import { SHIPMENT_STATUSES, STATUS_INFO, type ShipmentStatus } from '@reduium/shared';
import { Trans, useTranslation } from 'react-i18next';
import { Container } from '../../components/ui/Container';
import { Reveal } from '../../components/ui/Reveal';
import { SectionHeading } from '../../components/ui/SectionHeading';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { LocaleLink } from '../../i18n/LocaleLink';

const STEPS = ['find', 'enter', 'read'] as const;

const normal = SHIPMENT_STATUSES.filter((s) => STATUS_INFO[s].phase !== null);
const exceptions = SHIPMENT_STATUSES.filter((s) => STATUS_INFO[s].phase === null);

export function HowTrackingWorksSection() {
  const { t } = useTranslation('home');
  // Text with an inline code sample or link: the dictionary places the tags.
  const stepComponents = {
    code: <span className="type-data whitespace-nowrap text-ink" />,
    link: (
      <LocaleLink
        to="/#track"
        className="font-medium text-ink underline decoration-signal decoration-2 underline-offset-4"
      />
    ),
  };

  return (
    <section id="how-it-works" aria-labelledby="how-title" className="scroll-mt-16 py-20 sm:py-28">
      <Container>
        <Reveal>
          <SectionHeading
            id="how-title"
            index="04"
            eyebrow={t('how.eyebrow')}
            title={t('how.title')}
          />
        </Reveal>

        <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-0">
          {STEPS.map((step, i) => (
            <li key={step} className="relative md:pe-10">
              <Reveal delay={i * 0.08}>
                <div className="mb-6 flex items-center gap-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-ink type-data text-sm font-semibold">
                    {i + 1}
                  </span>
                  {i < STEPS.length - 1 && (
                    <span aria-hidden className="rule-perforated hidden flex-1 md:block" />
                  )}
                </div>
                <h3 className="text-xl font-[680] [font-stretch:108%]">
                  {t(`how.steps.${step}.title`)}
                </h3>
                <p className="mt-2 max-w-sm leading-relaxed text-ink-600">
                  <Trans t={t} i18nKey={`how.steps.${step}.body`} components={stepComponents} />
                </p>
              </Reveal>
            </li>
          ))}
        </ol>

        <Reveal className="mt-20">
          <div className="rounded-lg border border-fog bg-paper-50 shadow-card">
            <div className="flex flex-col gap-1 border-b border-fog px-6 py-5 sm:flex-row sm:items-baseline sm:justify-between sm:px-8">
              <h3 className="text-xl font-[680] [font-stretch:108%]">{t('how.statusesTitle')}</h3>
              <p className="text-sm text-ink-400">{t('how.statusesIntro')}</p>
            </div>
            <div className="grid lg:grid-cols-[1.6fr_1fr]">
              <StatusGroup title={t('how.normal')} statuses={normal} />
              <StatusGroup
                title={t('how.attention')}
                statuses={exceptions}
                className="border-t border-fog lg:border-t-0 lg:border-s"
              />
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

function StatusGroup({
  title,
  statuses,
  className,
}: {
  title: string;
  statuses: ShipmentStatus[];
  className?: string;
}) {
  const { t } = useTranslation('shipment');
  return (
    <div className={`px-6 py-6 sm:px-8 ${className ?? ''}`}>
      <p className="type-label mb-4 text-ink-400">{title}</p>
      <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {statuses.map((s) => (
          <div key={s} className="flex flex-col items-start gap-1.5">
            <dt>
              <StatusBadge status={s} size="sm" />
            </dt>
            <dd className="text-sm leading-relaxed text-ink-600">{t(`status.${s}.description`)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
