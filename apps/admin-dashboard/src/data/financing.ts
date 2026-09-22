import type { Installment, Receivable, Voucher } from '../types';

export interface FinancingPlan {
  id: string;
  name: string;
  downPayment: number;
  months: number;
  rate: number;
  activeContracts: number;
  status: 'Activo' | 'Inactivo';
}

export const FINANCING_PLANS: FinancingPlan[] = [
{
  id: 'PL-01',
  name: 'Plan Directo 12 meses',
  downPayment: 20,
  months: 12,
  rate: 0,
  activeContracts: 48,
  status: 'Activo'
},
{
  id: 'PL-02',
  name: 'Plan Directo 24 meses',
  downPayment: 25,
  months: 24,
  rate: 8.5,
  activeContracts: 96,
  status: 'Activo'
},
{
  id: 'PL-03',
  name: 'Plan Directo 36 meses',
  downPayment: 30,
  months: 36,
  rate: 12,
  activeContracts: 34,
  status: 'Activo'
},
{
  id: 'PL-04',
  name: 'Crédito bancario Mivivienda',
  downPayment: 10,
  months: 60,
  rate: 9.4,
  activeContracts: 12,
  status: 'Inactivo'
}];


export const INSTALLMENTS: Installment[] = [
{
  id: 'CU-9001',
  saleCode: 'VTA-2026-0412',
  buyer: 'María Cárdenas',
  number: '03 / 24',
  dueDate: '05/09/2026',
  amount: 2280,
  paid: 0,
  status: 'Pendiente'
},
{
  id: 'CU-9002',
  saleCode: 'VTA-2026-0410',
  buyer: 'Elena Villar',
  number: '07 / 12',
  dueDate: '28/08/2026',
  amount: 3650,
  paid: 3650,
  status: 'Pagado'
},
{
  id: 'CU-9003',
  saleCode: 'VTA-2026-0402',
  buyer: 'Rosa Ttito',
  number: '11 / 24',
  dueDate: '10/08/2026',
  amount: 1980,
  paid: 0,
  status: 'Vencido'
},
{
  id: 'CU-9004',
  saleCode: 'VTA-2026-0398',
  buyer: 'Luis Bejarano',
  number: '18 / 36',
  dueDate: '02/08/2026',
  amount: 1420,
  paid: 700,
  status: 'Vencido'
},
{
  id: 'CU-9005',
  saleCode: 'VTA-2026-0409',
  buyer: 'Iván Mendoza',
  number: '02 / 24',
  dueDate: '12/09/2026',
  amount: 2740,
  paid: 0,
  status: 'Pendiente'
},
{
  id: 'CU-9006',
  saleCode: 'VTA-2026-0411',
  buyer: 'Constructora Andes SAC',
  number: '01 / 01',
  dueDate: '24/08/2026',
  amount: 184000,
  paid: 184000,
  status: 'Pagado'
},
{
  id: 'CU-9007',
  saleCode: 'VTA-2026-0405',
  buyer: 'Familia Osorio',
  number: '09 / 24',
  dueDate: '30/08/2026',
  amount: 2110,
  paid: 0,
  status: 'Pendiente'
},
{
  id: 'CU-9008',
  saleCode: 'VTA-2026-0391',
  buyer: 'Jorge Ruiz Palma',
  number: '22 / 24',
  dueDate: '15/07/2026',
  amount: 2410,
  paid: 0,
  status: 'Vencido'
}];


export const VOUCHERS: Voucher[] = [
{
  id: 'VC-5501',
  code: 'VCH-0091',
  buyer: 'María Cárdenas',
  saleCode: 'VTA-2026-0412',
  bank: 'BCP',
  amount: 2280,
  uploadedAt: 'Hoy, 08:41',
  status: 'En revisión'
},
{
  id: 'VC-5502',
  code: 'VCH-0090',
  buyer: 'Diego Paredes',
  saleCode: 'SEP-2026-0388',
  bank: 'Interbank',
  amount: 3000,
  uploadedAt: 'Hoy, 07:55',
  status: 'En revisión'
},
{
  id: 'VC-5503',
  code: 'VCH-0089',
  buyer: 'Elena Villar',
  saleCode: 'VTA-2026-0410',
  bank: 'BBVA',
  amount: 3650,
  uploadedAt: 'Ayer, 18:20',
  status: 'Aprobado'
},
{
  id: 'VC-5504',
  code: 'VCH-0088',
  buyer: 'Rosa Ttito',
  saleCode: 'SEP-2026-0385',
  bank: 'Scotiabank',
  amount: 2000,
  uploadedAt: 'Ayer, 16:02',
  status: 'Rechazado'
},
{
  id: 'VC-5505',
  code: 'VCH-0087',
  buyer: 'Iván Mendoza',
  saleCode: 'VTA-2026-0409',
  bank: 'BCP',
  amount: 2740,
  uploadedAt: '26/08/2026',
  status: 'En revisión'
},
{
  id: 'VC-5506',
  code: 'VCH-0086',
  buyer: 'Familia Osorio',
  saleCode: 'VTA-2026-0405',
  bank: 'Interbank',
  amount: 2110,
  uploadedAt: '26/08/2026',
  status: 'En revisión'
}];


export const RECEIVABLES: Receivable[] = [
{
  id: 'CxC-01',
  buyer: 'Rosa Ttito',
  saleCode: 'VTA-2026-0402',
  total: 47520,
  paid: 19800,
  overdueDays: 18,
  status: 'Vencido'
},
{
  id: 'CxC-02',
  buyer: 'Luis Bejarano',
  saleCode: 'VTA-2026-0398',
  total: 51120,
  paid: 25560,
  overdueDays: 26,
  status: 'Vencido'
},
{
  id: 'CxC-03',
  buyer: 'Jorge Ruiz Palma',
  saleCode: 'VTA-2026-0391',
  total: 57840,
  paid: 53020,
  overdueDays: 44,
  status: 'Vencido'
},
{
  id: 'CxC-04',
  buyer: 'María Cárdenas',
  saleCode: 'VTA-2026-0412',
  total: 68400,
  paid: 13680,
  overdueDays: 0,
  status: 'Pendiente'
},
{
  id: 'CxC-05',
  buyer: 'Familia Osorio',
  saleCode: 'VTA-2026-0405',
  total: 50640,
  paid: 18990,
  overdueDays: 0,
  status: 'Pendiente'
}];