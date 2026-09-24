import type { Campaign, Lead } from '../types';

export const LEADS: Lead[] = [
{
  id: 'LD-1042',
  name: 'Karina Espinoza',
  phone: '+51 987 442 118',
  email: 'k.espinoza@gmail.com',
  source: 'Facebook',
  interest: 'Vista Alegre · Mz. B',
  stage: 'Negociación',
  score: 'Alto',
  advisor: 'Camila Ordoñez',
  createdAt: '18/08/2026',
  lastContact: 'Hoy, 09:12'
},
{
  id: 'LD-1041',
  name: 'Diego Paredes',
  phone: '+51 962 771 340',
  email: 'dparedes@outlook.com',
  source: 'Instagram',
  interest: 'Las Palmeras · Mz. C',
  stage: 'Visita',
  score: 'Alto',
  advisor: 'Marco Ledesma',
  createdAt: '17/08/2026',
  lastContact: 'Ayer, 17:40'
},
{
  id: 'LD-1040',
  name: 'Sara Bustamante',
  phone: '+51 941 006 220',
  email: 'sarabusta@gmail.com',
  source: 'Feria',
  interest: 'Mirador del Norte',
  stage: 'Contactado',
  score: 'Medio',
  advisor: 'Silvana Rojas',
  createdAt: '16/08/2026',
  lastContact: '26/08/2026'
},
{
  id: 'LD-1039',
  name: 'Renzo Chávez',
  phone: '+51 933 880 512',
  email: 'renzo.ch@gmail.com',
  source: 'WhatsApp',
  interest: 'Vista Alegre · Mz. D',
  stage: 'Nuevo',
  score: 'Medio',
  advisor: 'Sin asignar',
  createdAt: '15/08/2026',
  lastContact: '—'
},
{
  id: 'LD-1038',
  name: 'Familia Quispe Ríos',
  phone: '+51 918 224 907',
  email: 'quispe.rios@gmail.com',
  source: 'Referido',
  interest: 'Las Palmeras · Mz. A',
  stage: 'Convertido',
  score: 'Alto',
  advisor: 'Teo Aguilar',
  createdAt: '11/08/2026',
  lastContact: '24/08/2026'
},
{
  id: 'LD-1037',
  name: 'Alonso Ferrer',
  phone: '+51 900 553 128',
  email: 'aferrer@empresa.pe',
  source: 'Web',
  interest: 'Comercial · Esquina',
  stage: 'Negociación',
  score: 'Alto',
  advisor: 'Camila Ordoñez',
  createdAt: '10/08/2026',
  lastContact: '25/08/2026'
},
{
  id: 'LD-1036',
  name: 'Nadia Loayza',
  phone: '+51 977 310 664',
  email: 'nloayza@gmail.com',
  source: 'Instagram',
  interest: 'Mirador del Norte',
  stage: 'Perdido',
  score: 'Bajo',
  advisor: 'Paula Cruz',
  createdAt: '05/08/2026',
  lastContact: '19/08/2026'
},
{
  id: 'LD-1035',
  name: 'Hugo Salcedo',
  phone: '+51 955 189 402',
  email: 'hsalcedo@gmail.com',
  source: 'Facebook',
  interest: 'Vista Alegre · Mz. A',
  stage: 'Visita',
  score: 'Medio',
  advisor: 'Marco Ledesma',
  createdAt: '04/08/2026',
  lastContact: '22/08/2026'
},
{
  id: 'LD-1034',
  name: 'Inversiones Perú Sur',
  phone: '+51 912 447 001',
  email: 'contacto@ipsur.pe',
  source: 'Referido',
  interest: '4 lotes comerciales',
  stage: 'Negociación',
  score: 'Alto',
  advisor: 'Silvana Rojas',
  createdAt: '02/08/2026',
  lastContact: '27/08/2026'
},
{
  id: 'LD-1033',
  name: 'Beatriz Núñez',
  phone: '+51 921 660 733',
  email: 'bnunez@gmail.com',
  source: 'Web',
  interest: 'Las Palmeras · Mz. E',
  stage: 'Contactado',
  score: 'Medio',
  advisor: 'Teo Aguilar',
  createdAt: '01/08/2026',
  lastContact: '20/08/2026'
}];


export const LEAD_SOURCES = [
{ source: 'Facebook', leads: 184, converted: 21 },
{ source: 'Instagram', leads: 142, converted: 15 },
{ source: 'Referido', leads: 96, converted: 28 },
{ source: 'Web', leads: 88, converted: 11 },
{ source: 'Feria', leads: 64, converted: 14 },
{ source: 'WhatsApp', leads: 52, converted: 7 }];


export const CAMPAIGNS: Campaign[] = [
{
  id: 'CMP-11',
  name: 'Vista Alegre Etapa 2 — Lanzamiento',
  channel: 'Meta Ads',
  budget: 18000,
  leads: 214,
  cpl: 84,
  conversion: 9.8,
  status: 'Activo'
},
{
  id: 'CMP-10',
  name: 'Lotes Norte — Búsqueda',
  channel: 'Google Ads',
  budget: 12500,
  leads: 138,
  cpl: 91,
  conversion: 7.2,
  status: 'Activo'
},
{
  id: 'CMP-09',
  name: 'Feria Inmobiliaria Lima Sur',
  channel: 'Feria',
  budget: 9000,
  leads: 64,
  cpl: 141,
  conversion: 21.9,
  status: 'Inactivo'
},
{
  id: 'CMP-08',
  name: 'Remarketing compradores',
  channel: 'Email',
  budget: 2400,
  leads: 41,
  cpl: 58,
  conversion: 12.2,
  status: 'Activo'
},
{
  id: 'CMP-07',
  name: 'TikTok — Jóvenes inversionistas',
  channel: 'TikTok',
  budget: 7600,
  leads: 96,
  cpl: 79,
  conversion: 4.1,
  status: 'Inactivo'
}];