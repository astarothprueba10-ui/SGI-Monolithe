import React, { useState } from 'react';
import { toast } from 'sonner';
import { PlusIcon, SaveIcon, ShieldCheckIcon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SearchInput } from '../components/ui/Field';
import { Table, TD, TH, TR } from '../components/ui/Table';
import { StatusBadge, Badge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import { Gate } from '../components/auth/PermissionRoute';
import { PermissionMatrix } from '../components/users/PermissionMatrix';
import { SYSTEM_USERS } from '../data/users';
import { ROLES } from '../data/roles';
import { cn } from '../utils/cn';
import type { RoleName } from '../types';

export function UsersAndRoles() {
  const [tab, setTab] = useState('usuarios');
  const [query, setQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<RoleName>('Asesor');

  const users = SYSTEM_USERS.filter((user) => {
    const q = query.trim().toLowerCase();
    return (
      q.length === 0 ||
      user.name.toLowerCase().includes(q) ||
      user.email.toLowerCase().includes(q) ||
      user.area.toLowerCase().includes(q));

  });

  const roleNames = Object.keys(ROLES) as RoleName[];

  return (
    <div>
      <PageHeader
        title="Usuarios, roles y permisos"
        description="Administra las cuentas de los trabajadores, asigna roles y define qué módulos y acciones puede usar cada rol."
        actions={
        <Gate permission="users.create">
            <Button icon={PlusIcon} variant="primary">
              {tab === 'usuarios' ? 'Nuevo usuario' : 'Nuevo rol'}
            </Button>
          </Gate>
        } />
      

      <Tabs
        className="mb-5"
        active={tab}
        onChange={setTab}
        items={[
        { id: 'usuarios', label: 'Usuarios', count: SYSTEM_USERS.length },
        { id: 'roles', label: 'Roles y permisos', count: roleNames.length }]
        } />
      

      {tab === 'usuarios' ?
      <Card>
          <div className="flex flex-wrap items-center gap-3 border-b border-brand-100 px-5 py-3.5">
            <SearchInput
            value={query}
            onValueChange={setQuery}
            placeholder="Buscar usuario, correo o área…"
            className="w-full sm:w-72" />
          
          </div>
          <Table
          head={
          <>
                <TH>Usuario</TH>
                <TH>Área</TH>
                <TH>Roles asignados</TH>
                <TH>Último acceso</TH>
                <TH>Estado</TH>
                <TH align="right">Acciones</TH>
              </>
          }>
          
            {users.map((user) =>
          <TR key={user.id}>
                <TD>
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-[11px] font-semibold text-brand-600">
                      {user.initials}
                    </span>
                    <span>
                      <span className="block font-medium text-brand-900">{user.name}</span>
                      <span className="block text-[11px] text-brand-300">{user.email}</span>
                    </span>
                  </div>
                </TD>
                <TD className="text-brand-500">{user.area}</TD>
                <TD>
                  <div className="flex flex-wrap gap-1">
                    {user.roles.map((role) =>
                <Badge key={role} tone="brand">
                        {role}
                      </Badge>
                )}
                  </div>
                </TD>
                <TD className="text-brand-500">{user.lastAccess}</TD>
                <TD>
                  <StatusBadge status={user.status} />
                </TD>
                <TD align="right">
                  <div className="flex justify-end gap-1.5">
                    <Gate permission="users.edit">
                      <Button
                    size="sm"
                    icon={ShieldCheckIcon}
                    onClick={() => {
                      setSelectedRole(user.roles[0]);
                      setTab('roles');
                    }}>
                    
                        Roles
                      </Button>
                    </Gate>
                    <Gate permission="users.edit">
                      <Button
                    size="sm"
                    variant={user.status === 'Activo' ? 'danger' : 'secondary'}
                    onClick={() =>
                    toast.success(
                      user.status === 'Activo' ? 'Usuario desactivado' : 'Usuario activado',
                      { description: `${user.name} · ${user.email}` }
                    )
                    }>
                    
                        {user.status === 'Activo' ? 'Desactivar' : 'Activar'}
                      </Button>
                    </Gate>
                  </div>
                </TD>
              </TR>
          )}
          </Table>
        </Card> :

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
          <Card className="h-fit">
            <CardHeader title="Roles" description="Selecciona un rol para editar sus permisos" />
            <ul className="p-2">
              {roleNames.map((role) => {
              const isActive = role === selectedRole;
              return (
                <li key={role}>
                    <button
                    type="button"
                    onClick={() => setSelectedRole(role)}
                    aria-pressed={isActive}
                    className={cn(
                      'w-full rounded-md px-3 py-2.5 text-left transition-colors duration-150 ease-smooth',
                      isActive ? 'bg-brand-900 text-white' : 'hover:bg-brand-50'
                    )}>
                    
                      <span
                      className={cn(
                        'block text-[13px] font-medium',
                        isActive ? 'text-white' : 'text-brand-800'
                      )}>
                      
                        {role}
                      </span>
                      <span
                      className={cn(
                        'mt-0.5 block text-[11px] tabular',
                        isActive ? 'text-brand-200' : 'text-brand-400'
                      )}>
                      
                        {ROLES[role].permissions.length} permisos ·{' '}
                        {SYSTEM_USERS.filter((u) => u.roles.includes(role)).length} usuarios
                      </span>
                    </button>
                  </li>);

            })}
            </ul>
          </Card>

          <Card>
            <CardHeader
            title={`Permisos del rol ${selectedRole}`}
            description={ROLES[selectedRole].description}
            actions={
            <Gate
              permission="users.edit"
              fallback={<Badge tone="neutral">Solo lectura</Badge>}>
              
                  <Button
                variant="primary"
                icon={SaveIcon}
                onClick={() =>
                toast.success('Permisos actualizados', {
                  description: `La matriz del rol ${selectedRole} fue guardada y auditada.`
                })
                }>
                
                    Guardar cambios
                  </Button>
                </Gate>
            } />
          
            <PermissionMatrix role={selectedRole} />
          </Card>
        </div>
      }
    </div>);

}