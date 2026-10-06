import { useEffect, useMemo, useState } from 'react';
import { SaveIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { securityApi, type SecurityPermission } from '../../services/securityApi';
import { cn } from '../../utils/cn';

const ACTION_ORDER = [
  'view',
  'create',
  'edit',
  'delete',
  'approve',
  'reject',
  'export',
  'activate',
  'deactivate',
  'assign_role',
  'assign_permissions'
];

const ACTION_LABELS: Record<string, string> = {
  view: 'Ver',
  create: 'Crear',
  edit: 'Editar',
  delete: 'Eliminar',
  approve: 'Aprobar',
  reject: 'Rechazar',
  export: 'Exportar',
  activate: 'Activar',
  deactivate: 'Desactivar',
  assign_role: 'Asignar rol',
  assign_permissions: 'Asignar permisos'
};

const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  projects: 'Proyectos',
  lots: 'Lotes',
  crm: 'CRM y clientes',
  marketing: 'Marketing',
  sales: 'Ventas',
  financing: 'Financiamiento',
  finance: 'Finanzas',
  advisors: 'Asesores',
  hr: 'Trabajadores (RRHH)',
  users: 'Usuarios',
  roles: 'Roles',
  permissions: 'Permisos',
  audit: 'Auditoría'
};

export function PermissionMatrix({ roleCode }: { roleCode: string }) {
  const { can, role } = useAuth();

  const [permissions, setPermissions] = useState<SecurityPermission[]>([]);
  const [granted, setGranted] = useState<Set<string>>(new Set());
  const [originalGranted, setOriginalGranted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const editable =
    can('roles.assign_permissions') &&
    roleCode !== 'GERENCIA' &&
    (roleCode !== 'ADMINISTRADOR' || role === 'Gerencia');

  useEffect(() => {
    setLoading(true);

    securityApi.listarPermisosRol(roleCode)
      .then((data) => {
        setPermissions(data);

        const assigned = new Set(
          data
            .filter((permission) => permission.asignado)
            .map((permission) => permission.codigo)
        );

        setGranted(assigned);
        setOriginalGranted(new Set(assigned));
      })
      .catch(() => toast.error('No se pudieron cargar los permisos del rol'))
      .finally(() => setLoading(false));
  }, [roleCode]);

  const actions = useMemo(
    () =>
      ACTION_ORDER.filter((action) =>
        permissions.some((permission) => permission.accion === action)
      ),
    [permissions]
  );

  const modules = useMemo(
    () => Array.from(new Set(permissions.map((permission) => permission.modulo))),
    [permissions]
  );

  const dirty = useMemo(() => {
    if (granted.size !== originalGranted.size) return true;

    for (const permission of granted) {
      if (!originalGranted.has(permission)) return true;
    }

    return false;
  }, [granted, originalGranted]);

  const toggle = (codigo: string) => {
    if (!editable || saving) return;

    setGranted((prev) => {
      const next = new Set(prev);

      if (next.has(codigo)) {
        next.delete(codigo);
      } else {
        next.add(codigo);
      }

      return next;
    });
  };

  const guardar = async () => {
    if (!editable || !dirty || saving) return;

    try {
      setSaving(true);

      const resultado = await securityApi.actualizarPermisosRol(
        roleCode,
        Array.from(granted)
      );

      setOriginalGranted(new Set(granted));

      toast.success('Permisos actualizados', {
        description: resultado.mensaje
      });
    } catch (error) {
      toast.error('No se pudieron guardar los permisos', {
        description:
          error instanceof Error
            ? error.message
            : 'Ocurrió un error inesperado.'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="px-5 py-6 text-sm text-brand-400">
        Cargando permisos...
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between border-b border-brand-100 px-5 py-3">
        <span className="text-[12px] text-brand-400">
          {roleCode === 'GERENCIA'
            ? 'Los permisos de Gerencia se administran automáticamente.'
            : editable
              ? 'Marca o desmarca los permisos que tendrá este rol.'
              : 'Este rol está disponible solo para consulta.'}
        </span>

        {editable && (
          <Button
            variant="primary"
            icon={SaveIcon}
            disabled={!dirty || saving}
            onClick={guardar}
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-[13px]">
          <thead className="bg-brand-50/60">
            <tr className="border-b border-brand-100">
              <th className="sticky left-0 z-10 bg-brand-50/95 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-brand-400">
                Módulo
              </th>

              {actions.map((action) => (
                <th
                  key={action}
                  className="whitespace-nowrap px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-brand-400"
                >
                  {ACTION_LABELS[action] ?? action}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-brand-50">
            {modules.map((module) => {
              const modulePermissions = permissions.filter(
                (permission) => permission.modulo === module
              );

              const hasView = modulePermissions.some(
                (permission) =>
                  permission.accion === 'view' &&
                  granted.has(permission.codigo)
              );

              return (
                <tr
                  key={module}
                  className={cn(!hasView && 'bg-brand-50/30')}
                >
                  <th className="sticky left-0 z-10 bg-white px-5 py-2.5 text-left text-[13px] font-medium text-brand-800">
                    {MODULE_LABELS[module] ?? module}

                    {!hasView &&
                      modulePermissions.some((p) => p.accion === 'view') && (
                        <span className="mt-0.5 block text-[11px] font-normal text-brand-300">
                          Sin acceso de consulta
                        </span>
                      )}
                  </th>

                  {actions.map((action) => {
                    const permission = modulePermissions.find(
                      (item) => item.accion === action
                    );

                    return (
                      <td
                        key={action}
                        className="px-3 py-2.5 text-center"
                      >
                        {permission ? (
                          <input
                            type="checkbox"
                            checked={granted.has(permission.codigo)}
                            disabled={!editable || saving}
                            onChange={() => toggle(permission.codigo)}
                            aria-label={`${ACTION_LABELS[action] ?? action} en ${MODULE_LABELS[module] ?? module}`}
                            className="h-4 w-4 rounded border-brand-300 accent-brand-700 disabled:cursor-not-allowed"
                          />
                        ) : (
                          <span
                            className="text-brand-200"
                            aria-hidden="true"
                          >
                            —
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}