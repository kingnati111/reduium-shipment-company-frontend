import { SHIPPING_METHODS } from '@reduium/shared';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { company } from '../../config/company';
import { mainNav } from '../../config/navigation';
import { useLocalePath } from '../../i18n/locale-context';
import { Logo } from '../brand/Logo';
import { Container } from '../ui/Container';
import { CompanyValue } from '../ui/Placeholder';

export function SiteFooter() {
  const { t } = useTranslation();
  const { t: tShipment } = useTranslation('shipment');
  const localePath = useLocalePath();
  const year = new Date().getFullYear();
  return (
    <footer className="bg-ink text-paper">
      <Container className="grid gap-12 py-16 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr] lg:py-20">
        <div className="flex flex-col gap-5">
          <Logo tone="paper" />
          <p className="max-w-xs text-fog">{t('footer.tagline')}</p>
        </div>

        <FooterColumn title={t('footer.navigate')}>
          {mainNav.map((item) => (
            <li key={item.to}>
              <Link to={localePath(item.to)} className="text-paper/80 hover:text-paper">
                {t(item.labelKey)}
              </Link>
            </li>
          ))}
        </FooterColumn>

        <FooterColumn title={t('footer.services')}>
          {SHIPPING_METHODS.map((m) => (
            <li key={m}>
              <Link to={localePath('/#services')} className="text-paper/80 hover:text-paper">
                {tShipment(`method.${m}.label`)}
              </Link>
            </li>
          ))}
        </FooterColumn>

        <FooterColumn title={t('footer.contact')}>
          <li>
            <span className="type-label block text-paper/45">{t('footer.email')}</span>
            <CompanyValue field={company.contact.email} />
          </li>
          <li>
            <span className="type-label block text-paper/45">{t('footer.phone')}</span>
            <CompanyValue field={company.contact.phone} />
          </li>
          <li>
            <span className="type-label block text-paper/45">{t('footer.headOffice')}</span>
            <CompanyValue field={company.contact.address} />
          </li>
        </FooterColumn>
      </Container>

      <div className="border-t border-paper/10">
        <Container className="flex flex-col gap-3 py-6 text-sm text-paper/55 md:flex-row md:items-center md:justify-between">
          <p>{t('footer.copyright', { year, company: company.name })}</p>
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            {Object.values(company.legal).map(
              (field, i) => field && <CompanyValue key={i} field={field} />,
            )}
          </p>
        </Container>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="type-label mb-4 text-signal">{title}</h2>
      <ul className="flex flex-col gap-2.5">{children}</ul>
    </div>
  );
}
