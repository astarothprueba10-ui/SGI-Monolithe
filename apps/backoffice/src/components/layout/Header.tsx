import React, { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BellIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CircleUserIcon,
  LogOutIcon,
  SearchIcon,
  SettingsIcon,
  ShieldCheckIcon } from
'lucide-react';
import { toast } from 'sonner';
import { ALL_NAV_ITEMS } from '../../data/navigation';
import { NOTIFICATIONS } from '../../data/notifications';
import { useAuth } from '../../contexts/AuthContext';
import { Dropdown, DropdownItem, DropdownLabel } from '../ui/Dropdown';
import { Badge } from '../ui/Badge';
import { cn } from '../../utils/cn';

export function Header() {
  const { user, can, hasModule } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const current = ALL_NAV_ITEMS.find(
    (item) => item.to === location.pathname || item.to !== '/' && location.pathname.startsWith(item.to)
  );

  const notifications = useMemo(
    () => NOTIFICATIONS.filter((n) => hasModule(n.module)),
    [hasModule]
  );

  const results = useMemo(() => {
    if (query.trim().length < 2) return [];
    const q = query.toLowerCase();
    return ALL_NAV_ITEMS.filter(
      (item) => can(item.permission) && item.label.toLowerCase().includes(q)
    ).slice(0, 5);
  }, [query, can]);

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b border-brand-100 bg-white/95 px-5 backdrop-blur">
      {/* Breadcrumb */}
      <nav aria-label="Ruta de navegación" className="hidden min-w-0 items-center gap-1.5 md:flex">
        <Link
          to="/"
          className="text-[13px] text-brand-400 transition-colors duration-150 ease-smooth hover:text-brand-700">
          
          SIGI
        </Link>
        <ChevronRightIcon className="h-3.5 w-3.5 text-brand-300" aria-hidden="true" />
        <span className="truncate text-[13px] font-medium text-brand-800">
          {current?.label ?? 'Acceso no autorizado'}
        </span>
      </nav>

      {/* Buscador global */}
      <div className="relative ml-auto w-full max-w-sm">
        <SearchIcon
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-300"
          aria-hidden="true" />
        
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar lote, cliente, venta o módulo…"
          aria-label="Buscador global"
          className="h-9 w-full rounded-md border border-brand-200 bg-brand-50/60 pl-9 pr-16 text-[13px] text-brand-800 placeholder:text-brand-300 transition-colors duration-150 ease-smooth focus:border-brand-400 focus:bg-white" />
        
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-brand-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-brand-400">
          ⌘K
        </kbd>
        {results.length > 0 ?
        <div className="absolute left-0 right-0 top-11 z-40 overflow-hidden rounded-lg border border-brand-100 bg-white py-1 shadow-pop">
            <DropdownLabel>Módulos autorizados</DropdownLabel>
            {results.map((r) =>
          <button
            key={r.to}
            type="button"
            onClick={() => {
              navigate(r.to);
              setQuery('');
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-brand-700 transition-colors duration-150 ease-smooth hover:bg-brand-50">
            
                <r.icon className="h-4 w-4 text-brand-400" />
                {r.label}
              </button>
          )}
          </div> :
        null}
      </div>

      {/* Notificaciones */}
      <Dropdown
        width="w-80"
        trigger={({ toggle, open }) =>
        <button
          type="button"
          onClick={toggle}
          aria-label="Notificaciones"
          className={cn(
            'relative inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors duration-150 ease-smooth',
            open ?
            'border-brand-300 bg-brand-50 text-brand-800' :
            'border-brand-200 text-brand-500 hover:bg-brand-50'
          )}>
          
            <BellIcon className="h-[18px] w-[18px]" />
            {notifications.length > 0 ?
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" /> :
          null}
          </button>
        }>
        
        {({ close }) =>
        <div>
            <div className="flex items-center justify-between px-3 py-2">
              <p className="text-[13px] font-semibold text-brand-900">Notificaciones</p>
              <Badge tone="brand">{notifications.length}</Badge>
            </div>
            <div className="max-h-80 overflow-y-auto border-t border-brand-100">
              {notifications.length === 0 ?
            <p className="px-3 py-6 text-center text-[13px] text-brand-400">
                  Sin notificaciones para tu rol.
                </p> :

            notifications.map((n) =>
            <button
              key={n.id}
              type="button"
              onClick={() => {
                navigate(n.to);
                close();
              }}
              className="flex w-full gap-2.5 border-b border-brand-50 px-3 py-2.5 text-left transition-colors duration-150 ease-smooth last:border-0 hover:bg-brand-50">
              
                    <span
                className={cn(
                  'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full',
                  n.tone === 'danger' ?
                  'bg-rose-500' :
                  n.tone === 'warning' ?
                  'bg-amber-500' :
                  'bg-sky-500'
                )} />
              
                    <span className="min-w-0">
                      <span className="block text-[13px] font-medium text-brand-800">
                        {n.title}
                      </span>
                      <span className="block text-[12px] text-brand-400">{n.description}</span>
                      <span className="mt-0.5 block text-[11px] text-brand-300">{n.time}</span>
                    </span>
                  </button>
            )
            }
            </div>
          </div>
        }
      </Dropdown>

      {/* Perfil */}
      <Dropdown
        trigger={({ toggle }) =>
        <button
          type="button"
          onClick={toggle}
          className="flex items-center gap-2.5 rounded-md border border-transparent py-1 pl-1 pr-1.5 transition-colors duration-150 ease-smooth hover:bg-brand-50">
          
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
            <ChevronDownIcon className="h-4 w-4 text-brand-400" aria-hidden="true" />
          </button>
        }>
        
        {({ close }) =>
        <div>
            <div className="border-b border-brand-100 px-3 py-2.5">
              <p className="text-[13px] font-semibold text-brand-900">{user.name}</p>
              <p className="text-[12px] text-brand-400">{user.email}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {user.roles.map((r) =>
              <Badge key={r} tone="brand">
                    {r}
                  </Badge>
              )}
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
            onClick={() => {
              close();
              toast.success('Sesión cerrada', {
                description: 'Se cerró la sesión de SIGI MONOLITHE.'
              });
            }}>
            
              Cerrar sesión
            </DropdownItem>
          </div>
        }
      </Dropdown>
    </header>);

}