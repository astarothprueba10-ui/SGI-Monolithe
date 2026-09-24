export type ModuleKey =
'dashboard' |
'projects' |
'lots' |
'crm' |
'marketing' |
'sales' |
'financing' |
'finance' |
'advisors' |
'hr' |
'users' |
'audit';

export type Action =
'view' |
'create' |
'edit' |
'delete' |
'approve' |
'reject' |
'export';

export type Permission = `${ModuleKey}.${Action}`;

export type RoleName = 'Administrador' | 'Asesor' | 'Finanzas' | 'Marketing' | 'RRHH';

export interface Role {
  name: RoleName;
  description: string;
  permissions: Permission[];
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  jobTitle: string;
  initials: string;
  primaryRole: RoleName;
  roles: RoleName[];
}

export type LotStatus = 'Disponible' | 'Separado' | 'Vendido';
export type PaymentStatus = 'Pagado' | 'Pendiente' | 'Vencido';
export type ReviewStatus = 'En revisión' | 'Aprobado' | 'Rechazado';
export type ActivityStatus = 'Activo' | 'Inactivo';
export type StatusToken = LotStatus | PaymentStatus | ReviewStatus | ActivityStatus;

export interface Project {
  id: string;
  name: string;
  district: string;
  stages: number;
  blocks: number;
  totalLots: number;
  available: number;
  reserved: number;
  sold: number;
  priceFrom: number;
  status: ActivityStatus;
}

export interface Lot {
  id: string;
  code: string;
  projectId: string;
  stage: string;
  block: string;
  type: 'Residencial' | 'Comercial' | 'Esquina' | 'Parque';
  area: number;
  pricePerM2: number;
  price: number;
  status: LotStatus;
  client?: string;
  advisor?: string;
  row: number;
  col: number;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  source: 'Facebook' | 'Instagram' | 'Referido' | 'Feria' | 'Web' | 'WhatsApp';
  interest: string;
  stage: 'Nuevo' | 'Contactado' | 'Visita' | 'Negociación' | 'Convertido' | 'Perdido';
  score: 'Alto' | 'Medio' | 'Bajo';
  advisor: string;
  createdAt: string;
  lastContact: string;
}

export interface Sale {
  id: string;
  code: string;
  type: 'Separación' | 'Venta';
  buyer: string;
  document: string;
  lot: string;
  project: string;
  modality: 'Contado' | 'Financiado' | 'Crédito bancario';
  amount: number;
  advisor: string;
  date: string;
  contract: 'Firmado' | 'Pendiente' | 'En revisión';
  status: ReviewStatus | 'Pagado';
}

export interface Installment {
  id: string;
  saleCode: string;
  buyer: string;
  number: string;
  dueDate: string;
  amount: number;
  paid: number;
  status: PaymentStatus;
}

export interface Voucher {
  id: string;
  code: string;
  buyer: string;
  saleCode: string;
  bank: string;
  amount: number;
  uploadedAt: string;
  status: ReviewStatus;
}

export interface Advisor {
  id: string;
  name: string;
  initials: string;
  type: 'Interno' | 'Externo';
  team: string;
  salesCount: number;
  salesAmount: number;
  commission: number;
  bonus: number;
  discount: number;
  absences: number;
  schedule: string;
  status: ActivityStatus;
}

export interface FinanceEntry {
  id: string;
  concept: string;
  type: 'Ingreso' | 'Egreso';
  category: string;
  project: string;
  date: string;
  amount: number;
  status: PaymentStatus;
}

export interface Receivable {
  id: string;
  buyer: string;
  saleCode: string;
  total: number;
  paid: number;
  overdueDays: number;
  status: PaymentStatus;
}

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  initials: string;
  roles: RoleName[];
  area: string;
  lastAccess: string;
  status: ActivityStatus;
}

export interface AuditEntry {
  id: string;
  user: string;
  role: RoleName;
  action: 'Ver' | 'Crear' | 'Editar' | 'Eliminar' | 'Aprobar' | 'Rechazar' | 'Exportar' | 'Inicio de sesión';
  module: string;
  record: string;
  datetime: string;
  result: 'Éxito' | 'Denegado' | 'Error';
  ip: string;
  device: string;
}

export interface Campaign {
  id: string;
  name: string;
  channel: 'Meta Ads' | 'Google Ads' | 'TikTok' | 'Feria' | 'Email';
  budget: number;
  leads: number;
  cpl: number;
  conversion: number;
  status: ActivityStatus;
}