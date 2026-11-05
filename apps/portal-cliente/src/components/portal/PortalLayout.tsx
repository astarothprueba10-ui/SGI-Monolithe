import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { XIcon } from 'lucide-react';
import { PortalHeader } from './PortalHeader';
import { PortalSidebar } from './PortalSidebar';
import { Logo } from '../Logo';
import { MobileDrawer } from '../ui/MobileDrawer';

export function PortalLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="flex min-h-screen w-full bg-slateux-50">
      <aside className="sticky top-0 hidden h-screen w-[264px] shrink-0 lg:block">
        <PortalSidebar />
      </aside>

      <MobileDrawer open={menuOpen} onClose={() => setMenuOpen(false)} id="portal-mobile-navigation" label="Navegación del portal">
        <div className="relative flex h-full min-h-0 flex-col bg-ink-900">
          <button type="button" onClick={() => setMenuOpen(false)} aria-label="Cerrar navegación"
            className="absolute right-2 top-2 z-10 flex h-11 w-11 items-center justify-center rounded-md text-white/70 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-brass-400">
            <XIcon className="h-5 w-5" aria-hidden="true" />
          </button>
          <PortalSidebar onNavigate={() => setMenuOpen(false)} />
        </div>
      </MobileDrawer>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-12 items-center border-b border-slateux-200 bg-ink-900 px-4 lg:hidden">
          <Logo tone="light" size="sm" />
        </div>
        <PortalHeader onOpenMenu={() => setMenuOpen(true)} menuOpen={menuOpen} />
        <main className="mx-auto min-w-0 w-full max-w-[1180px] flex-1 px-4 py-6 sm:px-6 sm:py-8">
          <Outlet />
        </main>
        <footer className="border-t border-slateux-200 px-4 py-5 sm:px-6">
          <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-2 text-[12px] text-slateux-400">
            <span>© 2026 Inmobiliaria Monolithe S.A.C. · SIGI v1.0</span>
            <span>
              Información confidencial de tu operación. Acceso monitoreado.
            </span>
          </div>
        </footer>
      </div>
    </div>);

}