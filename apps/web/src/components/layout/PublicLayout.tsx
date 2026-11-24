import { Outlet } from 'react-router';
import { ScrollManager } from './ScrollManager';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';

/** Shared frame for all customer-facing pages: header, page content, footer. */
export function PublicLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <ScrollManager />
      <SiteHeader />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
