import { useTranslation } from 'react-i18next';
import { ContainerStack } from '../../components/illustrations/ContainerStack';
import { Container } from '../../components/ui/Container';
import { Reveal } from '../../components/ui/Reveal';
import { SectionHeading } from '../../components/ui/SectionHeading';

export function AboutSection() {
  const { t } = useTranslation('home');
  return (
    <section id="about" aria-labelledby="about-title" className="scroll-mt-16 py-20 sm:py-28">
      <Container className="grid items-center gap-14 lg:grid-cols-[1.1fr_1fr]">
        <Reveal>
          <SectionHeading
            id="about-title"
            index="01"
            eyebrow={t('about.eyebrow')}
            title={t('about.title')}
          />
          <div className="mt-8 flex max-w-2xl flex-col gap-5 text-lg leading-relaxed text-ink-600">
            <p>{t('about.paragraph1')}</p>
            <p>{t('about.paragraph2')}</p>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="relative rounded-lg border border-fog bg-fog-200/60 p-6 sm:p-10">
            <span className="type-label absolute top-4 start-5 text-ink-400">
              {t('about.badge')}
            </span>
            <ContainerStack className="mt-4 w-full" />
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
