import React, { useEffect, useState } from 'react';
import { ACTION_LABELS, MODULE_ACTIONS, MODULE_LABELS, ROLES } from '../../data/roles';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../utils/cn';
import type { Action, ModuleKey, Permission, RoleName } from '../../types';

const ACTIONS: Action[] = ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export'];

export function PermissionMatrix({ role }: {role: RoleName;}) {
  const { can } = useAuth();
  const editable = can('users.edit');
  const [granted, setGranted] = useState<Set<Permission>>(
    () => new Set(ROLES[role].permissions)
  );

  useEffect(() => {
    setGranted(new Set(ROLES[role].permissions));
  }, [role]);

  const toggle = (permission: Permission) => {
    if (!editable) return;
    setGranted((prev) => {
      const next = new Set(prev);
      if (next.has(permission)) next.delete(permission);else
      next.add(permission);
      return next;
    });
  };

  const modules = Object.keys(MODULE_LABELS) as ModuleKey[];

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-[13px]">
        <thead className="bg-brand-50/60">
          <tr className="border-b border-brand-100">
            <th
              scope="col"
              className="sticky left-0 z-10 bg-brand-50/95 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-brand-400">
              
              Módulo
            </th>
            {ACTIONS.map((action) =>
            <th
              key={action}
              scope="col"
              className="px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-brand-400">
              
                {ACTION_LABELS[action]}
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-brand-50">
          {modules.map((module) => {
            const available = MODULE_ACTIONS[module];
            const hasView = granted.has(`${module}.view` as Permission);
            return (
              <tr key={module} className={cn(!hasView && 'bg-brand-50/30')}>
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-white px-5 py-2.5 text-left text-[13px] font-medium text-brand-800">
                  
                  {MODULE_LABELS[module]}
                  {!hasView ?
                  <span className="mt-0.5 block text-[11px] font-normal text-brand-300">
                      Oculto en el menú de este rol
                    </span> :
                  null}
                </th>
                {ACTIONS.map((action) => {
                  const permission = `${module}.${action}` as Permission;
                  const supported = available.includes(action);
                  const checked = granted.has(permission);
                  return (
                    <td key={action} className="px-3 py-2.5 text-center">
                      {supported ?
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!editable}
                        onChange={() => toggle(permission)}
                        aria-label={`${ACTION_LABELS[action]} en ${MODULE_LABELS[module]}`}
                        className="h-4 w-4 cursor-pointer rounded border-brand-300 text-brand-700 accent-brand-700 disabled:cursor-not-allowed" /> :


                      <span className="text-brand-200" aria-hidden="true">
                          —
                        </span>
                      }
                    </td>);

                })}
              </tr>);

          })}
        </tbody>
      </table>
      <p className="border-t border-brand-100 px-5 py-3 text-[12px] text-brand-400">
        Al quitar el permiso <span className="font-medium text-brand-600">Ver</span> de un módulo,
        este desaparece del sidebar y del acceso por URL para todos los usuarios con el rol.
      </p>
    </div>);

}