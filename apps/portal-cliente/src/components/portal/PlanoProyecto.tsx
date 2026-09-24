import React from 'react';
import { manzanaLotes } from '../../data/portal';

const fills: Record<string, string> = {
  cliente: '#0E1A2B',
  vendido: '#E2E6EC',
  separado: '#F3E7CC',
  disponible: '#FFFFFF'
};

const strokes: Record<string, string> = {
  cliente: '#0E1A2B',
  vendido: '#CBD2DC',
  separado: '#C9A24B',
  disponible: '#CBD2DC'
};

const leyenda = [
{ estado: 'cliente', label: 'Tu lote' },
{ estado: 'vendido', label: 'Vendido' },
{ estado: 'separado', label: 'Separado' },
{ estado: 'disponible', label: 'Disponible' }];


const COLS = 6;
const W = 92;
const H = 74;
const GAP = 8;
const OFFSET_X = 26;
const ROW_GAP = 46;

export function PlanoProyecto() {
  return (
    <div>
      <div className="overflow-x-auto rounded-field border border-slateux-200 bg-slateux-50 p-4">
        <svg
          viewBox="0 0 640 300"
          role="img"
          aria-label="Plano simplificado de la manzana D, etapa II, con el lote 14 del cliente destacado"
          className="h-auto w-full min-w-[520px]">
          
          <rect x="0" y="0" width="640" height="300" fill="#F7F8FA" />
          <rect x="0" y="118" width="640" height="30" fill="#E2E6EC" />
          <line
            x1="0"
            y1="133"
            x2="640"
            y2="133"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeDasharray="12 10" />
          
          <text x="8" y="112" fill="#98A3B2" fontSize="10" fontWeight="600">
            AV. LOS ALGARROBOS
          </text>

          <rect
            x="560"
            y="24"
            width="64"
            height="80"
            rx="6"
            fill="#F0F8F3"
            stroke="#CBE5D5" />
          
          <text x="566" y="68" fill="#2F8F5B" fontSize="9" fontWeight="600">
            PARQUE
          </text>

          {manzanaLotes.map((l, i) => {
            const row = Math.floor(i / COLS);
            const col = i % COLS;
            const x = OFFSET_X + col * (W + GAP);
            const y = row === 0 ? 24 : 24 + H + ROW_GAP;
            const isCliente = l.estado === 'cliente';
            return (
              <g key={l.numero}>
                <rect
                  x={x}
                  y={y}
                  width={W}
                  height={H}
                  rx="4"
                  fill={fills[l.estado]}
                  stroke={strokes[l.estado]}
                  strokeWidth={isCliente ? 2 : 1} />
                
                <text
                  x={x + W / 2}
                  y={y + H / 2 - 2}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight={isCliente ? 700 : 600}
                  fill={isCliente ? '#FFFFFF' : '#4A5565'}>
                  
                  {l.numero}
                </text>
                <text
                  x={x + W / 2}
                  y={y + H / 2 + 14}
                  textAnchor="middle"
                  fontSize="9"
                  fill={isCliente ? '#C9A24B' : '#98A3B2'}>
                  
                  {l.area} m²
                </text>
                {isCliente ?
                <>
                    <rect
                    x={x - 5}
                    y={y - 5}
                    width={W + 10}
                    height={H + 10}
                    rx="7"
                    fill="none"
                    stroke="#C9A24B"
                    strokeWidth="1.5"
                    strokeDasharray="5 4" />
                  
                    <text
                    x={x + W / 2}
                    y={y - 12}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="700"
                    fill="#8F6C25">
                    
                      TU LOTE
                    </text>
                  </> :
                null}
              </g>);

          })}

          <text x="8" y="20" fill="#98A3B2" fontSize="10" fontWeight="600">
            MZ. D — ETAPA II
          </text>
        </svg>
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
        {leyenda.map((l) =>
        <li
          key={l.estado}
          className="flex items-center gap-2 text-[12.5px] text-slateux-500">
          
            <span
            className="h-3 w-3 rounded-[3px] border"
            style={{
              backgroundColor: fills[l.estado],
              borderColor: strokes[l.estado]
            }}
            aria-hidden="true" />
          
            {l.label}
          </li>
        )}
      </ul>
    </div>);

}