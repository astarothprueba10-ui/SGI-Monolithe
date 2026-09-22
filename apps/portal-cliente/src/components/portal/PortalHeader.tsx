import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BellIcon,
  ChevronDownIcon,
  FileTextIcon,
  LogOutIcon,
  MenuIcon,
  SettingsIcon,
  UserRoundIcon } from
'lucide-react';
import { alertas, cliente, lote } from '../../data/portal';
import { ConfirmDialog } from '../ui/ConfirmDialog';

const nivelDot: Record<string, string> = {
  critico: 'bg-danger-500',
  atencion: 'bg-warn-500',
  info: 'bg-ink-600'
};

type PortalHeaderProps = {
  onOpenMenu: () => void;
};

export function PortalHeader({ onOpenMenu }: PortalHeaderProps) {
  const [openPanel, setOpenPanel] = useState<'none' | 'notif' | 'perfil'>('none');
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpenPanel('none');
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    await new Promise((resolve) => setTimeout(resolve, 700));
    setLoggingOut(false);
    setConfirmLogout(false);
    navigate('/login');
  }

  const noLeidas = alertas.filter((a) => a.nivel !== 'info').length;

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slateux-200 bg-white/95 px-4 backdrop-blur sm:px-6">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Abrir navegación"
          className="flex h-9 w-9 items-center justify-center rounded-field border border-slateux-200 text-ink-700 outline-none transition-colors duration-150 ease-out hover:bg-slateux-50 focus-visible:ring-2 focus-visible:ring-ink-700/25 lg:hidden">
          
          <MenuIcon className="h-[18px] w-[18px]" aria-hidden="true" />
        </button>

        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold tracking-tight text-ink-800">
            Hola, {cliente.nombre}
          </p>
          <p className="hidden truncate text-[12.5px] text-slateux-500 sm:block">
            Cliente {cliente.codigo} · {lote.manzana} {lote.numero} ·{' '}
            {lote.etapa}
          </p>
        </div>

        <div ref={containerRef} className="ml-auto flex items-center gap-1.5">
          <div className="relative">
            <button
              type="button"
              onClick={() =>
              setOpenPanel((p) => p === 'notif' ? 'none' : 'notif')
              }
              aria-label="Notificaciones"
              aria-expanded={openPanel === 'notif'}
              className="relative flex h-9 w-9 items-center justify-center rounded-field text-slateux-500 outline-none transition-colors duration-150 ease-out hover:bg-slateux-100 hover:text-ink-700 focus-visible:ring-2 focus-visible:ring-ink-700/25">
              
              <BellIcon className="h-[19px] w-[19px]" aria-hidden="true" />
              {noLeidas > 0 ?
              <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] font-semibold text-white">
                  {noLeidas}
                </span> :
              null}
            </button>

            <AnimatePresence>
              {openPanel === 'notif' ?
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
                className="absolute right-0 top-11 w-[min(21rem,calc(100vw-2rem))] overflow-hidden rounded-card border border-slateux-200 bg-white shadow-card">
                
                  <div className="flex items-center justify-between border-b border-slateux-200 px-4 py-3">
                    <p className="text-[13.5px] font-semibold text-ink-800">
                      Notificaciones
                    </p>
                    <span className="text-[12px] text-slateux-400">
                      {alertas.length} recientes
                    </span>
                  </div>
                  <ul className="max-h-80 divide-y divide-slateux-200 overflow-y-auto">
                    {alertas.map((a) =>
                  <li key={a.id}>
                        <Link
                      to={a.ruta}
                      onClick={() => setOpenPanel('none')}
                      className="flex gap-3 px-4 py-3 outline-none transition-colors duration-150 ease-out hover:bg-slateux-50 focus-visible:bg-slateux-50">
                      
                          <span
                        className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                        nivelDot[a.nivel]}`
                        }
                        aria-hidden="true" />
                      
                          <span className="min-w-0">
                            <span className="block text-[13px] font-medium text-ink-800">
                              {a.titulo}
                            </span>
                            <span className="mt-0.5 block line-clamp-2 text-[12.5px] leading-relaxed text-slateux-500">
                              {a.detalle}
                            </span>
                          </span>
                        </Link>
                      </li>
                  )}
                  </ul>
                </motion.div> :
              null}
            </AnimatePresence>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() =>
              setOpenPanel((p) => p === 'perfil' ? 'none' : 'perfil')
              }
              aria-label="Menú de perfil"
              aria-expanded={openPanel === 'perfil'}
              className="flex items-center gap-2 rounded-field py-1 pl-1 pr-2 outline-none transition-colors duration-150 ease-out hover:bg-slateux-100 focus-visible:ring-2 focus-visible:ring-ink-700/25">
              
              <img
                src={cliente.avatar}
                alt=""
                className="h-8 w-8 rounded-full border border-slateux-200 object-cover" />
              
              <span className="hidden text-[13.5px] font-medium text-ink-700 sm:block">
                {cliente.nombreCompleto.split(' ')[0]}{' '}
                {cliente.nombreCompleto.split(' ')[1]}
              </span>
              <ChevronDownIcon
                className="h-4 w-4 text-slateux-400"
                aria-hidden="true" />
              
            </button>

            <AnimatePresence>
              {openPanel === 'perfil' ?
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
                className="absolute right-0 top-11 w-64 overflow-hidden rounded-card border border-slateux-200 bg-white shadow-card">
                
                  <div className="border-b border-slateux-200 px-4 py-3">
                    <p className="text-[13.5px] font-semibold text-ink-800">
                      {cliente.nombreCompleto}
                    </p>
                    <p className="mt-0.5 truncate text-[12.5px] text-slateux-500">
                      {cliente.correo}
                    </p>
                    <p className="mt-0.5 text-[12px] text-slateux-400">
                      {cliente.documento}
                    </p>
                  </div>
                  <div className="p-1.5">
                    <MenuItem
                    icon={<UserRoundIcon className="h-4 w-4" />}
                    label="Mi perfil"
                    to="/portal/perfil"
                    onNavigate={() => setOpenPanel('none')} />
                  
                    <MenuItem
                    icon={<FileTextIcon className="h-4 w-4" />}
                    label="Mis documentos"
                    to="/portal/documentos"
                    onNavigate={() => setOpenPanel('none')} />
                  
                    <MenuItem
                    icon={<SettingsIcon className="h-4 w-4" />}
                    label="Soporte y ayuda"
                    to="/portal/soporte"
                    onNavigate={() => setOpenPanel('none')} />
                  
                  </div>
                  <div className="border-t border-slateux-200 p-1.5">
                    <button
                    type="button"
                    onClick={() => {
                      setOpenPanel('none');
                      setConfirmLogout(true);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium text-danger-700 outline-none transition-colors duration-150 ease-out hover:bg-danger-50 focus-visible:ring-2 focus-visible:ring-danger-500/30">
                    
                      <LogOutIcon className="h-4 w-4" aria-hidden="true" />
                      Cerrar sesión
                    </button>
                  </div>
                </motion.div> :
              null}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <ConfirmDialog
        open={confirmLogout}
        title="¿Cerrar tu sesión?"
        description="Se cerrará tu acceso al portal en este dispositivo. Ninguna operación en curso se perderá."
        confirmLabel="Cerrar sesión"
        loading={loggingOut}
        onConfirm={handleLogout}
        onCancel={() => setConfirmLogout(false)} />
      
    </>);

}

function MenuItem({
  icon,
  label,
  to,
  onNavigate





}: {icon: React.ReactNode;label: string;to: string;onNavigate: () => void;}) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium text-ink-700 outline-none transition-colors duration-150 ease-out hover:bg-slateux-100 focus-visible:ring-2 focus-visible:ring-ink-700/25">
      
      <span className="text-slateux-400" aria-hidden="true">
        {icon}
      </span>
      {label}
    </Link>);

}