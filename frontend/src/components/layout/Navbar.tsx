import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { MenuIcon, PhoneIcon, UserRoundIcon, XIcon } from 'lucide-react';
import { Logo } from './Logo';
import { LinkButton } from '../ui/Button';
import { contactInfo, navLinks } from '../../data/site';
import { cn } from '../../utils/cn';

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-50">
      <div className="hidden bg-night-900 text-white/70 lg:block">
        <div className="shell flex h-9 items-center justify-between text-[12px]">
          <p className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" aria-hidden="true" />
            Preventa activa · Condominio Campestre Los Cocos, Picsi
          </p>
          <a
            href={`tel:${contactInfo.phone.replace(/\s/g, '')}`}
            className="flex items-center gap-2 transition-colors duration-150 ease-out hover:text-gold-400">
            
            <PhoneIcon className="h-3.5 w-3.5" />
            {contactInfo.phone}
          </a>
        </div>
      </div>

      <nav
        aria-label="Navegación principal"
        className={cn(
          'border-b bg-white/95 backdrop-blur transition-shadow duration-200 ease-out',
          scrolled ? 'border-line shadow-card' : 'border-transparent'
        )}>
        
        <div className="shell flex h-[70px] items-center justify-between gap-6">
          <Logo />

          <ul className="hidden items-center gap-1 lg:flex">
            {navLinks.map((link) =>
            <li key={link.to}>
                <NavLink
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                cn(
                  'relative rounded-md px-3 py-2 text-[14px] font-medium transition-colors duration-150 ease-out',
                  isActive ? 'text-night' : 'text-muted hover:text-night'
                )
                }>
                
                  {({ isActive }) =>
                <>
                      {link.label}
                      {isActive &&
                  <span className="absolute inset-x-3 -bottom-0.5 h-[2px] rounded-full bg-gold" />
                  }
                    </>
                }
                </NavLink>
              </li>
            )}
          </ul>

          <div className="hidden items-center gap-3 lg:flex">
            <LinkButton to="/contacto" variant="secondary" size="sm">
              Habla con nosotros
            </LinkButton>
            <LinkButton to="/mi-cuenta" variant="primary" size="sm">
              <UserRoundIcon className="h-4 w-4" />
              Mi cuenta
            </LinkButton>
          </div>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-line text-night transition-colors duration-150 ease-out hover:bg-bone lg:hidden">
            
            <MenuIcon className="h-5 w-5" />
          </button>
        </div>
      </nav>

      {open &&
      <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-night/50" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute inset-y-0 right-0 flex w-[88%] max-w-sm flex-col bg-white shadow-lift">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <Logo />
              <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar menú"
              className="rounded-lg p-2 text-muted transition-colors duration-150 ease-out hover:bg-bone hover:text-night">
              
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <ul className="flex-1 overflow-y-auto px-3 py-4">
              {navLinks.map((link) =>
            <li key={link.to}>
                  <NavLink
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                cn(
                  'block rounded-lg px-4 py-3 text-[15px] font-medium transition-colors duration-150 ease-out',
                  isActive ? 'bg-bone text-night' : 'text-muted hover:bg-bone hover:text-night'
                )
                }>
                
                    {link.label}
                  </NavLink>
                </li>
            )}
            </ul>
            <div className="space-y-3 border-t border-line p-5">
              <LinkButton to="/mi-cuenta" className="w-full" size="md">
                <UserRoundIcon className="h-4 w-4" />
                Mi cuenta
              </LinkButton>
              <LinkButton to="/contacto" variant="secondary" className="w-full" size="md">
                Habla con nosotros
              </LinkButton>
              <Link
              to="/contacto"
              className="block text-center text-[13px] text-muted underline-offset-2 hover:underline">
              
                {contactInfo.phone}
              </Link>
            </div>
          </div>
        </div>
      }
    </header>);

}