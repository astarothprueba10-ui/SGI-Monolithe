import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { FilterIcon, PencilIcon, PlusIcon, PowerIcon, RotateCcwIcon, ShieldCheckIcon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { Button, IconButton } from '../components/ui/Button';
import { SearchInput } from '../components/ui/Field';
import { Dropdown, DropdownItem } from '../components/ui/Dropdown';
import { Table, TD, TH, TR } from '../components/ui/Table';
import { StatusBadge, Badge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import { AccountAdminGate } from '../components/auth/PermissionRoute';
import { PermissionMatrix } from '../components/users/PermissionMatrix';
import { CreateUserModal } from '../components/users/CreateUserModal';
import { ManageUserRolesModal } from '../components/users/ManageUserRolesModal';
import { CreateRoleModal } from '../components/users/CreateRoleModal';
import { EditRoleModal } from '../components/users/EditRoleModal';
import { motivoBloqueoDesactivacion } from '../components/users/roleManagementPolicy';
import { Modal } from '../components/ui/Modal';
import { cn } from '../utils/cn';
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
  const [selectedRoleCode, setSelectedRoleCode] = useState('');
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
  const [editingRole, setEditingRole] = useState<SecurityRole | null>(null);
  const [updatingRoleCode, setUpdatingRoleCode] = useState<string | null>(null);
  const [rolePendingDeactivation, setRolePendingDeactivation] = useState<SecurityRole | null>(null);

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

  useEffect(() => {
    if (!selectedRoleCode && securityRoles.length > 0) {
      setSelectedRoleCode(securityRoles[0].codigo);
    }
  }, [securityRoles, selectedRoleCode]);

  const recargarUsuarios = async () => {
    const data = await securityApi.listarUsuarios();
    setSecurityUsers(data);
  };

  const recargarRoles = async () => {
    const data = await securityApi.listarRoles();
    setSecurityRoles(data);
  };

  const recargarCatalogos = async () => {
    const resultados = await Promise.allSettled([recargarUsuarios(), recargarRoles()]);

    if (resultados[0].status === 'rejected') {
      toast.error('No se pudo actualizar el listado de usuarios');
    }
    if (resultados[1].status === 'rejected') {
      toast.error('No se pudo actualizar el catálogo de roles');
    }
  };

  const cambiarEstadoUsuario = async (user: SecurityUser) => {
    try {
      setUpdatingUserId(user.idUsuario);

      const resultado = user.estado === 'ACTIVO'
        ? await securityApi.desactivarUsuario(user.idUsuario)
        : await securityApi.activarUsuario(user.idUsuario);

      await recargarCatalogos();

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

  const cambiarEstadoRol = async (
    role: SecurityRole,
    confirmadaDesactivacion = false
  ): Promise<boolean> => {
    const reactivar = !role.activo;
    if (!reactivar && !confirmadaDesactivacion) {
      setRolePendingDeactivation(role);
      return false;
    }

    try {
      setUpdatingRoleCode(role.codigo);
      const resultado = reactivar
        ? await securityApi.reactivarRol(role.codigo)
        : await securityApi.desactivarRol(role.codigo);
      const estadosExitosos = reactivar ? ['OK', 'REACTIVADO'] : ['OK', 'DESACTIVADO'];
      if (!estadosExitosos.includes(resultado.estado)) {
        throw new Error(resultado.mensaje || 'La operación fue rechazada.');
      }
      await recargarRoles();
      toast.success(reactivar ? 'Rol reactivado' : 'Rol desactivado', {
        description: resultado.mensaje
      });
      return true;
    } catch (error) {
      toast.error(reactivar ? 'No se pudo reactivar el rol' : 'No se pudo desactivar el rol', {
        description: error instanceof Error ? error.message : 'Ocurrió un error inesperado.'
      });
      return false;
    } finally {
      setUpdatingRoleCode(null);
    }
  };

  const confirmarDesactivacionRol = async () => {
    if (!rolePendingDeactivation) return;

    const desactivado = await cambiarEstadoRol(rolePendingDeactivation, true);
    if (desactivado) setRolePendingDeactivation(null);
  };

  const normalizedQuery = query.trim().toLowerCase();
  const users = securityUsers.filter((user) =>
    filterUser(user, statusFilter, normalizedQuery)
  );

  const selectedSecurityRole = securityRoles.find((role) => role.codigo === selectedRoleCode);

  return (
    <div>
      <PageHeader
        title="Usuarios, roles y permisos"
        description="Administra las cuentas de los trabajadores, asigna roles y define qué módulos y acciones puede usar cada rol."
        actions={
          tab === 'usuarios' ? (
            <AccountAdminGate permissions={['users.create', 'users.assign_role']}>
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
            </AccountAdminGate>
          ) : (
            <AccountAdminGate permissions="roles.create">
              <Button
                icon={PlusIcon}
                variant="primary"
                onClick={() => setCreateRoleModalOpen(true)}
              >
                Nuevo rol
              </Button>
            </AccountAdminGate>
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
        onSuccess={recargarCatalogos}
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
        onSuccess={recargarCatalogos}
      />

      <CreateRoleModal
        open={createRoleModalOpen}
        onClose={() => setCreateRoleModalOpen(false)}
        onSuccess={recargarRoles}
      />

      <EditRoleModal
        open={editingRole !== null}
        role={editingRole}
        roles={securityRoles}
        onClose={() => setEditingRole(null)}
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
                    <AccountAdminGate permissions="users.edit">
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
                    </AccountAdminGate>

                    <AccountAdminGate permissions="users.assign_role">
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
                    </AccountAdminGate>

                    {user.estado === 'ACTIVO' ? (
                      <AccountAdminGate permissions="users.deactivate">
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={updatingUserId === user.idUsuario}
                          onClick={() => cambiarEstadoUsuario(user)}
                        >
                          {updatingUserId === user.idUsuario ? 'Procesando...' : 'Desactivar'}
                        </Button>
                      </AccountAdminGate>
                    ) : (
                      <AccountAdminGate permissions="users.activate">
                        <Button
                          size="sm"
                          variant="success"
                          disabled={updatingUserId === user.idUsuario}
                          onClick={() => cambiarEstadoUsuario(user)}
                        >
                          {updatingUserId === user.idUsuario ? 'Procesando...' : 'Activar'}
                        </Button>
                      </AccountAdminGate>
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

            <ul className="space-y-1 p-2">
              {securityRoles.map((role) => {
                const isActive = role.codigo === selectedRoleCode;
                const bloqueo = motivoBloqueoDesactivacion(role);

                return (
                  <li key={role.codigo} className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setSelectedRoleCode(role.codigo)}
                      aria-pressed={isActive}
                      className={cn(
                        'min-w-0 flex-1 rounded-md px-3 py-2.5 text-left transition-colors duration-150 ease-smooth',
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
                        {role.cantidadPermisos} permisos · {role.cantidadUsuarios} usuarios ·{' '}
                        {role.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </button>
                    <AccountAdminGate permissions="roles.edit">
                      <IconButton
                        icon={PencilIcon}
                        label={`Editar ${role.nombre}`}
                        title={`Editar ${role.nombre}`}
                        disabled={updatingRoleCode !== null}
                        onClick={() => setEditingRole(role)}
                      />
                    </AccountAdminGate>
                    <AccountAdminGate permissions={role.activo ? 'roles.deactivate' : 'roles.activate'}>
                      <IconButton
                        icon={role.activo ? PowerIcon : RotateCcwIcon}
                        label={`${role.activo ? 'Desactivar' : 'Reactivar'} ${role.nombre}`}
                        title={role.activo && bloqueo ? bloqueo : `${role.activo ? 'Desactivar' : 'Reactivar'} ${role.nombre}`}
                        className={role.activo ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-700 hover:bg-emerald-50'}
                        disabled={updatingRoleCode !== null || (role.activo && bloqueo !== null)}
                        onClick={() => void cambiarEstadoRol(role)}
                      />
                    </AccountAdminGate>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card>
            <CardHeader
              title={selectedSecurityRole ? `Permisos del rol ${selectedSecurityRole.nombre}` : 'Permisos del rol'}
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

      <Modal
        open={rolePendingDeactivation !== null}
        onClose={() => {
          if (updatingRoleCode === null) setRolePendingDeactivation(null);
        }}
        title="Confirmar desactivación"
        description="Confirma la desactivación del rol seleccionado."
        footer={
          <>
            <Button
              variant="secondary"
              disabled={updatingRoleCode !== null}
              onClick={() => setRolePendingDeactivation(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              disabled={updatingRoleCode !== null}
              onClick={() => void confirmarDesactivacionRol()}
            >
              {updatingRoleCode !== null ? 'Desactivando...' : 'Desactivar'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-brand-700">
          ¿Deseas desactivar el rol{' '}
          <strong className="font-semibold text-brand-900">
            {rolePendingDeactivation?.nombre}
          </strong>
          ?
        </p>
        <p className="mt-2 text-xs text-brand-400">
          Se conservará el historial de asignaciones de usuarios.
        </p>
      </Modal>
    </div >
  );
}
