import { useTranslation } from 'react-i18next';
import { AboutSection } from '../features/home/AboutSection';
import { HeroSection } from '../features/home/HeroSection';
import { HowTrackingWorksSection } from '../features/home/HowTrackingWorksSection';
import { ServicesSection } from '../features/home/ServicesSection';
import { SupportSection } from '../features/home/SupportSection';
import { WhySection } from '../features/home/WhySection';

export function HomePage() {
  const { t } = useTranslation('home');
  return (
    <>
      <title>{t('documentTitle')}</title>
      <HeroSection />
      <AboutSection />
      <ServicesSection />
      <WhySection />
      <HowTrackingWorksSection />
      <SupportSection />
    </>
  );
}
