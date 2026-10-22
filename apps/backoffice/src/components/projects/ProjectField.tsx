import type { ReactNode } from 'react';
import type { ProjectFormModel } from '../../hooks/useProjectForm';
import type { ProjectFormValues } from '../../types/projectForm';
import { FieldLabel } from '../ui/Field';

/** Presenta etiquetas y mensajes de error asociados al control accesible. */
export function ProjectField({ model, name, label, required, full, children }: {
  model: ProjectFormModel; name: keyof ProjectFormValues; label: string;
  required?: boolean; full?: boolean; children: ReactNode;
}) {
  const error = model.errors[name];
  return <div className={`flex flex-col gap-1 ${full ? 'col-span-full' : ''}`}>
    <FieldLabel htmlFor={name}>{label}{required && <span className="ml-1 text-rose-500">*</span>}</FieldLabel>
    {children}
    {error && <p id={`${name}-error`} role="alert" className="text-[11px] text-rose-600">{error}</p>}
  </div>;
}
