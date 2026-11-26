import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BellIcon,
  ChevronDownIcon,
  CircleUserIcon,
  LogOutIcon,
  MenuIcon,
  SearchIcon,
  SettingsIcon,
  ShieldCheckIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { ALL_NAV_ITEMS } from '../../data/navigation';
import { useFinanceAlertsBell } from '../../hooks/useFinanceAlertsBell';
import { useAuth } from '../../contexts/AuthContext';
import { Dropdown, DropdownItem, DropdownLabel } from '../ui/Dropdown';
import { Badge } from '../ui/Badge';
import { cn } from '../../utils/cn';
import { authApi } from '../../lib/apiClient';
import { Breadcrumbs } from './Breadcrumbs';
import {
  clearStoredSession,
  getRefreshToken
} from '../../lib/authSession';

interface HeaderProps {
  onOpenMenu: () => void;
  mobileMenuOpen?: boolean;
}

export function Header({
  onOpenMenu,
  mobileMenuOpen = false
}: HeaderProps) {
  const { user, can } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const {
    autorizado, notifications, unreadCount, loading:loadingAlerts,
    error:alertsError, refresh:refreshAlerts, markSeen, seenSet
  } = useFinanceAlertsBell();

  const results = useMemo(() => {
    if (query.trim().length < 2) return [];

    const q = query.toLowerCase();

    return ALL_NAV_ITEMS.filter(
      (item) =>
        can(item.permission) &&
        item.label.toLowerCase().includes(q)
    ).slice(0, 5);
  }, [query, can]);

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-brand-100 bg-white/95 px-3 md:backdrop-blur md:gap-4 md:px-5">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Abrir menú de navegación"
        aria-controls="mobile-navigation"
        aria-expanded={mobileMenuOpen}
        aria-haspopup="dialog"
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-brand-200 text-brand-700 hover:bg-brand-50 md:hidden"
      >
        <MenuIcon className="h-5 w-5" aria-hidden="true" />
      </button>

      <Breadcrumbs className="hidden max-h-14 max-w-[50%] overflow-y-auto md:block" />

      <div className="relative ml-auto min-w-0 flex-1 md:max-w-sm">
        <SearchIcon
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-300"
          aria-hidden="true"
        />

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar lote, cliente, venta o módulo…"
          aria-label="Buscador global"
          className="h-9 w-full rounded-md border border-brand-200 bg-brand-50/60 pl-9 pr-3 text-[13px] text-brand-800 placeholder:text-brand-300 transition-colors duration-150 ease-smooth focus:border-brand-400 focus:bg-white md:pr-16"
        />

        <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-brand-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-brand-400 md:block">
          ⌘K
        </kbd>

        {results.length > 0 ? (
          <div className="header-popover absolute left-0 right-0 top-11 z-40 max-h-[calc(100dvh-5rem)] overflow-y-auto rounded-lg border border-brand-100 bg-white py-1 shadow-pop">
            <DropdownLabel>Módulos autorizados</DropdownLabel>

            {results.map((r) => (
              <button
                key={r.to}
                type="button"
                onClick={() => {
                  navigate(r.to);
                  setQuery('');
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-brand-700 transition-colors duration-150 ease-smooth hover:bg-brand-50"
              >
                <r.icon className="h-4 w-4 text-brand-400" />
                {r.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <Dropdown
        mobilePlacement="header"
        width="w-80"
        trigger={({ toggle, open }) => (
          <button
            type="button"
            onClick={() => {
              if (!open) void refreshAlerts();
              toggle();
            }}
            aria-label={unreadCount>0 ? `Notificaciones: ${unreadCount} alertas nuevas` : 'Notificaciones'}
            className={cn(
              'relative inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors duration-150 ease-smooth',
              open
                ? 'border-brand-300 bg-brand-50 text-brand-800'
                : 'border-brand-200 text-brand-500 hover:bg-brand-50'
            )}
          >
            <BellIcon className="h-[18px] w-[18px]" />

            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white ring-2 ring-white"
                aria-hidden="true">{unreadCount>99?'99+':unreadCount}</span>
            ) : null}
          </button>
        )}
      >
        {({ close }) => (
          <div>
            <div className="flex items-center justify-between px-3 py-2">
              <p className="text-[13px] font-semibold text-brand-900">
                Notificaciones
              </p>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-brand-500">{notifications.length} activas</span>
                <Badge tone="brand">{unreadCount} nuevas</Badge>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto border-t border-brand-100" aria-live="polite">
              {!autorizado && <p className="px-3 py-5 text-center text-xs text-brand-500">
                Sin notificaciones disponibles para este rol.
              </p>}
              {autorizado && alertsError && <div role="alert" className="px-3 py-3 text-xs text-rose-700">
                No se pudieron actualizar los avisos. {alertsError}
                <button type="button" onClick={()=>void refreshAlerts()} className="mt-2 block font-semibold underline">
                  Reintentar
                </button>
              </div>}
              {autorizado && loadingAlerts && notifications.length===0 &&
                <p className="px-3 py-5 text-center text-xs text-brand-500">Consultando alertas reales…</p>}
              {autorizado && !loadingAlerts && !alertsError && notifications.length===0 &&
                <p className="px-3 py-5 text-center text-xs text-brand-500">
                  No tienes notificaciones activas.
                </p>}
              {notifications.slice(0,30).map(n=>(
                <button key={n.id} type="button"
                  onClick={()=>{markSeen([n.id]);navigate(n.to);close();}}
                  className="flex w-full gap-2.5 border-b border-brand-50 px-3 py-2.5 text-left transition-colors duration-150 ease-smooth last:border-0 hover:bg-brand-50"
                >
                  <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full',
                    n.tone==='danger'?'bg-rose-500':'bg-amber-500')} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-[13px] font-medium text-brand-800">
                      {n.title}
                      {!seenSet.has(n.id) && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                        Nueva
                      </span>}
                    </span>
                    <span className="block text-[12px] text-brand-500">{n.description}</span>
                    <span className="mt-0.5 block text-[11px] text-brand-400">{n.time}</span>
                  </span>
                </button>
              ))}
              {notifications.length>30 && <button type="button"
                className="w-full px-3 py-3 text-center text-xs font-semibold text-brand-700 hover:bg-brand-50"
                onClick={()=>{navigate(notifications.some(n=>n.module==='sales')?'/ventas':'/financiamiento?tab=alertas');close();}}>
                Ver todas las alertas ({notifications.length})
              </button>}
            </div>
            {autorizado && notifications.length>0 && <div className="flex justify-end border-t border-brand-100 px-3 py-2">
              <button type="button" disabled={unreadCount===0}
                className="text-[11px] font-semibold text-brand-700 disabled:opacity-40"
                onClick={()=>markSeen(notifications.map(n=>n.id))}>
                Marcar todas como leídas
              </button>
            </div>}
          </div>
        )}
      </Dropdown>

      <Dropdown
        mobilePlacement="header"
        trigger={({ toggle }) => (
          <button
            type="button"
            onClick={toggle}
            className="flex items-center gap-2.5 rounded-md border border-transparent py-1 pl-1 pr-1.5 transition-colors duration-150 ease-smooth hover:bg-brand-50"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-800 text-[12px] font-semibold text-white">
              {user.initials}
            </span>

            <span className="hidden text-left lg:block">
              <span className="block text-[13px] font-medium leading-tight text-brand-800">
                {user.name}
              </span>

              <span className="block text-[11px] leading-tight text-brand-400">
                {user.jobTitle}
              </span>
            </span>

            <ChevronDownIcon
              className="h-4 w-4 text-brand-400"
              aria-hidden="true"
            />
          </button>
        )}
      >
        {({ close }) => (
          <div>
            <div className="border-b border-brand-100 px-3 py-2.5">
              <p className="text-[13px] font-semibold text-brand-900">
                {user.name}
              </p>

              <p className="text-[12px] text-brand-400">
                {user.email}
              </p>

              <div className="mt-2 flex flex-wrap gap-1">
                {user.roles.map((r) => (
                  <Badge key={r} tone="brand">
                    {r}
                  </Badge>
                ))}
              </div>
            </div>

            <DropdownItem icon={CircleUserIcon} onClick={close}>
              Mi perfil
            </DropdownItem>

            <DropdownItem icon={ShieldCheckIcon} onClick={close}>
              Mis permisos
            </DropdownItem>

            <DropdownItem icon={SettingsIcon} onClick={close}>
              Preferencias
            </DropdownItem>

            <div className="my-1 border-t border-brand-100" />

            <DropdownItem
              icon={LogOutIcon}
              tone="danger"
              onClick={async () => {
                close();

                const refreshToken = getRefreshToken();

                try {
                  if (refreshToken) {
                    await authApi.post<void>('/logout', {
                      refreshToken
                    });
                  }
                } catch (error) {
                  console.warn(
                    'No fue posible revocar la sesión en el servidor.',
                    error
                  );
                } finally {
                  clearStoredSession();

                  toast.success('Sesión cerrada', {
                    description: 'Se cerró la sesión de SIGI MONOLITHE.'
                  });

                  window.setTimeout(() => {
                    window.location.replace('/login');
                  }, 300);
                }
              }}
            >
              Cerrar sesión
            </DropdownItem>
          </div>
        )}
      </Dropdown>
    </header>
  );
}
