import React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRightIcon, BuildingIcon, ClockIcon, LogOutIcon, UserRoundIcon } from 'lucide-react';
import { Logo } from '../../components/layout/Logo';
import { Badge } from '../../components/ui/Primitives';
import { LinkButton, Button } from '../../components/ui/Button';
import { IMAGES } from '../../data/projects';

export function Welcome() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const isAdmin = params.get('rol') === 'admin';
  const username = params.get('usuario') ?? 'usuario';
  const displayName = isAdmin ? 'Lucía Vásquez' : 'Carlos Mendoza';
  const role = isAdmin ? 'Marketing · Administrador' : 'Cliente · Lote B-14 Los Cocos';

  return (
    <div className="relative isolate flex min-h-screen w-full flex-col bg-night">
      <img
        src={IMAGES.authSide}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover opacity-20" />
      
      <div className="absolute inset-0 bg-night/80" aria-hidden="true" />

      <header className="relative flex items-center justify-between px-6 py-6 lg:px-12">
        <Logo light />
        <Button
          variant="secondary"
          size="sm"
          className="border-white/25 bg-transparent text-white hover:border-white hover:bg-white hover:text-night"
          onClick={() => navigate('/mi-cuenta')}>
          
          <LogOutIcon className="h-4 w-4" />
          Cerrar sesión
        </Button>
      </header>

      <main className="relative flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl rounded-2xl border border-white/12 bg-white/[0.05] p-8 backdrop-blur sm:p-12">
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-gold-400">
            SGI MONOLITHE
          </p>
          <h1 className="mt-4 font-display text-4xl leading-tight text-white sm:text-[44px]">
            Bienvenido a MONOLITHE
          </h1>

          <div className="mt-8 flex flex-wrap items-center gap-4 rounded-xl border border-white/12 bg-night/50 p-5">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/15 text-gold">
              <UserRoundIcon className="h-6 w-6" strokeWidth={1.5} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[17px] font-semibold text-white">{displayName}</p>
              <p className="mt-0.5 truncate text-sm text-white/60">
                {role} · @{username}
              </p>
            </div>
            <Badge tone={isAdmin ? 'gold' : 'green'}>{isAdmin ? 'Acceso interno' : 'Cliente'}</Badge>
          </div>

          <div className="mt-8">
            {isAdmin ?
            <div className="space-y-4">
                <p className="text-sm leading-relaxed text-white/70">
                  Tu perfil tiene acceso al sistema administrativo. Ingresa al módulo de contenidos
                  para gestionar la web pública de MONOLITHE.
                </p>
                <LinkButton to="/cms" size="lg" className="w-full sm:w-auto">
                  Ir al Sistema administrativo SGI
                  <ArrowRightIcon className="h-4 w-4" />
                </LinkButton>
                <p className="flex items-center gap-2 text-[13px] text-white/45">
                  <ClockIcon className="h-4 w-4" />
                  Otros módulos del ERP (ventas, cobranzas, postventa) estarán disponibles
                  próximamente.
                </p>
              </div> :

            <div className="space-y-4">
                <p className="text-sm leading-relaxed text-white/70">
                  Tu perfil accederá al Portal del Cliente, donde podrás revisar tu lote, tu
                  cronograma de pagos y tus documentos.
                </p>
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-white/20 px-5 py-4">
                  <BuildingIcon className="h-5 w-5 text-gold" strokeWidth={1.5} />
                  <div>
                    <p className="text-sm font-semibold text-white">Portal del Cliente</p>
                    <p className="text-[13px] text-white/55">En habilitación · disponible pronto</p>
                  </div>
                </div>
              </div>
            }
          </div>

          <Link
            to="/"
            className="mt-10 inline-block text-sm text-white/50 transition-colors duration-150 ease-out hover:text-gold-400">
            
            Volver al sitio web
          </Link>
        </div>
      </main>
    </div>);

}