import {
  BuildingIcon,
  ClipboardListIcon,
  CreditCardIcon,
  LayoutDashboardIcon,
  MapIcon,
  MegaphoneIcon,
  PanelsTopLeftIcon,
  ScrollTextIcon,
  ShieldCheckIcon,
  UsersIcon,
  UserSquareIcon,
  WalletIcon } from
'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ModuleKey, Permission, RoleName } from '../types';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  module: ModuleKey;
  permission: Permission;
  allowedRoles?: readonly RoleName[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
{
  label: 'General',
  items: [
  {
    label: 'Dashboard',
    to: '/',
    icon: LayoutDashboardIcon,
    module: 'dashboard',
    permission: 'dashboard.view'
  }]

},
{
  label: 'Comercial',
  items: [
  {
    label: 'Proyectos y lotes',
    to: '/proyectos',
    icon: BuildingIcon,
    module: 'projects',
    permission: 'projects.view'
  },
  {
    label: 'Plano interactivo',
    to: '/plano',
    icon: MapIcon,
    module: 'lots',
    permission: 'lots.view'
  },
  {
    label: 'CRM y clientes',
    to: '/crm',
    icon: UserSquareIcon,
    module: 'crm',
    permission: 'crm.view'
  },
  {
    label: 'Separaciones y ventas',
    to: '/ventas',
    icon: ClipboardListIcon,
    module: 'sales',
    permission: 'sales.view'
  },
  {
    label: 'Marketing',
    to: '/marketing',
    icon: MegaphoneIcon,
    module: 'marketing',
    permission: 'marketing.view'
  },
  {
    label: 'Gestión de contenido web',
    to: '/contenido-web',
    icon: PanelsTopLeftIcon,
    module: 'web_content',
    permission: 'web_content.view'
  }]

},
{
  label: 'Finanzas',
  items: [
  {
    label: 'Financiamiento y pagos',
    to: '/financiamiento',
    icon: CreditCardIcon,
    module: 'financing',
    permission: 'financing.view'
  },
  {
    label: 'Finanzas',
    to: '/finanzas',
    icon: WalletIcon,
    module: 'finance',
    permission: 'finance.view'
  }]

},
{
  label: 'Personas',
  items: [
  {
    label: 'Asesores',
    to: '/asesores',
    icon: UsersIcon,
    module: 'advisors',
    permission: 'advisors.view'
  },
  {
    label: 'Trabajadores',
    to: '/trabajadores',
    icon: UserSquareIcon,
    module: 'hr',
    permission: 'hr.view'
  }]

},
{
  label: 'Administración',
  items: [
  {
    label: 'Usuarios y roles',
    to: '/usuarios',
    icon: ShieldCheckIcon,
    module: 'users',
    permission: 'users.view',
    allowedRoles: ['Administrador', 'Gerencia']
  },
  {
    label: 'Auditoría',
    to: '/auditoria',
    icon: ScrollTextIcon,
    module: 'audit',
    permission: 'audit.view'
  }]

}];


export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);
