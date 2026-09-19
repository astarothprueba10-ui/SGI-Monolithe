import type { Advisor } from '../types';

export const ADVISORS: Advisor[] = [
{
  id: 'AS-01',
  name: 'Camila Ordoñez',
  initials: 'CO',
  type: 'Interno',
  team: 'Lima Sur',
  salesCount: 9,
  salesAmount: 486000,
  commission: 14580,
  bonus: 2500,
  discount: 0,
  absences: 0,
  schedule: 'L–V 09:00–18:00',
  status: 'Activo'
},
{
  id: 'AS-02',
  name: 'Marco Ledesma',
  initials: 'ML',
  type: 'Interno',
  team: 'Lima Sur',
  salesCount: 7,
  salesAmount: 402500,
  commission: 12075,
  bonus: 1500,
  discount: 120,
  absences: 1,
  schedule: 'L–V 09:00–18:00',
  status: 'Activo'
},
{
  id: 'AS-03',
  name: 'Silvana Rojas',
  initials: 'SR',
  type: 'Interno',
  team: 'Corporativo',
  salesCount: 5,
  salesAmount: 612000,
  commission: 18360,
  bonus: 3200,
  discount: 0,
  absences: 0,
  schedule: 'L–S 08:30–17:30',
  status: 'Activo'
},
{
  id: 'AS-04',
  name: 'Teo Aguilar',
  initials: 'TA',
  type: 'Externo',
  team: 'Aliado Norte',
  salesCount: 4,
  salesAmount: 218000,
  commission: 8720,
  bonus: 0,
  discount: 0,
  absences: 2,
  schedule: 'Por comisión',
  status: 'Activo'
},
{
  id: 'AS-05',
  name: 'Paula Cruz',
  initials: 'PC',
  type: 'Externo',
  team: 'Aliado Norte',
  salesCount: 3,
  salesAmount: 156000,
  commission: 6240,
  bonus: 0,
  discount: 240,
  absences: 3,
  schedule: 'Por comisión',
  status: 'Inactivo'
},
{
  id: 'AS-06',
  name: 'Álvaro Nieto',
  initials: 'AN',
  type: 'Interno',
  team: 'Lima Este',
  salesCount: 6,
  salesAmount: 298000,
  commission: 8940,
  bonus: 900,
  discount: 0,
  absences: 1,
  schedule: 'L–V 10:00–19:00',
  status: 'Activo'
}];


export interface Worker {
  id: string;
  name: string;
  initials: string;
  area: string;
  position: string;
  contract: 'Planilla' | 'Recibo por honorarios' | 'Practicante';
  entryDate: string;
  schedule: string;
  justifiedAbsences: number;
  discounts: number;
  status: 'Activo' | 'Inactivo';
}

export const WORKERS: Worker[] = [
{
  id: 'TR-001',
  name: 'Rodrigo Salazar',
  initials: 'RS',
  area: 'Sistemas',
  position: 'Gerente de Sistemas',
  contract: 'Planilla',
  entryDate: '02/01/2022',
  schedule: 'L–V 09:00–18:00',
  justifiedAbsences: 1,
  discounts: 0,
  status: 'Activo'
},
{
  id: 'TR-014',
  name: 'Camila Ordoñez',
  initials: 'CO',
  area: 'Comercial',
  position: 'Asesora Comercial Senior',
  contract: 'Planilla',
  entryDate: '15/03/2023',
  schedule: 'L–V 09:00–18:00',
  justifiedAbsences: 0,
  discounts: 0,
  status: 'Activo'
},
{
  id: 'TR-007',
  name: 'Julio Bermúdez',
  initials: 'JB',
  area: 'Finanzas',
  position: 'Analista de Cobranzas',
  contract: 'Planilla',
  entryDate: '08/07/2022',
  schedule: 'L–V 08:30–17:30',
  justifiedAbsences: 2,
  discounts: 0,
  status: 'Activo'
},
{
  id: 'TR-021',
  name: 'Lucía Ferrand',
  initials: 'LF',
  area: 'Marketing',
  position: 'Coordinadora de Marketing',
  contract: 'Planilla',
  entryDate: '20/09/2024',
  schedule: 'L–V 09:00–18:00',
  justifiedAbsences: 1,
  discounts: 0,
  status: 'Activo'
},
{
  id: 'TR-033',
  name: 'Paula Cruz',
  initials: 'PC',
  area: 'Comercial',
  position: 'Asesora Externa',
  contract: 'Recibo por honorarios',
  entryDate: '11/02/2025',
  schedule: 'Por comisión',
  justifiedAbsences: 3,
  discounts: 240,
  status: 'Inactivo'
},
{
  id: 'TR-045',
  name: 'Renato Bazán',
  initials: 'RB',
  area: 'Operaciones',
  position: 'Practicante de Proyectos',
  contract: 'Practicante',
  entryDate: '03/06/2026',
  schedule: 'L–V 08:00–14:00',
  justifiedAbsences: 0,
  discounts: 0,
  status: 'Activo'
}];