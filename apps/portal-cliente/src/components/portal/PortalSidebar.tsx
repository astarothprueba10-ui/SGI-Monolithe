
import { NavLink } from 'react-router-dom';
import {
  CalendarClockIcon,
  FileTextIcon,
  HeadphonesIcon,
  LayoutDashboardIcon,
  MapPinnedIcon,
  ReceiptTextIcon,
  UserRoundIcon
} from 'lucide-react';

import { Logo } from '../Logo';
import { getPortalVisualIdentity } from '../../lib/portalSession';

export const navItems = [
  {
    to: '/portal',
    label: 'Inicio',
    icon: LayoutDashboardIcon,
    end: true
  },
  {
    to: '/portal/lote',
    label: 'Mi lote',
    icon: MapPinnedIcon,
    end: false
  },
  {
    to: '/portal/cronograma',
    label: 'Cronograma de pagos',
    icon: CalendarClockIcon,
    end: false
  },
  {
    to: '/portal/pagos',
    label: 'Pagos y vouchers',
    icon: ReceiptTextIcon,
    end: false
  },
  {
    to: '/portal/documentos',
    label: 'Documentos',
    icon: FileTextIcon,
    end: false
  },
  {
    to: '/portal/asesor',
    label: 'Mi asesor',
    icon: UserRoundIcon,
    end: false
  },
  {
    to: '/portal/soporte',
    label: 'Soporte',
    icon: HeadphonesIcon,
    end: false
  }
];

type PortalSidebarProps = {
  onNavigate?: () => void;
  showLogo?: boolean;
};

export function PortalSidebar({
  onNavigate,
  showLogo = true
}: PortalSidebarProps) {

  const { nombreMostrar, iniciales } = getPortalVisualIdentity();

  return (
    <div className="flex h-full flex-col bg-ink-900">

      {/* Logo */}
      {showLogo && (
        <div className="flex h-16 shrink-0 items-center border-b border-white/10 px-5">
          <Logo tone="light" size="sm" />
        </div>
      )}

      {/* Navegación */}
      <nav
        aria-label="Navegación del portal"
        className="flex-1 px-3 py-5"
      >
        <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/35">
          Mi compra
        </p>

        <ul className="space-y-0.5">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-3 rounded-field px-2.5 py-2.5 text-[13.5px] outline-none',
                    'transition-[background-color,color] duration-150 ease-out',
                    'focus-visible:ring-2 focus-visible:ring-brass-400/60',
                    isActive
                      ? 'bg-white/10 font-semibold text-white'
                      : 'font-medium text-white/60 hover:bg-white/[0.06] hover:text-white'
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`h-[18px] w-[18px] shrink-0 ${
                        isActive
                          ? 'text-brass-400'
                          : 'text-white/45'
                      }`}
                      aria-hidden="true"
                    />

                    <span className="truncate">
                      {label}
                    </span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Identidad del cliente autenticado */}
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">

          {/* Avatar con iniciales reales */}
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-xs font-semibold text-white"
            aria-hidden="true"
          >
            {iniciales}
          </div>

          {/* Nombre y rol */}
          <div className="min-w-0">
            <p
              className="truncate text-[13px] font-semibold text-white"
              title={nombreMostrar}
            >
              {nombreMostrar}
            </p>

            <p className="text-[11.5px] text-white/50">
              Cliente
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
