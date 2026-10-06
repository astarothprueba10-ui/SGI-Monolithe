import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ShieldCheckIcon } from 'lucide-react';

import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

import {
  securityApi,
  type SecurityRole,
  type SecurityUser
} from '../../services/securityApi';

interface ManageUserRolesModalProps {
  open: boolean;
  user: SecurityUser | null;
  roles: SecurityRole[];
  onClose: () => void;
  onSuccess: () => Promise<void>;
}

export function ManageUserRolesModal({
  open,
  user,
  roles,
  onClose,
  onSuccess
}: ManageUserRolesModalProps) {
  const [assignedRoles, setAssignedRoles] = useState<Set<string>>(
    new Set()
  );

  const [updatingRole, setUpdatingRole] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (!open || !user) return;

    setAssignedRoles(
      new Set(user.roles.map((role) => role.codigo))
    );
  }, [open, user]);

  const visibleRoles = useMemo(() => {
    return roles.filter(
      (role) =>
        role.activo ||
        assignedRoles.has(role.codigo)
    );
  }, [roles, assignedRoles]);

  const handleRoleChange = async (
    role: SecurityRole,
    checked: boolean
  ) => {
    if (!user || updatingRole) return;

    const codigoRol = role.codigo;

    /*
     * No permitir que una cuenta se quede sin roles.
     * Backend tambien lo valida, pero aqui evitamos
     * una solicitud innecesaria.
     */
    if (
      !checked &&
      assignedRoles.has(codigoRol) &&
      assignedRoles.size === 1
    ) {
      toast.error('El usuario debe conservar al menos un rol.');
      return;
    }

    try {
      setUpdatingRole(codigoRol);

      if (checked) {
        const resultado = await securityApi.asignarRol(
          user.idUsuario,
          codigoRol
        );

        if (resultado.estado !== 'ASIGNADO') {
          throw new Error(resultado.mensaje);
        }

        setAssignedRoles((prev) => {
          const next = new Set(prev);
          next.add(codigoRol);
          return next;
        });

        toast.success('Rol agregado', {
          description: `${role.nombre} fue asignado correctamente.`
        });
      } else {
        const resultado = await securityApi.revocarRol(
          user.idUsuario,
          codigoRol
        );

        if (resultado.estado !== 'REVOCADO') {
          throw new Error(resultado.mensaje);
        }

        setAssignedRoles((prev) => {
          const next = new Set(prev);
          next.delete(codigoRol);
          return next;
        });

        toast.success('Rol retirado', {
          description: `${role.nombre} fue retirado correctamente.`
        });
      }

      await onSuccess();
    } catch (error) {
      toast.error(
        checked
          ? 'No se pudo asignar el rol'
          : 'No se pudo retirar el rol',
        {
          description:
            error instanceof Error
              ? error.message
              : 'Ocurrio un error inesperado.'
        }
      );
    } finally {
      setUpdatingRole(null);
    }
  };

  return (
    <Modal
      open={open}
      onClose={updatingRole ? () => {} : onClose}
      title="Administrar roles"
      description="Selecciona los roles que tendrá asignados este usuario."
      footer={
        <div className="flex justify-end">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={Boolean(updatingRole)}
          >
            Cerrar
          </Button>
        </div>
      }
    >
      {user && (
        <div className="space-y-5">

          {/* Usuario */}
          <div className="rounded-md border border-brand-100 bg-brand-50/50 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-brand-600">
                <ShieldCheckIcon className="h-4 w-4" />
              </div>

              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-brand-900">
                  {user.nombreCompleto}
                </p>

                <p className="truncate text-[11px] text-brand-400">
                  {user.usuarioLogin}
                </p>
              </div>
            </div>
          </div>

          {/* Roles */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-brand-600">
              Roles disponibles
            </p>

            <div className="overflow-hidden rounded-md border border-brand-100">
              {visibleRoles.map((role) => {
                const checked = assignedRoles.has(role.codigo);
                const loading = updatingRole === role.codigo;

                return (
                  <label
                    key={role.idRol}
                    className={[
                      'flex items-center justify-between gap-3 border-b border-brand-100 px-3 py-3 last:border-b-0',
                      loading
                        ? 'cursor-wait bg-brand-50'
                        : 'cursor-pointer hover:bg-brand-50/60'
                    ].join(' ')}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={Boolean(updatingRole)}
                        onChange={(e) =>
                          void handleRoleChange(
                            role,
                            e.target.checked
                          )
                        }
                        className="h-4 w-4 cursor-pointer rounded border-brand-300"
                      />

                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-brand-800">
                          {role.nombre}
                        </p>

                        {role.descripcion && (
                          <p className="mt-0.5 text-[11px] text-brand-400">
                            {role.descripcion}
                          </p>
                        )}
                      </div>
                    </div>

                    {loading && (
                      <span className="shrink-0 text-[11px] text-brand-400">
                        Actualizando...
                      </span>
                    )}
                  </label>
                );
              })}
            </div>

            <p className="text-[11px] text-brand-400">
              Los cambios se aplican automáticamente al marcar o desmarcar un rol.
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
}