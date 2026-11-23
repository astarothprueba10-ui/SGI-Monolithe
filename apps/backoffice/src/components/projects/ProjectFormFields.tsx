import type { InputHTMLAttributes } from 'react';
import type { ProjectFormModel } from '../../hooks/useProjectForm';
import { projectDateLimits } from '../../lib/projectDateValidation';
import { countProjectDescriptionLetters } from '../../lib/projectDescriptionValidation';
import type { ProjectFormValues } from '../../types/projectForm';
import { Input, Select } from '../ui/Field';
import { ProjectField } from './ProjectField';
import { projectControl } from './projectControl';
import { ProjectLocationFields } from './ProjectLocationFields';

type TextField = { name: Exclude<keyof ProjectFormValues, 'activo'>; label: string; full?: boolean;
  input?: InputHTMLAttributes<HTMLInputElement> };
const GENERAL: TextField[] = [
  { name: 'nombre', label: 'Nombre', input: { required: true, maxLength: 150, placeholder: 'Nombre del proyecto' } }
];
const ADDRESS: TextField[] = [
  { name: 'direccion', label: 'Dirección', full: true, input: { maxLength: 255, placeholder: 'Dirección exacta' } },
  { name: 'ubicacionReferencia', label: 'Referencia de ubicación', full: true,
    input: { maxLength: 255, placeholder: 'Ej. Frente al mercado central' } }
];
const DIMENSIONS: TextField[] = [
  { name: 'areaTotalM2', label: 'Área total (m²)', full: true, input: { inputMode: 'decimal', placeholder: 'Ej. 50000' } }
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

function CodeField({ model }: { model: ProjectFormModel }) {
  return <ProjectField model={model} name="codigo" label="Código (automático)">
    <Input id="codigo" name="codigo" value={model.isEdit ? model.form.codigo : 'Se genera al guardar'}
      readOnly aria-readonly="true" className="cursor-not-allowed bg-brand-50 text-brand-600" />
  </ProjectField>;
}

function StatusFields({ model }: { model: ProjectFormModel }) {
  return <>
    <ProjectField model={model} name="codigoEstadoProyecto" label="Estado" required>
      <Select {...projectControl(model, 'codigoEstadoProyecto')} required>
        <option value="">Selecciona un estado</option>
        {model.catalogs.statuses.map((status) => <option key={status.codigo} value={status.codigo}>{status.nombre}</option>)}
      </Select>
    </ProjectField>
    {model.isEdit && <ProjectField model={model} name="activo" label="Habilitado en el sistema">
      <Select id="activo" value={String(model.form.activo)} onChange={(event) => model.change('activo', event.target.value === 'true')}>
        <option value="true">Sí</option><option value="false">No</option>
      </Select>
      <p className="mt-1 text-[11px] text-brand-500">
        Si seleccionas No, el registro queda inhabilitado para operaciones activas.
        No cambia el estado comercial y requiere no tener etapas, zonas, manzanas ni lotes activos.
      </p>
    </ProjectField>}
  </>;
}

function DescriptionField({ model }: { model: ProjectFormModel }) {
  return <ProjectField model={model} name="descripcion" label="Descripción" required={Boolean(model.creation)} full>
    <textarea {...projectControl(model, 'descripcion')} rows={3} required={Boolean(model.creation)}
      minLength={model.creation ? 15 : undefined} placeholder="Describe el proyecto"
      aria-describedby={model.errors.descripcion ? 'descripcion-error' : model.creation ? 'descripcion-ayuda' : undefined}
      className="w-full resize-none rounded-md border border-brand-200 bg-white px-3 py-2 text-[13px] text-brand-800 focus:border-brand-500" />
    {model.creation && <p id="descripcion-ayuda" className="text-[11px] text-brand-400">
      Mínimo 15 letras; espacios y números no cuentan. Llevas {countProjectDescriptionLetters(model.form.descripcion)}.
    </p>}
  </ProjectField>;
}

function DateFields({ model }: { model: ProjectFormModel }) {
  return <>{(['fechaInicio', 'fechaFinEstimada'] as const).map((name) =>
    <ProjectField key={name} model={model} name={name} label={name === 'fechaInicio' ? 'Fecha de inicio' : 'Fecha de fin estimada'}>
      <Input {...projectControl(model, name)} type="date" {...projectDateLimits(model.form, name, model.creation?.registrationDate)} />
      {model.creation && <p className="text-[11px] text-brand-400">{name === 'fechaInicio'
        ? 'Desde hoy, según la fecha de Perú.' : 'La fecha de fin debe ser igual o posterior al inicio.'}</p>}
    </ProjectField>
  )}</>;
}

/** Conserva las secciones del proyecto y aplica la ubicación dependiente y límites de fechas. */
export function ProjectFormFields({ model }: { model: ProjectFormModel }) {
  return <>
    <SectionLabel>Información general</SectionLabel>
    <CodeField model={model} /><TextFields model={model} fields={GENERAL} /><StatusFields model={model} /><DescriptionField model={model} />
    <SectionLabel>Ubicación</SectionLabel>
    <TextFields model={model} fields={ADDRESS} /><ProjectLocationFields model={model} />
    <SectionLabel>Dimensiones</SectionLabel>
    <TextFields model={model} fields={DIMENSIONS} />
    <p className="col-span-full text-[11px] text-brand-500">
      Área: máximo 10 dígitos y 2 decimales. Usa punto o coma decimal, sin separadores de miles.
    </p>
    <SectionLabel>Fechas</SectionLabel><DateFields model={model} />
  </>;
}
