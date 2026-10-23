import type { ProjectFormModel } from '../../hooks/useProjectForm';
import { locationOptions, locationValue } from '../../lib/ubigeo';
import type { LocationField } from '../../types/projectForm';
import { Input, Select } from '../ui/Field';
import { ProjectField } from './ProjectField';
import { projectControl } from './projectControl';

const LEVELS = [
  { name: 'departamento', label: 'Departamento', parent: undefined },
  { name: 'provincia', label: 'Provincia', parent: 'departamento' },
  { name: 'distrito', label: 'Distrito', parent: 'provincia' }
] as const;

function LocationSelect({ model, name, label, parent }: {
  model: ProjectFormModel; name: LocationField; label: string; parent?: LocationField;
}) {
  const options = locationOptions(model.catalogs.ubigeos, model.form, name);
  const value = locationValue(options, model.form[name]);
  const unknown = value && !options.includes(value);
  return <ProjectField model={model} name={name} label={label} required={Boolean(parent && model.form.departamento)}>
    <Select {...projectControl(model, name)} value={value} disabled={Boolean(parent && !model.form[parent])}
      required={Boolean(parent && model.form.departamento)}>
      <option value="">{parent && !model.form[parent] ? `Selecciona primero ${parent}` : `Selecciona ${label.toLowerCase()}`}</option>
      {unknown && <option value={value} disabled>{value} (valor anterior; selecciona uno válido)</option>}
      {options.map((option) => <option key={option} value={option}>{option}</option>)}
    </Select>
  </ProjectField>;
}

/** Mantiene el orden país, departamento, provincia y distrito y filtra cada nivel. */
export function ProjectLocationFields({ model }: { model: ProjectFormModel }) {
  return <>
    <ProjectField model={model} name="pais" label="País">
      <Input {...projectControl(model, 'pais')} value="Perú" readOnly className="bg-brand-50" />
    </ProjectField>
    {LEVELS.map((level) => <LocationSelect key={level.name} model={model} {...level} />)}
    <p className="col-span-full text-[11px] text-brand-500">
      Si indicas una ubicación, completa departamento, provincia y distrito.
    </p>
  </>;
}
