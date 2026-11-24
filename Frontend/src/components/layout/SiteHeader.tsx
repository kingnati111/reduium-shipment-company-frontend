import { ArrowRight, Menu, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { company } from '../../config/company';
import { mainNav } from '../../config/navigation';
import { LanguageSelector } from '../../i18n/LanguageSelector';
import { useLocalePath } from '../../i18n/locale-context';
import { cn } from '../../lib/cn';
import { Logo } from '../brand/Logo';
import { ButtonLink } from '../ui/Button';
import { Container } from '../ui/Container';
import { CompanyValue } from '../ui/Placeholder';

export function SiteHeader() {
  const { t } = useTranslation();
  const localePath = useLocalePath();
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // While the mobile menu is open: lock page scroll, focus the first link,
  // close on Escape, and close automatically if the screen becomes desktop-wide.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.querySelector<HTMLAnchorElement>('a')?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    const desktop = window.matchMedia('(min-width: 1024px)');
    const onResize = () => desktop.matches && setOpen(false);

    document.addEventListener('keydown', onKey);
    desktop.addEventListener('change', onResize);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
      desktop.removeEventListener('change', onResize);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-paper/10 bg-ink text-paper">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:start-3 focus:z-50 focus:rounded-sm focus:bg-signal focus:px-3 focus:py-2 focus:text-ink"
        >
          {t('skipToContent')}
        </a>
        <Container className="flex h-16 items-center justify-between gap-6 lg:h-[4.5rem]">
          <Link
            to={localePath('/')}
            onClick={close}
            aria-label={t('homeLinkLabel')}
            className="shrink-0 rounded-sm"
          >
            <Logo tone="paper" />
          </Link>

          <nav aria-label={t('nav.mainLabel')} className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {mainNav.map((item) => (
                <li key={item.to}>
                  <Link
                    to={localePath(item.to)}
                    className="rounded-sm px-3 py-2 text-[0.9375rem] text-paper/80 transition-colors hover:bg-paper/[0.06] hover:text-paper"
                  >
                    {t(item.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* min-w-0: with long translations this cluster shrinks instead of
              pushing the page wider than the screen. */}
          <div className="flex min-w-0 items-center justify-end gap-2">
            <LanguageSelector />
            {/* Phones get this button in the menu instead. (max-sm:hidden, not
                "hidden sm:inline-flex": the button's own inline-flex would win.) */}
            <ButtonLink
              to={localePath('/#track')}
              size="sm"
              className="min-w-0 shrink max-sm:hidden"
              title={t('actions.trackPackage')}
            >
              <span className="truncate">{t('actions.trackPackage')}</span>
            </ButtonLink>
            <button
              ref={toggleRef}
              type="button"
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-sm text-paper hover:bg-paper/[0.08] lg:hidden"
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? t('actions.closeMenu') : t('actions.openMenu')}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? (
                <X aria-hidden className="size-5" />
              ) : (
                <Menu aria-hidden className="size-5" />
              )}
            </button>
          </div>
        </Container>
      </header>

      {/* Mobile & tablet menu. Kept outside <header>: the header's backdrop blur
          would otherwise trap this fixed panel inside the header's 64px height. */}
      <div
        id="mobile-menu"
        ref={panelRef}
        hidden={!open}
        className={cn(
          'fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto bg-ink text-paper lg:hidden',
        )}
      >
        <Container className="flex min-h-full flex-col justify-between gap-10 py-8">
          <nav aria-label={t('nav.mobileLabel')}>
            <ul className="flex flex-col">
              {mainNav.map((item, i) => (
                <li key={item.to} className="border-b border-paper/10">
                  <Link
                    to={localePath(item.to)}
                    onClick={close}
                    className="group flex items-center justify-between py-4 text-2xl font-[650] [font-stretch:112%]"
                  >
                    <span className="flex items-baseline gap-4">
                      <span className="type-data text-xs text-signal">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      {t(item.labelKey)}
                    </span>
                    <ArrowRight
                      aria-hidden
                      className={cn(
                        'size-5 text-paper/40 transition-transform',
                        'group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1', // rtl-ok: nudges toward the reading direction
                      )}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex flex-col gap-5">
            <ButtonLink to={localePath('/#track')} onClick={close} size="lg" className="w-full">
              {t('actions.trackPackage')}
            </ButtonLink>
            <div className="text-sm text-fog">
              <p className="type-label mb-1 text-paper/50">{t('footer.customerSupport')}</p>
              <CompanyValue field={company.contact.email} />
            </div>
          </div>
        </Container>
      </div>
    </>
  );
}
