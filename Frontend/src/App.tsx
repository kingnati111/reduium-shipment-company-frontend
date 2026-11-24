import { domAnimation, LazyMotion, MotionConfig } from 'motion/react';
import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { PublicLayout } from './components/layout/PublicLayout';
import './i18n/i18n';
import { EnglishDocument, LocaleLayout, RedirectToLocale } from './i18n/LocaleRoute';
import { SELECTABLE_LOCALES } from './i18n/locales';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { SupportPage } from './pages/SupportPage';
import { TrackPage } from './pages/TrackPage';

// Staff area: its own bundle, downloaded only when an /admin page is opened.
const AdminApp = lazy(() => import('./features/admin/AdminApp'));

// Internal design reference: only loaded in development, never shipped to customers.
const DesignSystemPage = import.meta.env.DEV
  ? lazy(() =>
      import('./pages/DesignSystemPage').then((mod) => ({ default: mod.DesignSystemPage })),
    )
  : null;

/**
 * Public pages live under a language prefix: /en/, /es/track/RDM-…,
 * /pt-BR/support. Addresses without one (old links, the bare domain) are
 * redirected to the visitor's language, keeping the page, tracking number,
 * query and #anchor. The admin dashboard stays at /admin, in English.
 */
const router = createBrowserRouter([
  {
    path: '/admin/*',
    element: (
      <EnglishDocument>
        <Suspense fallback={null}>
          <AdminApp />
        </Suspense>
      </EnglishDocument>
    ),
  },
  ...(DesignSystemPage
    ? [
        {
          path: '/design',
          element: (
            <EnglishDocument>
              <Suspense fallback={null}>
                <DesignSystemPage />
              </Suspense>
            </EnglishDocument>
          ),
        },
      ]
    : []),
  // One route per supported language (/en, /es, /pt-BR…; letter case is
  // corrected by LocaleLayout). Listing the codes, rather than "any first
  // segment", keeps /admin/… from ever being read as a language.
  {
    element: <LocaleLayout />,
    children: [
      {
        element: <PublicLayout />,
        children: SELECTABLE_LOCALES.map((locale) => ({
          path: `/${locale.code}`,
          children: [
            { index: true, element: <HomePage /> },
            { path: 'track', element: <TrackPage /> },
            { path: 'track/:trackingNumber', element: <TrackPage /> },
            { path: 'support', element: <SupportPage /> },
            { path: '*', element: <NotFoundPage /> },
          ],
        })),
      },
    ],
  },
  // Anything else has no language (old links such as /track/RDM-…, the bare
  // domain, /prices): redirect to the visitor's language, keeping the page,
  // tracking number, query and #anchor.
  { path: '/', element: <RedirectToLocale /> },
  { path: '*', element: <RedirectToLocale /> },
]);

export function App() {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <RouterProvider router={router} />
      </MotionConfig>
    </LazyMotion>
  );
}
