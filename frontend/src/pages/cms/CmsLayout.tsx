import React, { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import {
  BookTextIcon,
  Building2Icon,
  ExternalLinkIcon,
  HistoryIcon,
  HomeIcon,
  ImagesIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MenuIcon,
  PhoneCallIcon,
  SparklesIcon,
  XIcon } from
'lucide-react';
import { Logo } from '../../components/layout/Logo';
import { cmsNav } from '../../data/cms';
import { cn } from '../../utils/cn';

const icons: Record<string, React.ComponentType<{className?: string;strokeWidth?: number;}>> = {
  LayoutDashboard: LayoutDashboardIcon,
  Home: HomeIcon,
  Building2: Building2Icon,
  Sparkles: SparklesIcon,
  BookText: BookTextIcon,
  PhoneCall: PhoneCallIcon,
  Images: ImagesIcon,
  History: HistoryIcon
};

export function CmsLayout() {
  const [open, setOpen] = useState(false);

  const sidebar =
  <div className="flex h-full flex-col bg-night text-white">
      <div className="flex items-center justify-between px-6 py-6">
        <Logo light to="/cms" />
        <button
        type="button"
        onClick={() => setOpen(false)}
        aria-label="Cerrar menú"
        className="rounded-lg p-2 text-white/60 hover:bg-white/10 lg:hidden">
        
          <XIcon className="h-5 w-5" />
        </button>
      </div>
      <p className="px-6 pb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-400">
        CMS Marketing
      </p>
      <nav aria-label="Navegación del CMS" className="flex-1 overflow-y-auto px-3">
        <ul className="space-y-1">
          {cmsNav.map((item) => {
          const IconCmp = icons[item.icon] ?? LayoutDashboardIcon;
          return (
            <li key={item.to}>
                <NavLink
                to={item.to}
                end={item.end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium transition-colors duration-150 ease-out',
                  isActive ?
                  'bg-white/10 text-white' :
                  'text-white/60 hover:bg-white/5 hover:text-white'
                )
                }>
                
                  {({ isActive }) =>
                <>
                      <IconCmp
                    className={cn('h-[18px] w-[18px]', isActive ? 'text-gold' : '')}
                    strokeWidth={1.6} />
                  
                      <span className="truncate">{item.label}</span>
                    </>
                }
                </NavLink>
              </li>);

        })}
        </ul>
      </nav>

      <div className="border-t border-white/10 p-4">
        <Link
        to="/"
        target="_blank"
        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] text-white/60 transition-colors duration-150 ease-out hover:bg-white/5 hover:text-white">
        
          <ExternalLinkIcon className="h-[18px] w-[18px]" strokeWidth={1.6} />
          Ver sitio público
        </Link>
        <Link
        to="/mi-cuenta"
        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] text-white/60 transition-colors duration-150 ease-out hover:bg-white/5 hover:text-white">
        
          <LogOutIcon className="h-[18px] w-[18px]" strokeWidth={1.6} />
          Cerrar sesión
        </Link>
      </div>
    </div>;


  return (
    <div className="flex min-h-screen w-full bg-bone">
      <aside className="hidden w-[270px] shrink-0 lg:block">
        <div className="fixed inset-y-0 w-[270px]">{sidebar}</div>
      </aside>

      {open &&
      <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-night/60" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute inset-y-0 left-0 w-[280px]">{sidebar}</div>
        </div>
      }

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-line bg-white px-5 lg:px-8">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Abrir menú"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line text-night lg:hidden">
            
            <MenuIcon className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] text-muted">
              SGI MONOLITHE · Administración de contenidos
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-right sm:block">
              <span className="block text-[13px] font-semibold text-night">Lucía Vásquez</span>
              <span className="block text-[11px] text-muted">Marketing</span>
            </span>
            <span
              aria-hidden="true"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-night text-[12px] font-semibold text-gold">
              
              LV
            </span>
          </div>
        </header>

        <main className="flex-1 px-5 py-8 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>);

}