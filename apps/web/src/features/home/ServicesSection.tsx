import { SHIPPING_METHODS, SHIPPING_METHOD_INFO, type ShippingMethod } from '@reduium/shared';
import {
  Container as ContainerIcon,
  FileCheck2,
  type LucideIcon,
  Plane,
  ScanLine,
  Ship,
  Truck,
  Zap,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Container } from '../../components/ui/Container';
import { Reveal } from '../../components/ui/Reveal';
import { SectionHeading } from '../../components/ui/SectionHeading';

const ICONS: Record<ShippingMethod, LucideIcon> = {
  EXPRESS: Zap,
  AIR: Plane,
  OCEAN: Ship,
  ROAD: Truck,
};

const INCLUDED = [
  { icon: ScanLine, key: 'oneNumber' },
  { icon: ContainerIcon, key: 'scans' },
  { icon: FileCheck2, key: 'customs' },
] as const;

export function ServicesSection() {
  const { t } = useTranslation('home');
  const { t: tShipment } = useTranslation('shipment');
  return (
    <section
      id="services"
      aria-labelledby="services-title"
      className="scroll-mt-16 border-t border-fog bg-paper-50 py-20 sm:py-28"
    >
      <Container>
        <Reveal className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <SectionHeading
            id="services-title"
            index="02"
            eyebrow={t('services.eyebrow')}
            title={t('services.title')}
            intro={t('services.intro')}
          />
        </Reveal>

        <ol className="mt-14 border-t border-ink/80">
          {SHIPPING_METHODS.map((m, i) => {
            const info = SHIPPING_METHOD_INFO[m];
            const Icon = ICONS[m];
            return (
              <li key={m}>
                <Reveal delay={i * 0.05}>
                  <article className="group grid gap-4 border-b border-fog py-8 transition-colors hover:bg-paper sm:grid-cols-[5rem_1fr] lg:grid-cols-[6rem_1.1fr_1.4fr_14rem] lg:items-center lg:gap-8 lg:px-4">
                    <div className="flex items-center gap-3 sm:block">
                      <span translate="no" className="type-data text-sm text-signal">
                        {info.code}
                      </span>
                      <Icon
                        aria-hidden
                        className="size-5 text-ink-400 sm:mt-3 sm:block"
                        strokeWidth={1.75}
                      />
                    </div>
                    <h3 className="text-2xl font-[680] tracking-tight [font-stretch:112%]">
                      {tShipment(`method.${m}.label`)}
                    </h3>
                    <p className="leading-relaxed text-ink-600 sm:col-start-2 lg:col-start-auto">
                      {tShipment(`method.${m}.summary`)}
                    </p>
                    <div className="sm:col-start-2 lg:col-start-auto">
                      <span className="type-label block text-ink-400">{t('services.bestFor')}</span>
                      <span className="text-sm text-ink">{tShipment(`method.${m}.bestFor`)}</span>
                    </div>
                  </article>
                </Reveal>
              </li>
            );
          })}
        </ol>

        <Reveal className="mt-10 rounded-md border border-fog bg-paper p-6 sm:p-8">
          <p className="type-label mb-5 text-ink-600">{t('services.includedTitle')}</p>
          <ul className="grid gap-5 md:grid-cols-3">
            {INCLUDED.map(({ icon: Icon, key }) => (
              <li key={key} className="flex items-start gap-3">
                <Icon
                  aria-hidden
                  className="mt-0.5 size-5 shrink-0 text-signal"
                  strokeWidth={1.75}
                />
                <span className="text-ink">{t(`services.included.${key}`)}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </Container>
    </section>
  );
}
