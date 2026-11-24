import { useTranslation } from 'react-i18next';
import { Container } from '../components/ui/Container';
import { CompanyValue } from '../components/ui/Placeholder';
import { company } from '../config/company';
import { SupportForm } from '../features/support/SupportForm';

/**
 * Support page: contact details, and the contact form (Stage 7). Messages
 * are saved and appear in the staff support inbox (/admin/support).
 */
export function SupportPage() {
  const { t } = useTranslation('support');
  return (
    <>
      <title>{t('documentTitle')}</title>
      <section className="bg-ink text-paper">
        <Container className="py-12 sm:py-16">
          <p className="type-label mb-4 text-signal">{t('page.eyebrow')}</p>
          <h1 className="type-display text-4xl sm:text-5xl">{t('page.heading')}</h1>
        </Container>
      </section>
      <Container className="grid max-w-5xl gap-10 py-14 md:grid-cols-[1fr_1.6fr]">
        <dl className="flex flex-col gap-5">
          {(
            [
              ['email', company.contact.email],
              ['phone', company.contact.phone],
              ['hours', company.contact.hours],
              ['headOffice', company.contact.address],
            ] as const
          ).map(([label, field]) => (
            <div key={label}>
              <dt className="type-label text-ink-400">{t(`page.${label}`)}</dt>
              <dd className="mt-1 break-words text-ink">
                <CompanyValue field={field} />
              </dd>
            </div>
          ))}
        </dl>
        <div id="contact-form" className="min-w-0 scroll-mt-24">
          <SupportForm />
        </div>
      </Container>
    </>
  );
}
