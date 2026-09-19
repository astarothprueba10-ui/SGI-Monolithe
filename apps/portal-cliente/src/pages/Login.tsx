import React from 'react';
import { HelpCircleIcon } from 'lucide-react';
import { BrandPanel } from '../components/BrandPanel';
import { LoginForm } from '../components/LoginForm';
import { Logo } from '../components/Logo';

export function Login() {
  return (
    <div className="grid min-h-screen w-full grid-cols-1 bg-slateux-50 lg:grid-cols-[minmax(0,1fr)_minmax(520px,44%)] xl:grid-cols-[minmax(0,1fr)_600px]">
      <BrandPanel />

      <main className="flex flex-col px-5 py-8 sm:px-10 lg:px-14 lg:py-10 xl:px-20">
        <header className="flex items-center justify-between gap-4">
          <div className="lg:hidden">
            <Logo size="sm" />
          </div>
          <a
            href="#ayuda"
            className="ml-auto inline-flex items-center gap-1.5 rounded text-[13px] font-medium text-slateux-500 outline-none transition-colors duration-150 ease-out hover:text-ink-700 focus-visible:ring-2 focus-visible:ring-ink-700/25">
            
            <HelpCircleIcon className="h-4 w-4" aria-hidden="true" />
            Ayuda
          </a>
        </header>

        <div className="flex flex-1 items-center justify-center py-10 sm:py-14">
          <section className="w-full max-w-[27rem]">
            <div className="rounded-card border border-slateux-200 bg-white p-6 shadow-card sm:p-8">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass-500">
                Acceso al sistema
              </span>
              <h1 className="mt-3 text-[1.75rem] font-semibold leading-tight tracking-tight text-ink-800">
                Iniciar sesión
              </h1>
              <p className="mt-2 text-[14px] leading-relaxed text-slateux-500">
                Ingresa con tus credenciales corporativas o de cliente
                comprador para continuar.
              </p>

              <LoginForm />
            </div>

            <p className="mt-6 text-center text-[12.5px] leading-relaxed text-slateux-400">
              Acceso restringido y monitoreado. El uso de este sistema implica
              la aceptación de las{' '}
              <a
                href="#politicas"
                className="rounded underline-offset-4 outline-none transition-colors duration-150 ease-out hover:text-ink-700 hover:underline focus-visible:ring-2 focus-visible:ring-ink-700/25">
                
                políticas internas
              </a>{' '}
              de Inmobiliaria Monolithe.
            </p>
          </section>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-slateux-400 lg:hidden">
          <span>© 2026 Inmobiliaria Monolithe S.A.C.</span>
          <span>v1.0</span>
        </footer>
      </main>
    </div>);

}