import React from 'react';
import { Link } from 'react-router-dom';
import {
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon } from
'lucide-react';
import { Logo } from './Logo';
import { contactInfo } from '../../data/site';

const columns = [
{
  title: 'Empresa',
  links: [
  { label: 'Nosotros', to: '/nosotros' },
  { label: 'Proyectos', to: '/proyectos' }]

},
{
  title: 'Servicios',
  links: [
  { label: 'Beneficios', to: '/beneficios' },
  { label: 'Financiamiento', to: '/proyectos/condominio-campestre-los-cocos#financiamiento' }]

},
{
  title: 'Atención',
  links: [
  { label: 'Contacto', to: '/contacto' },
  { label: 'WhatsApp', to: '/contacto' },
  { label: 'Mi cuenta', to: '/mi-cuenta' }]

},
{
  title: 'Legal',
  links: [
  { label: 'Política de privacidad', to: '/contacto' },
  { label: 'Términos y condiciones', to: '/contacto' }]

}];


const socials = [
{ label: 'Facebook', icon: FacebookIcon },
{ label: 'Instagram', icon: InstagramIcon },
{ label: 'LinkedIn', icon: LinkedinIcon }];


export function Footer() {
  return (
    <footer className="bg-night text-white">
      <div className="shell grid gap-12 py-16 lg:grid-cols-[1.4fr_2.6fr]">
        <div>
          <Logo light />
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/60">
            Desarrollamos condominios campestres y lotes urbanos en Lambayeque, con documentación
            saneada y financiamiento directo.
          </p>
          <div className="mt-6 flex gap-3">
            {socials.map((s) =>
            <a
              key={s.label}
              href="#"
              aria-label={s.label}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 text-white/70 transition-colors duration-150 ease-out hover:border-gold hover:text-gold">
              
                <s.icon className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>

        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {columns.map((col) =>
          <div key={col.title}>
              <h3 className="text-[12px] font-semibold uppercase tracking-[0.16em] text-gold-400">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) =>
              <li key={link.label}>
                    <Link
                  to={link.to}
                  className="text-sm text-white/70 transition-colors duration-150 ease-out hover:text-white">
                  
                      {link.label}
                    </Link>
                  </li>
              )}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="shell flex flex-col gap-4 py-6 text-sm text-white/60 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
            <a href={`tel:${contactInfo.phone.replace(/\s/g, '')}`} className="flex items-center gap-2 hover:text-white">
              <PhoneIcon className="h-4 w-4 text-gold" />
              {contactInfo.phone}
            </a>
            <a href={`mailto:${contactInfo.email}`} className="flex items-center gap-2 hover:text-white">
              <MailIcon className="h-4 w-4 text-gold" />
              {contactInfo.email}
            </a>
            <span className="flex items-center gap-2">
              <MapPinIcon className="h-4 w-4 text-gold" />
              {contactInfo.address}
            </span>
          </div>
          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} MONOLITHE S.A.C. · Todos los derechos reservados
          </p>
        </div>
      </div>
    </footer>);

}