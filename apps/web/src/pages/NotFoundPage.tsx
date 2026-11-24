import { useTranslation } from 'react-i18next';
import { ButtonLink } from '../components/ui/Button';
import { Container } from '../components/ui/Container';
import { useLocalePath } from '../i18n/locale-context';

export function NotFoundPage() {
  const { t } = useTranslation();
  const localePath = useLocalePath();
  return (
    <>
      <title>{t('notFound.documentTitle')}</title>
      <Container className="flex flex-col items-start py-24 sm:py-32">
        <p className="type-data mb-4 text-sm text-signal">{t('notFound.eyebrow')}</p>
        <h1 className="type-display max-w-2xl text-4xl sm:text-6xl">{t('notFound.heading')}</h1>
        <p className="mt-6 max-w-lg text-lg text-ink-600">{t('notFound.body')}</p>
        <div className="mt-10 flex flex-wrap gap-3">
          <ButtonLink to={localePath('/#track')}>{t('actions.trackPackage')}</ButtonLink>
          <ButtonLink to={localePath('/')} variant="outline">
            {t('actions.goHome')}
          </ButtonLink>
        </div>
      </Container>
    </>
  );
}
