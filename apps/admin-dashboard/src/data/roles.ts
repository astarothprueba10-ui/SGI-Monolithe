import type { Action, ModuleKey, Permission, Role, RoleName, SessionUser } from '../types';

const ALL_ACTIONS: Action[] = ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export'];

export const MODULE_LABELS: Record<ModuleKey, string> = {
  dashboard: 'Dashboard',
  projects: 'Proyectos y lotes',
  lots: 'Plano interactivo',
  crm: 'CRM y clientes',
  marketing: 'Marketing y campañas',
  sales: 'Separaciones y ventas',
  financing: 'Financiamiento y pagos',
  finance: 'Finanzas',
  advisors: 'Asesores y comisiones',
  hr: 'Trabajadores (RRHH)',
  users: 'Usuarios, roles y permisos',
  audit: 'Auditoría'
};

export const ACTION_LABELS: Record<Action, string> = {
  view: 'Ver',
  create: 'Crear',
  edit: 'Editar',
  delete: 'Eliminar',
  approve: 'Aprobar',
  reject: 'Rechazar',
  export: 'Exportar'
};

/** Acciones que tienen sentido por módulo (la matriz de permisos solo ofrece estas). */
export const MODULE_ACTIONS: Record<ModuleKey, Action[]> = {
  dashboard: ['view', 'export'],
  projects: ['view', 'create', 'edit', 'delete', 'export'],
  lots: ['view', 'edit', 'export'],
  crm: ['view', 'create', 'edit', 'delete', 'export'],
  marketing: ['view', 'create', 'edit', 'export'],
  sales: ['view', 'create', 'edit', 'approve', 'reject', 'export'],
  financing: ['view', 'create', 'edit', 'approve', 'reject', 'export'],
  finance: ['view', 'create', 'edit', 'export'],
  advisors: ['view', 'create', 'edit', 'approve', 'export'],
  hr: ['view', 'create', 'edit', 'approve', 'export'],
  users: ['view', 'create', 'edit', 'delete', 'export'],
  audit: ['view', 'export']
};

const perms = (module: ModuleKey, actions: Action[]): Permission[] =>
actions.map((a) => `${module}.${a}` as Permission);

const adminPermissions: Permission[] = (Object.keys(MODULE_ACTIONS) as ModuleKey[]).flatMap((m) =>
perms(m, MODULE_ACTIONS[m].filter((a) => ALL_ACTIONS.includes(a)))
);

export const ROLES: Record<RoleName, Role> = {
  Administrador: {
    name: 'Administrador',
    description: 'Acceso transversal a todos los módulos, configuración y auditoría.',
    permissions: adminPermissions
  },
  Asesor: {
    name: 'Asesor',
    description: 'Gestión comercial: plano, leads, separaciones y ventas. Sin configuración ni RRHH.',
    permissions: [
    ...perms('dashboard', ['view']),
    ...perms('projects', ['view']),
    ...perms('lots', ['view', 'edit']),
    ...perms('crm', ['view', 'create', 'edit', 'export']),
    ...perms('sales', ['view', 'create', 'edit'])]

  },
  Finanzas: {
    name: 'Finanzas',
    description: 'Cobranzas, cronogramas, validación de vouchers y reportes financieros.',
    permissions: [
    ...perms('dashboard', ['view', 'export']),
    ...perms('crm', ['view']),
    ...perms('sales', ['view']),
    ...perms('financing', ['view', 'create', 'edit', 'approve', 'reject', 'export']),
    ...perms('finance', ['view', 'create', 'edit', 'export'])]

  },
  Marketing: {
    name: 'Marketing',
    description: 'Captación: campañas, fuentes de leads y seguimiento comercial temprano.',
    permissions: [
    ...perms('dashboard', ['view']),
    ...perms('crm', ['view', 'create', 'edit', 'export']),
    ...perms('marketing', ['view', 'create', 'edit', 'export'])]

  },
  RRHH: {
    name: 'RRHH',
    description: 'Trabajadores, asesores, comisiones, horarios y descuentos.',
    permissions: [
    ...perms('dashboard', ['view']),
    ...perms('advisors', ['view', 'create', 'edit', 'approve', 'export']),
    ...perms('hr', ['view', 'create', 'edit', 'approve', 'export'])]

  }
};

export const DEMO_USERS: Record<RoleName, SessionUser> = {
  Administrador: {
    id: 'U-001',
    name: 'Rodrigo Salazar',
    email: 'rsalazar@monolithe.pe',
    jobTitle: 'Gerente de Sistemas',
    initials: 'RS',
    primaryRole: 'Administrador',
    roles: ['Administrador']
  },
  Asesor: {
    id: 'U-014',
    name: 'Camila Ordoñez',
    email: 'cordonez@monolithe.pe',
    jobTitle: 'Asesora Comercial Senior',
    initials: 'CO',
    primaryRole: 'Asesor',
    roles: ['Asesor']
  },
  Finanzas: {
    id: 'U-007',
    name: 'Julio Bermúdez',
    email: 'jbermudez@monolithe.pe',
    jobTitle: 'Analista de Cobranzas',
    initials: 'JB',
    primaryRole: 'Finanzas',
    roles: ['Finanzas']
  },
  Marketing: {
    id: 'U-021',
    name: 'Lucía Ferrand',
    email: 'lferrand@monolithe.pe',
    jobTitle: 'Coordinadora de Marketing',
    initials: 'LF',
    primaryRole: 'Marketing',
    roles: ['Marketing', 'Asesor']
  },
  RRHH: {
    id: 'U-030',
    name: 'Andrés Quiroz',
    email: 'aquiroz@monolithe.pe',
    jobTitle: 'Jefe de Gestión Humana',
    initials: 'AQ',
    primaryRole: 'RRHH',
    roles: ['RRHH']
  }
};