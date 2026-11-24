import { SHIPPING_METHODS, SHIPPING_METHOD_INFO } from '@reduium/shared';
import { Trans, useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { RouteDiagram } from '../../components/illustrations/RouteDiagram';
import { Container } from '../../components/ui/Container';
import { useLocalePath } from '../../i18n/locale-context';
import { TrackingForm } from '../tracking/TrackingForm';
import { HeroBackground } from './HeroBackground';

export function HeroSection() {
  const navigate = useNavigate();
  const localePath = useLocalePath();
  const { t } = useTranslation('home');
  const { t: tShipment } = useTranslation('shipment');

  return (
    <section
      id="track"
      aria-labelledby="hero-title"
      className="relative scroll-mt-16 overflow-hidden bg-ink text-paper"
    >
      <HeroBackground />

      <Container className="relative grid items-center gap-12 pt-14 pb-12 sm:pt-20 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:pt-24 lg:pb-20">
        <div>
          <p className="type-label mb-6 flex items-center gap-3 text-fog">
            <span className="size-1.5 rounded-full bg-signal" aria-hidden />
            {t('hero.eyebrow')}
          </p>
          <h1 id="hero-title" className="type-display text-[2.6rem] sm:text-6xl xl:text-[4.4rem]">
            <Trans
              t={t}
              i18nKey="hero.title"
              components={{ highlight: <span className="text-signal" /> }}
            />
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-fog">{t('hero.intro')}</p>

          <TrackingForm
            size="hero"
            surface="dark"
            className="mt-10 max-w-2xl"
            onTrack={(tn) => navigate(localePath(`/track/${tn}`))}
          />
          <p className="-mt-1 max-w-xl text-sm text-paper/70">
            <Trans
              t={t}
              i18nKey="hero.numberHint"
              components={{ code: <span className="type-data text-paper/80" /> }}
            />
          </p>
        </div>

        <div className="relative hidden w-full max-w-lg md:block lg:max-w-none">
          <div className="rounded-lg border border-paper/15 bg-ink/70 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-paper/10 px-5 py-3">
              <span className="type-label text-fog">{t('hero.diagramTitle')}</span>
              <span className="type-label text-paper/40">{t('hero.diagramBadge')}</span>
            </div>
            <RouteDiagram className="w-full" />
          </div>
        </div>
      </Container>

      {/* Service codes strip */}
      <div className="relative border-t border-paper/10">
        <Container>
          <ul className="grid grid-cols-2 sm:grid-cols-4">
            {SHIPPING_METHODS.map((m, i) => {
              const info = SHIPPING_METHOD_INFO[m];
              return (
                <li
                  key={m}
                  className={i > 0 ? 'sm:border-s sm:border-paper/10 sm:ps-5' : undefined}
                >
                  <Link
                    to={localePath('/#services')}
                    className="group flex items-center justify-between gap-3 py-4 text-sm text-paper/75 transition-colors hover:text-paper sm:pe-5"
                  >
                    <span className="flex items-baseline gap-3">
                      <span translate="no" className="type-data text-xs text-signal">
                        {info.code}
                      </span>
                      {tShipment(`method.${m}.label`)}
                    </span>
                    <ArrowRight
                      aria-hidden
                      className="hidden size-4 opacity-0 transition-opacity group-hover:opacity-100 sm:block rtl:-scale-x-100"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Container>
      </div>
    </section>
  );
}
