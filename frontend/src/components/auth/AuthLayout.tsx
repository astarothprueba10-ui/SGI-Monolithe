import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon } from 'lucide-react';
import { Logo } from '../layout/Logo';
import { IMAGES } from '../../data/projects';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen w-full bg-white">
      {/* Visual */}
      <aside className="relative hidden w-[46%] shrink-0 overflow-hidden bg-night lg:block">
        <img
          src={IMAGES.authSide}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-45" />
        
        <div className="absolute inset-0 bg-night/55" aria-hidden="true" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Logo light />
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-gold-400">
              SGI MONOLITHE
            </p>
            <h2 className="mt-4 max-w-sm font-display text-[34px] leading-tight text-white">
              Tu propiedad y tus pagos, siempre a la mano.
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/65">
              Consulta el estado de tu lote, tus cuotas y tus documentos desde un solo lugar.
            </p>
          </div>
          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} MONOLITHE S.A.C. · Chiclayo, Perú
          </p>
        </div>
      </aside>

      {/* Form */}
      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-line px-6 py-5 lg:px-12">
          <div className="lg:hidden">
            <Logo />
          </div>
          <Link
            to="/"
            className="ml-auto inline-flex items-center gap-2 text-[13px] font-medium text-muted transition-colors duration-150 ease-out hover:text-night">
            
            <ArrowLeftIcon className="h-4 w-4" />
            Volver al sitio web
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-12 lg:px-12">
          <div className="w-full max-w-[420px]">
            <h1 className="font-display text-[32px] leading-tight text-night">{title}</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">{subtitle}</p>
            <div className="mt-8">{children}</div>
            {footer && <div className="mt-8 border-t border-line pt-6">{footer}</div>}
          </div>
        </div>
      </div>
    </div>);

}