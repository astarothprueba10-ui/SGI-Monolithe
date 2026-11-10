import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Breadcrumbs } from './Breadcrumbs';
import { NavigationProvider } from '../../contexts/NavigationContext';
import { useModalDialog } from '../../hooks/useModalDialog';

interface AppShellProps { initialCollapsed?: boolean }

function useShellNavigation(initialCollapsed: boolean) {
  const [collapsed, setCollapsed] = useState(initialCollapsed); const [open, setOpen] = useState(false);
  const mobileRef = useModalDialog(open); const location = useLocation();
  const close = useCallback(() => setOpen(false), []);
  useEffect(close, [location.key, close]);
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 768px)');
    const dismiss = () => { if (desktop.matches) close(); };
    desktop.addEventListener('change', dismiss);
    return () => desktop.removeEventListener('change', dismiss);
  }, [close]);
  return { collapsed, setCollapsed, open, setOpen, mobileRef, close };
}

type ShellModel = ReturnType<typeof useShellNavigation>;

function MobileNavigation({ model }: { model: ShellModel }) {
  return <dialog ref={model.mobileRef} id="mobile-navigation" aria-label="Menú de navegación"
    onCancel={model.close} onClose={event => { if (model.open && !event.currentTarget.open) model.close(); }}
    onClick={event => { if (event.target === event.currentTarget) model.close(); }}
    style={{ top: 'var(--dialog-top, 0px)', height: 'var(--dialog-height, 100dvh)' }}
    className="fixed inset-y-0 left-0 right-auto m-0 h-dvh max-h-none w-[248px] max-w-[calc(100vw-2rem)] border-0 bg-transparent p-0 text-inherit shadow-pop backdrop:bg-brand-950/50 md:hidden">
    <Sidebar collapsed={false} onToggle={model.close} onClose={model.close} onNavigate={model.close} />
  </dialog>;
}

function ShellContent({ model }: { model: ShellModel }) {
  return <div className="flex min-w-0 flex-1 flex-col">
    <Header onOpenMenu={() => model.setOpen(true)} mobileMenuOpen={model.open} />
    <main className="min-h-0 min-w-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5 sm:py-6 lg:px-8">
      <div className="mx-auto min-w-0 max-w-screen-2xl">
        <Breadcrumbs className="mb-4 md:hidden" />
        <Outlet />
      </div>
    </main>
  </div>;
}

function AppShellLayout({ initialCollapsed = false }: AppShellProps) {
  const model = useShellNavigation(initialCollapsed);
  return <div className="backoffice-shell flex w-full min-w-0 overflow-hidden bg-brand-50">
    <div className="hidden md:flex"><Sidebar collapsed={model.collapsed} onToggle={() => model.setCollapsed(value => !value)} /></div>
    <MobileNavigation model={model} />
    <ShellContent model={model} />
  </div>;
}

/** Estructura adaptable con ubicación compartida y navegación móvil accesible. */
export function AppShell(props: AppShellProps) {
  return <NavigationProvider><AppShellLayout {...props} /></NavigationProvider>;
}
