import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { FilterIcon, PencilIcon, PlusIcon, ShieldCheckIcon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SearchInput } from '../components/ui/Field';
import { Dropdown, DropdownItem } from '../components/ui/Dropdown';
import { Table, TD, TH, TR } from '../components/ui/Table';
import { StatusBadge, Badge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import { Gate } from '../components/auth/PermissionRoute';
import { PermissionMatrix } from '../components/users/PermissionMatrix';
import { CreateUserModal } from '../components/users/CreateUserModal';
import { ManageUserRolesModal } from '../components/users/ManageUserRolesModal';
import { CreateRoleModal } from '../components/users/CreateRoleModal';
import { cn } from '../utils/cn';
import type { RoleName } from '../types';
import { getStoredAuthUser } from '../lib/authSession';
import {
  securityApi,
  type SecurityUser,
  type SecurityRole
} from '../services/securityApi';

export type UserStatusFilter = 'TODOS' | 'ACTIVO' | 'INACTIVO';

function filterUser(
  user: SecurityUser,
  status: UserStatusFilter,
  q: string
): boolean {
  const matchesStatus =
    status === 'TODOS' ||
    (status === 'ACTIVO' && user.estado === 'ACTIVO') ||
    (status === 'INACTIVO' && user.estado !== 'ACTIVO');

  if (!matchesStatus) return false;
  if (q.length === 0) return true;

  return (
    user.nombreCompleto.toLowerCase().includes(q) ||
    user.usuarioLogin.toLowerCase().includes(q) ||
    (user.correo ?? '').toLowerCase().includes(q)
  );
}

export function UsersAndRoles() {
  const [tab, setTab] = useState('usuarios');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<UserStatusFilter>('ACTIVO');
  const [selectedRole, setSelectedRole] = useState<RoleName>('Asesor');
  const [createUserModalOpen, setCreateUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SecurityUser | null>(null);

  const [securityUsers, setSecurityUsers] = useState<SecurityUser[]>([]);
  const [securityRoles, setSecurityRoles] = useState<SecurityRole[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);
  const currentUserId = getStoredAuthUser()?.idUsuario ?? null;
  const [rolesUser, setRolesUser] = useState<SecurityUser | null>(null);
  const [rolesModalOpen, setRolesModalOpen] = useState(false);
  const [createRoleModalOpen, setCreateRoleModalOpen] = useState(false);

  useEffect(() => {
    securityApi.listarUsuarios()
      .then(setSecurityUsers)
      .catch(() => toast.error('No se pudieron cargar los usuarios'))
      .finally(() => setLoadingUsers(false));
  }, []);

  useEffect(() => {
    securityApi.listarRoles()
      .then(setSecurityRoles)
      .catch(() => toast.error('No se pudieron cargar los roles'))
      .finally(() => setLoadingRoles(false));
  }, []);

  const recargarUsuarios = async () => {
    const data = await securityApi.listarUsuarios();
    setSecurityUsers(data);
  };

  const recargarRoles = async () => {
    const data = await securityApi.listarRoles();
    setSecurityRoles(data);
  };

  const cambiarEstadoUsuario = async (user: SecurityUser) => {
    try {
      setUpdatingUserId(user.idUsuario);

      const resultado = user.estado === 'ACTIVO'
        ? await securityApi.desactivarUsuario(user.idUsuario)
        : await securityApi.activarUsuario(user.idUsuario);

      await recargarUsuarios();

      toast.success(
        user.estado === 'ACTIVO'
          ? 'Usuario desactivado'
          : 'Usuario activado',
        { description: resultado.mensaje }
      );
    } catch (error) {
      toast.error('No se pudo actualizar el usuario', {
        description:
          error instanceof Error
            ? error.message
            : 'Ocurrió un error inesperado.'
      });
    } finally {
      setUpdatingUserId(null);
    }
  };

  const normalizedQuery = query.trim().toLowerCase();
  const users = securityUsers.filter((user) =>
    filterUser(user, statusFilter, normalizedQuery)
  );

  const selectedSecurityRole = securityRoles.find(
    (role) => role.nombre === selectedRole
  );

  return (
    <div>
      <PageHeader
        title="Usuarios, roles y permisos"
        description="Administra las cuentas de los trabajadores, asigna roles y define qué módulos y acciones puede usar cada rol."
        actions={
          tab === 'usuarios' ? (
            <Gate permission="users.create">
              <Button
                icon={PlusIcon}
                variant="primary"
                onClick={() => {
                  setEditingUser(null);
                  setCreateUserModalOpen(true);
                }}
              >
                Nuevo usuario
              </Button>
            </Gate>
          ) : (
            <Gate permission="roles.create">
              <Button
                icon={PlusIcon}
                variant="primary"
                onClick={() => setCreateRoleModalOpen(true)}
              >
                Nuevo rol
              </Button>
            </Gate>
          )
        }
      />

      <CreateUserModal
        open={createUserModalOpen}
        onClose={() => {
          setCreateUserModalOpen(false);
          setEditingUser(null);
        }}
        roles={securityRoles}
        onSuccess={recargarUsuarios}
        user={editingUser}
      />

      <ManageUserRolesModal
        open={rolesModalOpen}
        user={rolesUser}
        roles={securityRoles}
        onClose={() => {
          setRolesModalOpen(false);
          setRolesUser(null);
        }}
        onSuccess={recargarUsuarios}
      />

      <CreateRoleModal
        open={createRoleModalOpen}
        onClose={() => setCreateRoleModalOpen(false)}
        onSuccess={recargarRoles}
      />

      <Tabs
        className="mb-5"
        active={tab}
        onChange={setTab}
        items={[
          {
            id: 'usuarios',
            label: 'Usuarios',
            count: securityUsers.length
          },
          {
            id: 'roles',
            label: 'Roles y permisos',
            count: securityRoles.length
          }
        ]}
      />

      {tab === 'usuarios' ? (
        <Card>
          <div className="flex flex-wrap items-center gap-3 border-b border-brand-100 px-5 py-3.5">
            <SearchInput
              value={query}
              onValueChange={setQuery}
              placeholder="Buscar por nombre, usuario, correo"
              className="w-full sm:w-72"
            />

            <Dropdown
              align="left"
              width="w-40"
              trigger={({ toggle }) => (
                <button
                  type="button"
                  onClick={toggle}
                  aria-label="Filtrar usuarios por estado"
                  title="Filtrar por estado"
                  className={cn(
                    'inline-flex h-9 items-center gap-2 rounded-md border px-3 text-[13px] font-medium transition-colors duration-150 ease-smooth',
                    statusFilter !== 'TODOS'
                      ? 'border-emerald-300 bg-emerald-50/70 text-emerald-900 hover:bg-emerald-100/80'
                      : 'border-brand-200 bg-white text-brand-700 hover:bg-brand-50 hover:border-brand-300'
                  )}
                >
                  <FilterIcon className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden="true" />
                  <span>
                    {statusFilter === 'TODOS'
                      ? 'Todos'
                      : statusFilter === 'ACTIVO'
                        ? 'Activos'
                        : 'Inactivos'}
                  </span>
                  {statusFilter !== 'TODOS' && (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                  )}
                </button>
              )}
            >
              {({ close }) => (
                <div className="py-1">
                  {(
                    [
                      { id: 'TODOS', label: 'Todos' },
                      { id: 'ACTIVO', label: 'Activos' },
                      { id: 'INACTIVO', label: 'Inactivos' }
                    ] as const
                  ).map((option) => (
                    <DropdownItem
                      key={option.id}
                      onClick={() => {
                        setStatusFilter(option.id);
                        close();
                      }}
                    >
                      <span
                        className={cn(
                          statusFilter === option.id
                            ? 'font-semibold text-emerald-700'
                            : 'text-brand-700'
                        )}
                      >
                        {option.label}
                      </span>
                    </DropdownItem>
                  ))}
                </div>
              )}
            </Dropdown>
          </div>

          {loadingUsers && (
            <div className="px-5 py-3 text-sm text-brand-400">
              Cargando usuarios...
            </div>
          )}

          <Table
            head={
              <>
                <TH>Usuario</TH>
                <TH>Correo de contacto</TH>
                <TH>Roles asignados</TH>
                <TH>Último acceso</TH>
                <TH>Estado</TH>
                <TH align="right">Acciones</TH>
              </>
            }
          >
            {users.map((user) => (
              <TR key={user.idUsuario}>
                <TD>
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-[11px] font-semibold text-brand-600">
                      {user.nombreCompleto
                        .split(' ')
                        .slice(0, 2)
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()}
                    </span>

                    <span>
                      <span className="block font-medium text-brand-900">
                        {user.nombreCompleto}
                      </span>

                      <span className="block text-[11px] text-brand-300">
                        {user.usuarioLogin}
                      </span>
                    </span>
                  </div>
                </TD>

                <TD className="text-brand-500">
                  {user.correo ?? 'Sin correo registrado'}
                </TD>

                <TD>
                  <div className="flex flex-wrap gap-1">
                    {user.roles.map((role) => (
                      <Badge key={role.idRol} tone="brand">
                        {role.nombre}
                      </Badge>
                    ))}
                  </div>
                </TD>

                <TD className="text-brand-500">
                  {user.ultimoAcceso
                    ? new Date(user.ultimoAcceso).toLocaleString('es-PE')
                    : 'Sin acceso'}
                </TD>

                <TD>
                  <StatusBadge status={user.estadoNombre} />
                </TD>

                <TD align="right">
                  <div className="flex justify-end gap-1.5">
                    <Gate permission="users.edit">
                      <Button
                        size="sm"
                        icon={PencilIcon}
                        disabled={user.idUsuario === currentUserId}
                        title={
                          user.idUsuario === currentUserId
                            ? 'No puedes editar tu propia cuenta'
                            : 'Editar usuario'
                        }
                        onClick={() => {
                          if (user.idUsuario === currentUserId) return;

                          setEditingUser(user);
                          setCreateUserModalOpen(true);
                        }}
                      />
                    </Gate>

                    <Gate permission="users.assign_role">
                      <Button
                        size="sm"
                        icon={ShieldCheckIcon}
                        disabled={user.idUsuario === currentUserId}
                        title={
                          user.idUsuario === currentUserId
                            ? 'No puedes modificar los roles de tu propia cuenta'
                            : 'Administrar roles'
                        }
                        onClick={() => {
                          if (user.idUsuario === currentUserId) return;

                          setRolesUser(user);
                          setRolesModalOpen(true);
                        }}
                      />
                    </Gate>

                    {user.estado === 'ACTIVO' ? (
                      <Gate permission="users.deactivate">
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={updatingUserId === user.idUsuario}
                          onClick={() => cambiarEstadoUsuario(user)}
                        >
                          {updatingUserId === user.idUsuario ? 'Procesando...' : 'Desactivar'}
                        </Button>
                      </Gate>
                    ) : (
                      <Gate permission="users.activate">
                        <Button
                          size="sm"
                          variant="success"
                          disabled={updatingUserId === user.idUsuario}
                          onClick={() => cambiarEstadoUsuario(user)}
                        >
                          {updatingUserId === user.idUsuario ? 'Procesando...' : 'Activar'}
                        </Button>
                      </Gate>
                    )}
                  </div>
                </TD>
              </TR>
            ))}
          </Table>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
          <Card className="h-fit">
            <CardHeader
              title="Roles"
              description="Selecciona un rol para editar sus permisos"
            />

            {loadingRoles && (
              <div className="px-5 py-3 text-sm text-brand-400">
                Cargando roles...
              </div>
            )}

            <ul className="p-2">
              {securityRoles.map((role) => {
                const roleName = role.nombre as RoleName;
                const isActive = roleName === selectedRole;

                return (
                  <li key={role.idRol}>
                    <button
                      type="button"
                      onClick={() => setSelectedRole(roleName)}
                      aria-pressed={isActive}
                      className={cn(
                        'w-full rounded-md px-3 py-2.5 text-left transition-colors duration-150 ease-smooth',
                        isActive
                          ? 'bg-brand-900 text-white'
                          : 'hover:bg-brand-50'
                      )}
                    >
                      <span
                        className={cn(
                          'block text-[13px] font-medium',
                          isActive
                            ? 'text-white'
                            : 'text-brand-800'
                        )}
                      >
                        {role.nombre}
                      </span>

                      <span
                        className={cn(
                          'mt-0.5 block text-[11px] tabular',
                          isActive
                            ? 'text-brand-200'
                            : 'text-brand-400'
                        )}
                      >
                        {role.cantidadPermisos} permisos ·{' '}
                        {role.cantidadUsuarios} usuarios
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card>
            <CardHeader
              title={`Permisos del rol ${selectedRole}`}
              description={
                selectedSecurityRole?.descripcion ??
                'Selecciona un rol para consultar sus permisos.'
              }
            />

            {selectedSecurityRole && (
              <PermissionMatrix roleCode={selectedSecurityRole.codigo} />
            )}
          </Card>
        </div>
      )
      }
    </div >
  );
}