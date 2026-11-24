import { ROLE_LABELS } from '@reduium/shared';
import { LayoutDashboard, LifeBuoy, LogOut, Package, Users } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import { LogoMark } from '../../components/brand/Logo';
import { cn } from '../../lib/cn';
import { useAuth } from './auth-context';

const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex shrink-0 items-center gap-2 rounded-sm px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-paper/10 text-paper' : 'text-paper/70 hover:bg-paper/5 hover:text-paper',
  );

/** Frame for every signed-in admin page. */
export function AdminLayout() {
  const { state, signOut, can } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  if (state.status !== 'authenticated') return null;
  const { admin } = state.info;

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <meta name="robots" content="noindex" />
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-sm focus:bg-signal focus:px-3 focus:py-2 focus:text-ink"
      >
        Skip to content
      </a>
      <header className="bg-ink text-paper">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-10">
          <Link to="/admin" className="flex items-center gap-3" aria-label="Reduium admin overview">
            <LogoMark tone="paper" className="size-8" />
            <span className="type-label hidden text-fog sm:inline">Reduium · Admin</span>
          </Link>

          <nav aria-label="Admin" className="ml-4 hidden items-center gap-1 md:flex">
            <NavLink to="/admin" end className={navLinkClasses}>
              <LayoutDashboard aria-hidden className="size-4" /> Overview
            </NavLink>
            <NavLink to="/admin/shipments" className={navLinkClasses}>
              <Package aria-hidden className="size-4" /> Shipments
            </NavLink>
            {can('support:read') && (
              <NavLink to="/admin/support" className={navLinkClasses}>
                <LifeBuoy aria-hidden className="size-4" /> Support
              </NavLink>
            )}
            {can('admins:read') && (
              <NavLink to="/admin/team" className={navLinkClasses}>
                <Users aria-hidden className="size-4" /> Team
              </NavLink>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-sm font-medium" data-testid="admin-name">
                {admin.name}
              </p>
              <p className="type-label text-[0.625rem] text-fog">{ROLE_LABELS[admin.role]}</p>
            </div>
            <button
              type="button"
              disabled={signingOut}
              onClick={async () => {
                setSigningOut(true);
                await signOut();
              }}
              className="flex items-center gap-2 rounded-sm border border-paper/20 px-3 py-2 text-sm font-medium text-paper/85 transition-colors hover:border-paper/50 hover:text-paper disabled:opacity-60"
            >
              <LogOut aria-hidden className="size-4" />
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>

        {/* Small screens: navigation as a scrollable row */}
        <nav
          aria-label="Admin (compact)"
          className="flex gap-1 overflow-x-auto border-t border-paper/10 px-4 py-2 md:hidden"
        >
          <NavLink to="/admin" end className={navLinkClasses}>
            <LayoutDashboard aria-hidden className="size-4" /> Overview
          </NavLink>
          <NavLink to="/admin/shipments" className={navLinkClasses}>
            <Package aria-hidden className="size-4" /> Shipments
          </NavLink>
          {can('support:read') && (
            <NavLink to="/admin/support" className={navLinkClasses}>
              <LifeBuoy aria-hidden className="size-4" /> Support
            </NavLink>
          )}
          {can('admins:read') && (
            <NavLink to="/admin/team" className={navLinkClasses}>
              <Users aria-hidden className="size-4" /> Team
            </NavLink>
          )}
        </nav>
      </header>

      <main
        id="admin-main"
        className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-10"
      >
        <Outlet />
      </main>
    </div>
  );
}
