import { useId } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  XIcon
} from 'lucide-react';
import { NAV_GROUPS } from '../../data/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../utils/cn';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onClose?: () => void;
  onNavigate?: () => void;
}

export function Sidebar({
  collapsed,
  onToggle,
  onClose,
  onNavigate
}: SidebarProps) {
  const { user, can } = useAuth();
  const activeIndicatorId = useId();

  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) =>
        can(item.permission) &&
        (!item.allowedRoles ||
          item.allowedRoles.some((role) =>
            user.roles.includes(role)
          ))
    )
  })).filter((group) => group.items.length > 0);

  return (
    <aside
      className={cn(
        'flex h-full max-w-full shrink-0 flex-col border-r border-brand-800 bg-brand-900 transition-[width] duration-200 ease-smooth',
        collapsed ? 'w-[68px]' : 'w-[248px]'
      )}
    >
      <div
        className={cn(
          'flex h-16 shrink-0 items-center gap-2.5 border-b border-white/10 px-4',
          collapsed && 'justify-center px-0'
        )}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-accent-400 text-[13px] font-bold text-brand-900">
          SM
        </span>

        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold leading-tight tracking-wide text-white">
              SIGI MONOLITHE
            </p>

            <p className="truncate text-[11px] text-brand-300">
              Gestión Inmobiliaria
            </p>
          </div>
        )}

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-brand-200 hover:bg-white/10 hover:text-white"
          >
            <XIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </div>

      <div
        className={cn(
          'flex items-center gap-3 border-b border-white/10 px-4 py-3.5',
          collapsed && 'justify-center px-0'
        )}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-brand-800 text-[12px] font-semibold text-accent-300">
          {user.initials}
        </span>

        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-white">
              {user.name}
            </p>

            <p className="truncate text-[11px] text-brand-300">
              {user.primaryRole}
            </p>
          </div>
        )}
      </div>

      <nav
        aria-label="Navegación principal"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2.5 py-3"
      >
        {groups.map((group) => (
          <div key={group.label} className="mb-4 last:mb-0">
            {!collapsed ? (
              <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-400">
                {group.label}
              </p>
            ) : (
              <div className="mx-auto mb-2 h-px w-6 bg-white/10" />
            )}

            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={onNavigate}
                    end={item.to === '/'}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      cn(
                        'group relative flex items-center gap-2.5 rounded-md px-2 py-2 text-[13px] transition-colors duration-150 ease-smooth',
                        collapsed && 'justify-center px-0',
                        isActive
                          ? 'bg-white/10 font-medium text-white'
                          : 'text-brand-200 hover:bg-white/5 hover:text-white'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <motion.span
                            layoutId={`${activeIndicatorId}-nav-active`}
                            className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r bg-accent-400"
                            transition={{
                              duration: 0.22,
                              ease: [0.23, 1, 0.32, 1]
                            }}
                          />
                        )}

                        <item.icon
                          className="h-[17px] w-[17px] shrink-0"
                          aria-hidden="true"
                        />

                        {!collapsed && (
                          <span className="truncate">
                            {item.label}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {!onClose && (
        <div className="shrink-0 border-t border-white/10 p-2.5">
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-[12px] text-brand-300 transition-colors duration-150 ease-smooth hover:bg-white/5 hover:text-white',
              collapsed && 'justify-center px-0'
            )}
          >
            {collapsed ? (
              <PanelLeftOpenIcon className="h-[17px] w-[17px]" />
            ) : (
              <PanelLeftCloseIcon className="h-[17px] w-[17px]" />
            )}

            {!collapsed && <span>Contraer menú</span>}
          </button>
        </div>
      )}
    </aside>
  );
}