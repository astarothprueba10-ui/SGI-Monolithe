import type { FinanceEntry } from '../types';

export const FINANCE_ENTRIES: FinanceEntry[] = [
{
  id: 'MV-401',
  concept: 'Cuota inicial VTA-2026-0412',
  type: 'Ingreso',
  category: 'Ventas',
  project: 'Vista Alegre',
  date: '26/08/2026',
  amount: 13680,
  status: 'Pagado'
},
{
  id: 'MV-400',
  concept: 'Venta al contado VTA-2026-0411',
  type: 'Ingreso',
  category: 'Ventas',
  project: 'Vista Alegre',
  date: '24/08/2026',
  amount: 184000,
  status: 'Pagado'
},
{
  id: 'MV-399',
  concept: 'Comisiones cierre agosto',
  type: 'Egreso',
  category: 'Comisiones',
  project: 'Transversal',
  date: '24/08/2026',
  amount: 68915,
  status: 'Pendiente'
},
{
  id: 'MV-398',
  concept: 'Habilitación urbana Etapa 2',
  type: 'Egreso',
  category: 'Obras',
  project: 'Las Palmeras',
  date: '22/08/2026',
  amount: 92400,
  status: 'Pagado'
},
{
  id: 'MV-397',
  concept: 'Pauta digital Meta Ads',
  type: 'Egreso',
  category: 'Marketing',
  project: 'Transversal',
  date: '20/08/2026',
  amount: 18000,
  status: 'Pagado'
},
{
  id: 'MV-396',
  concept: 'Cuotas cobradas semana 34',
  type: 'Ingreso',
  category: 'Cobranzas',
  project: 'Transversal',
  date: '18/08/2026',
  amount: 74210,
  status: 'Pagado'
},
{
  id: 'MV-395',
  concept: 'Alquiler oficina de ventas',
  type: 'Egreso',
  category: 'Administrativo',
  project: 'Mirador del Norte',
  date: '15/08/2026',
  amount: 12500,
  status: 'Pagado'
},
{
  id: 'MV-394',
  concept: 'Separaciones cobradas',
  type: 'Ingreso',
  category: 'Separaciones',
  project: 'Transversal',
  date: '14/08/2026',
  amount: 16500,
  status: 'Pagado'
}];


export const CASHFLOW = [
{ month: 'Mar', ingresos: 412000, egresos: 268000 },
{ month: 'Abr', ingresos: 486000, egresos: 291000 },
{ month: 'May', ingresos: 524000, egresos: 302000 },
{ month: 'Jun', ingresos: 468000, egresos: 318000 },
{ month: 'Jul', ingresos: 612000, egresos: 344000 },
{ month: 'Ago', ingresos: 688000, egresos: 371000 }];