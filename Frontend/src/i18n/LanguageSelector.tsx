import { Globe } from 'lucide-react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router';
import { cn } from '../lib/cn';
import { SELECTABLE_LOCALES } from './locales';
import { switchLocaleHref, useLocale } from './locale-context';
import { saveLocale } from './preference';

/**
 * Visible language selector. Changing it keeps the current page, tracking
 * number, query and #anchor (only the /xx/ prefix changes), remembers the
 * choice on this device, and keeps the scroll position.
 *
 * A native <select>: keyboard, screen-reader and touch friendly everywhere.
 * Each option is labelled in its own language (and tagged with it, so screen
 * readers pronounce it correctly).
 */
export function LanguageSelector({ className }: { className?: string }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const location = useLocation();
  const navigate = useNavigate();
  const id = useId();

  // What's drawn: a globe plus the language's short code on phones (so the
  // menu button still fits), or its full name from tablet width up. The real
  // <select> lies invisibly on top: tapping or clicking it opens the device's
  // own list, which shows every language by its full native name.
  return (
    <div
      className={cn(
        'relative flex h-9 shrink-0 items-center gap-1.5 rounded-sm border border-paper/20 px-2.5 text-sm text-paper hover:border-paper/40 has-[select:focus-visible]:outline-2 has-[select:focus-visible]:outline-offset-2 has-[select:focus-visible]:outline-signal',
        className,
      )}
    >
      <Globe aria-hidden className="size-4 shrink-0 text-paper/70" />
      <span aria-hidden translate="no" className="type-data text-xs uppercase sm:hidden">
        {locale.code.split('-')[0]}
      </span>
      <span
        aria-hidden
        translate="no"
        lang={locale.htmlLang}
        className="hidden max-w-[9rem] truncate sm:inline"
      >
        {locale.nativeName}
      </span>
      {/* Always includes the English word too: a visitor who landed in a
          language they can't read must still be able to find this. */}
      <label htmlFor={id} className="sr-only">
        {locale.code === 'en' ? 'Language' : `${t('language.label')} (Language)`}
      </label>
      <select
        id={id}
        translate="no"
        value={locale.code}
        onChange={(e) => {
          const code = e.target.value;
          saveLocale(code);
          navigate(switchLocaleHref(location, code), { state: { keepScroll: true } });
        }}
        className="absolute inset-0 size-full cursor-pointer appearance-none opacity-0 [&>option]:bg-ink [&>option]:text-paper"
      >
        {SELECTABLE_LOCALES.map((l) => (
          <option key={l.code} value={l.code} lang={l.htmlLang}>
            {l.nativeName}
          </option>
        ))}
      </select>
    </div>
  );
}
