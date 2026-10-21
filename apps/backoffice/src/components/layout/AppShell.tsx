import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface AppShellProps {
  initialCollapsed?: boolean;
}

export function AppShell({ initialCollapsed = false }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDialogElement>(null);
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

  useEffect(() => {
    const dialog = mobileMenuRef.current;

    if (!dialog || !mobileMenuOpen) return;

    dialog.showModal();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="flex h-full w-full overflow-hidden bg-brand-50">
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
        onClose={closeMobileMenu}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            closeMobileMenu();
          }
        }}
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

        <main className="flex-1 overflow-y-auto px-5 py-6 lg:px-8">
          <div className="mx-auto max-w-[1400px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}