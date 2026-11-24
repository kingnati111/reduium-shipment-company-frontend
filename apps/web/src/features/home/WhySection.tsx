import { useTranslation } from 'react-i18next';
import { Container } from '../../components/ui/Container';
import { Reveal } from '../../components/ui/Reveal';
import { SectionHeading } from '../../components/ui/SectionHeading';

/*
 * Every point here describes something the platform actually does
 * (tracking history, explicit exception statuses, support linked to
 * tracking numbers). No unverifiable claims or invented statistics.
 */
const REASONS = ['oneNumber', 'handovers', 'problems', 'support'] as const;

export function WhySection() {
  const { t } = useTranslation('home');
  return (
    <section aria-labelledby="why-title" className="bg-harbor py-20 text-paper sm:py-28">
      <Container className="grid gap-14 lg:grid-cols-[1fr_1.3fr] lg:gap-20">
        <Reveal>
          <SectionHeading
            id="why-title"
            tone="dark"
            index="03"
            eyebrow={t('why.eyebrow')}
            title={t('why.title')}
          />
          <p className="mt-6 max-w-md text-lg leading-relaxed text-fog">{t('why.intro')}</p>
        </Reveal>
        <ol className="grid gap-px overflow-hidden rounded-md bg-paper/10 sm:grid-cols-2">
          {REASONS.map((r, i) => (
            <li key={r} className="bg-harbor">
              <Reveal delay={i * 0.06} className="flex h-full flex-col gap-4 p-7 sm:p-8">
                <span className="type-data text-sm text-signal">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="text-xl font-[680] [font-stretch:108%]">
                  {t(`why.reasons.${r}.title`)}
                </h3>
                <p className="leading-relaxed text-fog">{t(`why.reasons.${r}.body`)}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
