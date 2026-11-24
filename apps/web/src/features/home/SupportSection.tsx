import { Clock, Mail, MapPin, Phone, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ButtonLink } from '../../components/ui/Button';
import { Container } from '../../components/ui/Container';
import { CompanyValue } from '../../components/ui/Placeholder';
import { Reveal } from '../../components/ui/Reveal';
import { SectionHeading } from '../../components/ui/SectionHeading';
import { company, type CompanyField } from '../../config/company';
import { useLocalePath } from '../../i18n/locale-context';

const CHANNELS: {
  icon: typeof Mail;
  key: 'email' | 'phone' | 'hours' | 'headOffice';
  field: CompanyField;
}[] = [
  { icon: Mail, key: 'email', field: company.contact.email },
  { icon: Phone, key: 'phone', field: company.contact.phone },
  { icon: Clock, key: 'hours', field: company.contact.hours },
  { icon: MapPin, key: 'headOffice', field: company.contact.address },
];

const FAQ = ['findNumber', 'notAccepted', 'delayed', 'updates'] as const;

export function SupportSection() {
  const localePath = useLocalePath();
  const { t } = useTranslation('home');
  return (
    <section
      id="support"
      aria-labelledby="support-title"
      className="scroll-mt-16 border-t border-fog bg-paper-50 py-20 sm:py-28"
    >
      <Container className="grid gap-14 lg:grid-cols-[1fr_1.15fr] lg:gap-20">
        <Reveal>
          <SectionHeading
            id="support-title"
            index="05"
            eyebrow={t('support.eyebrow')}
            title={t('support.title')}
            intro={t('support.intro')}
          />
          <dl className="mt-10 grid gap-px overflow-hidden rounded-md border border-fog bg-fog sm:grid-cols-2">
            {CHANNELS.map(({ icon: Icon, key, field }) => (
              <div key={key} className="flex gap-3 bg-paper p-5">
                <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-signal" strokeWidth={2} />
                <div className="min-w-0">
                  <dt className="type-label text-ink-400">{t(`support.channels.${key}`)}</dt>
                  <dd className="mt-1 break-words text-ink">
                    <CompanyValue field={field} />
                  </dd>
                </div>
              </div>
            ))}
          </dl>
          <ButtonLink to={localePath('/support')} variant="secondary" className="mt-8">
            {t('support.sendMessage')}
          </ButtonLink>
        </Reveal>

        <Reveal delay={0.08}>
          <h3 className="type-label mb-4 text-ink-600">{t('support.faqTitle')}</h3>
          <div className="border-t border-ink/80">
            {FAQ.map((key) => (
              <details key={key} className="group border-b border-fog">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-lg font-[620] marker:hidden [&::-webkit-details-marker]:hidden">
                  {t(`support.faq.${key}.question`)}
                  <Plus
                    aria-hidden
                    className="size-5 shrink-0 text-ink-400 transition-transform duration-200 group-open:rotate-45"
                  />
                </summary>
                <p className="max-w-xl pb-6 leading-relaxed text-ink-600">
                  {t(`support.faq.${key}.answer`)}
                </p>
              </details>
            ))}
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
