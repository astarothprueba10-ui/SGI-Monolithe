import React from 'react';
import { BuildingIcon, FileTextIcon, WalletIcon } from 'lucide-react';
import { Logo } from './Logo';

const highlights = [
{
  icon: BuildingIcon,
  title: 'Proyectos y lotes',
  text: 'Inventario, disponibilidad y estado comercial en un solo lugar.'
},
{
  icon: WalletIcon,
  title: 'Cobranzas y pagos',
  text: 'Cronogramas, cuotas y vouchers conciliados automáticamente.'
},
{
  icon: FileTextIcon,
  title: 'Expedientes digitales',
  text: 'Contratos y documentos disponibles para cada cliente comprador.'
}];


export function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-ink-900 lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-14">
      <img
        src="/2db381ad-ae13-4b50-a4a7-1bc8b45aee14.jpg"
        alt="Vista aérea de una urbanización con lotes habilitados al atardecer"
        className="absolute inset-0 h-full w-full object-cover" />
      
      <div
        className="absolute inset-0 bg-ink-900/80"
        aria-hidden="true" />
      

      <div className="relative">
        <Logo tone="light" />
      </div>

      <div className="relative max-w-[30rem]">
        <h2 className="text-[2rem] font-semibold leading-[1.15] tracking-tight text-white xl:text-[2.35rem]">
          La gestión inmobiliaria de MONOLITHE, centralizada.
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-white/65">
          Un solo sistema para el área comercial, administrativa y financiera, y
          un portal de autogestión para los clientes compradores.
        </p>

        <ul className="mt-10 space-y-6 border-t border-white/12 pt-8">
          {highlights.map(({ icon: Icon, title, text }) =>
          <li key={title} className="flex gap-4">
              <Icon
              className="mt-0.5 h-[18px] w-[18px] shrink-0 text-brass-400"
              aria-hidden="true" />
            
              <div>
                <p className="text-[14px] font-medium text-white">{title}</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-white/55">
                  {text}
                </p>
              </div>
            </li>
          )}
        </ul>
      </div>

      <p className="relative text-[12px] text-white/40">
        © 2026 Inmobiliaria Monolithe S.A.C. · Todos los derechos reservados
      </p>
    </aside>);

}