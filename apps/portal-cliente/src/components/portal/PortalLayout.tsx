import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { XIcon } from 'lucide-react';
import { PortalHeader } from './PortalHeader';
import { PortalSidebar } from './PortalSidebar';
import { Logo } from '../Logo';

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

      <AnimatePresence>
        {menuOpen ?
        <div className="fixed inset-0 z-40 lg:hidden">
            <motion.div
            className="absolute inset-0 bg-ink-900/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            onClick={() => setMenuOpen(false)} />
          
            <motion.div
            className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw]"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.26, ease: [0.23, 1, 0.32, 1] }}>
            
              <div className="relative h-full">
                <div className="absolute right-3 top-3.5 z-10">
                  <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Cerrar navegación"
                  className="flex h-8 w-8 items-center justify-center rounded-md text-white/60 outline-none transition-colors duration-150 ease-out hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-brass-400/60">
                  
                    <XIcon className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <PortalSidebar onNavigate={() => setMenuOpen(false)} />
              </div>
            </motion.div>
          </div> :
        null}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-12 items-center border-b border-slateux-200 bg-ink-900 px-4 lg:hidden">
          <Logo tone="light" size="sm" />
        </div>
        <PortalHeader onOpenMenu={() => setMenuOpen(true)} />
        <main className="mx-auto w-full max-w-[1180px] flex-1 px-4 py-6 sm:px-6 sm:py-8">
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