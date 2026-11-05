import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useModalDialog } from '../../hooks/useModalDialog';

interface AppShellProps {
  initialCollapsed?: boolean;
}

export function AppShell({ initialCollapsed = false }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useModalDialog(mobileMenuOpen);
  const location = useLocation();

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.key]);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 768px)');

    const closeOnDesktop = () => {
      if (desktop.matches) setMobileMenuOpen(false);
    };

    desktop.addEventListener('change', closeOnDesktop);

    return () => {
      desktop.removeEventListener('change', closeOnDesktop);
    };
  }, []);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="backoffice-shell flex w-full min-w-0 overflow-hidden bg-brand-50">
      <div className="hidden md:flex">
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((value) => !value)}
        />
      </div>

      <dialog
        ref={mobileMenuRef}
        id="mobile-navigation"
        aria-label="Menú de navegación"
        onCancel={closeMobileMenu}
        onClose={event => { if (mobileMenuOpen && !event.currentTarget.open) closeMobileMenu(); }}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            closeMobileMenu();
          }
        }}
        style={{ top: 'var(--dialog-top, 0px)', height: 'var(--dialog-height, 100dvh)' }}
        className="fixed inset-y-0 left-0 right-auto m-0 h-dvh max-h-none w-[248px] max-w-[calc(100vw-2rem)] border-0 bg-transparent p-0 text-inherit shadow-pop backdrop:bg-brand-950/50 md:hidden"
      >
        <Sidebar
          collapsed={false}
          onToggle={closeMobileMenu}
          onClose={closeMobileMenu}
          onNavigate={closeMobileMenu}
        />
      </dialog>

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          onOpenMenu={() => setMobileMenuOpen(true)}
          mobileMenuOpen={mobileMenuOpen}
        />

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5 sm:py-6 lg:px-8">
          <div className="mx-auto min-w-0 max-w-[1400px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
