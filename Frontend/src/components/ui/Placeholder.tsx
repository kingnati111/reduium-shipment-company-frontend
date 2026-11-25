import { useTranslation } from 'react-i18next';
import type { CompanyField } from '../../config/company';

/**
 * Renders a company detail. If it is still a placeholder, it is shown with a
 * visible marker so nobody mistakes it for real contact information.
 * (The details themselves are business data, not interface text: they are
 * replaced with the real ones before launch, not translated.)
 */
export function CompanyValue({ field }: { field: CompanyField }) {
  const { t } = useTranslation();
  // A phrase such as the support hours is shown in the page's language.
  if (!field.placeholder && field.translationKey) {
    return <span dir="auto">{t(field.translationKey)}</span>;
  }
  // Business details (names, addresses, numbers) are never machine-translated.
  // dir="auto": phone numbers and emails stay in the right order on Arabic pages.
  if (!field.placeholder) {
    return (
      <span translate="no" dir="auto">
        {field.value}
      </span>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-baseline gap-1.5">
      <span translate="no" dir="auto">
        {field.value}
      </span>
      <span
        className="type-label rounded-xs border border-dashed border-current px-1 py-px text-[0.5625rem] opacity-70"
        title={t('placeholder.hint')}
      >
        {t('placeholder.label')}
      </span>
    </span>
  );
}
