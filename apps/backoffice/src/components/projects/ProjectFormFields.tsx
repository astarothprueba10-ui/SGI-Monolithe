import type { InputHTMLAttributes } from 'react';
import type { ProjectFormModel } from '../../hooks/useProjectForm';
import { projectDateLimits } from '../../lib/projectDateValidation';
import type { ProjectFormValues } from '../../types/projectForm';
import { Input, Select } from '../ui/Field';
import { ProjectField } from './ProjectField';
import { projectControl } from './projectControl';
import { ProjectLocationFields } from './ProjectLocationFields';

type TextField = { name: Exclude<keyof ProjectFormValues, 'activo'>; label: string; full?: boolean;
  input?: InputHTMLAttributes<HTMLInputElement> };
const GENERAL: TextField[] = [
  { name: 'codigo', label: 'Código', input: { required: true, minLength: 5, maxLength: 12, placeholder: 'Ej. PROJ-001' } },
  { name: 'nombre', label: 'Nombre', input: { required: true, maxLength: 150, placeholder: 'Nombre del proyecto' } }
];
const ADDRESS: TextField[] = [
  { name: 'direccion', label: 'Dirección', full: true, input: { maxLength: 255, placeholder: 'Dirección exacta' } },
  { name: 'ubicacionReferencia', label: 'Referencia de ubicación', full: true,
    input: { maxLength: 255, placeholder: 'Ej. Frente al mercado central' } }
];
const DIMENSIONS: TextField[] = [
  { name: 'areaTotalM2', label: 'Área total (m²)', full: true, input: { inputMode: 'decimal', placeholder: 'Ej. 50000' } },
  { name: 'latitud', label: 'Latitud', input: { inputMode: 'text', placeholder: '-90 a 90' } },
  { name: 'longitud', label: 'Longitud', input: { inputMode: 'text', placeholder: '-180 a 180' } }
];

function SectionLabel({ children }: { children: string }) {
  return <p className="col-span-full mb-1 mt-4 border-l-2 border-[#4cbb17] pl-2 text-[11px] font-semibold uppercase tracking-widest text-brand-500 first:mt-0">
    {children}
  </p>;
}

function TextFields({ model, fields }: { model: ProjectFormModel; fields: TextField[] }) {
  return <>{fields.map(({ name, label, full, input }) =>
    <ProjectField key={name} model={model} name={name} label={label} full={full} required={input?.required}>
      <Input {...projectControl(model, name)} {...input} />
    </ProjectField>
  )}</>;
}

function StatusFields({ model }: { model: ProjectFormModel }) {
  return <>
    <ProjectField model={model} name="codigoEstadoProyecto" label="Estado" required>
      <Select {...projectControl(model, 'codigoEstadoProyecto')} required>
        <option value="">Selecciona un estado</option>
        {model.catalogs.statuses.map((status) => <option key={status.codigo} value={status.codigo}>{status.nombre}</option>)}
      </Select>
    </ProjectField>
    {model.isEdit && <ProjectField model={model} name="activo" label="Registro habilitado">
      <Select id="activo" value={String(model.form.activo)} onChange={(event) => model.change('activo', event.target.value === 'true')}>
        <option value="true">Sí</option><option value="false">No</option>
      </Select>
    </ProjectField>}
  </>;
}

function DescriptionField({ model }: { model: ProjectFormModel }) {
  return <ProjectField model={model} name="descripcion" label="Descripción" full>
    <textarea {...projectControl(model, 'descripcion')} rows={3} placeholder="Descripción del proyecto (opcional)"
      className="w-full resize-none rounded-md border border-brand-200 bg-white px-3 py-2 text-[13px] text-brand-800 focus:border-brand-500" />
  </ProjectField>;
}

function DateFields({ model }: { model: ProjectFormModel }) {
  return <>{(['fechaInicio', 'fechaFinEstimada'] as const).map((name) =>
    <ProjectField key={name} model={model} name={name} label={name === 'fechaInicio' ? 'Fecha de inicio' : 'Fecha de fin estimada'}>
      <Input {...projectControl(model, name)} type="date" {...projectDateLimits(model.form, name)} />
    </ProjectField>
  )}</>;
}

/** Conserva las secciones del proyecto y aplica la ubicación dependiente y límites de fechas. */
export function ProjectFormFields({ model }: { model: ProjectFormModel }) {
  return <>
    <SectionLabel>Información general</SectionLabel>
    <TextFields model={model} fields={GENERAL} /><StatusFields model={model} /><DescriptionField model={model} />
    <SectionLabel>Ubicación</SectionLabel>
    <TextFields model={model} fields={ADDRESS} /><ProjectLocationFields model={model} />
    <SectionLabel>Dimensiones y coordenadas</SectionLabel>
    <TextFields model={model} fields={DIMENSIONS} />
    <p className="col-span-full text-[11px] text-brand-500">
      Máximo 10 dígitos, sin contar signo ni separador decimal. Área: 2 decimales; coordenadas: 7.
      Usa punto o coma decimal, sin separadores de miles.
    </p>
    <SectionLabel>Fechas</SectionLabel><DateFields model={model} />
  </>;
}
