import React from 'react';
import { Link } from 'react-router-dom';
import { LockIcon, MailIcon, ArrowLeftIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { MODULE_LABELS } from '../data/roles';
import type { ModuleKey, Permission } from '../types';

export function Unauthorized({ requested }: {requested?: Permission;}) {
  const { user, role } = useAuth();
  const moduleKey = requested?.split('.')[0] as ModuleKey | undefined;
  const moduleLabel = moduleKey ? MODULE_LABELS[moduleKey] : undefined;

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-md rounded-lg border border-brand-100 bg-white p-8 text-center shadow-card">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
          <LockIcon className="h-5 w-5" aria-hidden="true" />
        </div>
        <h1 className="text-lg font-semibold text-brand-900">Acceso no autorizado</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-brand-400">
          Tu rol <span className="font-medium text-brand-700">{role}</span> no cuenta con permiso
          {moduleLabel ?
          <>
              {' '}
              para el módulo <span className="font-medium text-brand-700">{moduleLabel}</span>
            </> :
          null}
          . El intento quedó registrado en auditoría.
        </p>
        <dl className="mt-5 space-y-1.5 rounded-md border border-brand-100 bg-brand-50/60 px-4 py-3 text-left text-[12px]">
          <div className="flex justify-between gap-3">
            <dt className="text-brand-400">Usuario</dt>
            <dd className="font-medium text-brand-700">{user.name}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-brand-400">Permiso requerido</dt>
            <dd className="font-medium text-brand-700">{requested ?? '—'}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-brand-400">Código</dt>
            <dd className="font-medium text-brand-700">HTTP 403</dd>
          </div>
        </dl>
        <div className="mt-6 flex items-center justify-center gap-2">
          <Link to="/">
            <Button icon={ArrowLeftIcon} variant="primary">
              Volver al inicio
            </Button>
          </Link>
          <Button icon={MailIcon}>Solicitar acceso</Button>
        </div>
      </div>
    </div>);

}