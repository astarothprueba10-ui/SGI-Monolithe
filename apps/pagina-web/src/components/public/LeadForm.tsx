import { ConfirmacionConsulta } from './ConfirmacionConsulta';
import { EstadoCatalogoProyectos } from './EstadoCatalogoProyectos';
import { SendIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { Checkbox, Field, Input, Select } from '../ui/Form';
import { Alert } from '../ui/Feedback';
import { useCaptacionPublica } from '../../hooks/useCaptacionPublica';

export function LeadForm({ compact = false }: { compact?: boolean }) {
  const { values, accept, setAccept, errors, state, codigoSeguimiento, projects, projectsLoading, projectsError, reloadProjects, update, submit, reset } = useCaptacionPublica('Solicitar información');
  if (state === 'success') return <ConfirmacionConsulta nombre={values.nombres} referencia={codigoSeguimiento} reset={reset} />;
  return (
    <form onSubmit={submit} noValidate className={compact ? 'space-y-4' : 'space-y-4 rounded-2xl border border-line bg-white p-6 shadow-card'}>
      {Object.values(errors).some(Boolean) && <Alert tone="error" title="Revisa tu solicitud">{errors.envio || errors.catalogo || 'Corrige los campos señalados.'}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        {(['nombres', 'apellidoPaterno', 'telefono', 'correo', 'numeroDocumento'] as const).map(key => (
          <Field key={key} label={{ nombres: 'Nombres', apellidoPaterno: 'Apellidos', apellidoMaterno: 'Apellido materno', telefono: 'Teléfono', correo: 'Correo', numeroDocumento: 'DNI (opcional)' }[key]}
            htmlFor={`lead-${key}`} required={!['apellidoMaterno','numeroDocumento'].includes(key)} error={errors[key]}>
            <Input id={`lead-${key}`} type={key === 'correo' ? 'email' : 'text'} value={values[key]} error={errors[key]} onChange={e => update(key, e.target.value)} />
          </Field>
        ))}
        <Field label="Proyecto de interés" htmlFor="lead-project" required error={errors.idProyecto}>
          <Select id="lead-project" disabled={projectsLoading || !projects.length} value={values.idProyecto} onChange={e => update('idProyecto', e.target.value)}>
            <option value="">Selecciona un proyecto</option>
            {projects.map(p => <option key={p.idProyecto} value={p.idProyecto}>{p.nombre}</option>)}
          </Select>
        </Field>
      </div>
      <EstadoCatalogoProyectos loading={projectsLoading} error={projectsError} empty={!projects.length} retry={() => void reloadProjects()} />
      <Checkbox id="lead-privacidad" checked={accept} onChange={e => setAccept(e.target.checked)} label="Acepto la política de privacidad y el tratamiento de mis datos personales." />
      {errors.accept && <p className="text-sm text-red-600">{errors.accept}</p>}
      <Button type="submit" size="lg" loading={state === 'loading'} disabled={state === 'loading' || projectsLoading || !projects.length} className="w-full"><SendIcon className="h-4 w-4" />Quiero recibir información</Button>
    </form>
  );
}
