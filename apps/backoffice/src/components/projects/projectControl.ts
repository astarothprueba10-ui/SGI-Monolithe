import type { ProjectFormModel } from '../../hooks/useProjectForm';
import type { ProjectFormValues } from '../../types/projectForm';

/** Comparte identificación, errores y cambios entre los controles nativos. */
export function projectControl(model: ProjectFormModel, name: Exclude<keyof ProjectFormValues, 'activo'>) {
  return {
    id: name, name, value: model.form[name], 'aria-invalid': Boolean(model.errors[name]),
    'aria-describedby': model.errors[name] ? `${name}-error` : undefined,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      model.change(name, event.target.value),
    onInvalid: (event: React.FormEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      event.preventDefault();
      model.invalidate(name);
      event.currentTarget.form?.querySelector<HTMLElement>(':invalid')?.focus();
    }
  };
}
