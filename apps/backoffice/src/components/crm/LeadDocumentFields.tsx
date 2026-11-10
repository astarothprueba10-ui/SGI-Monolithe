import type { ReactNode } from 'react';
import type { useLeadIdentity } from '../../hooks/useLeadIdentity';
import type { LeadField, LeadFormValues } from '../../utils/crmLeadValidation';
import { Input, Select } from '../ui/Field';

type Props = { form: LeadFormValues; lookup: ReturnType<typeof useLeadIdentity>;
  errorProps: (field: LeadField) => object; errorMessage: (field: LeadField) => ReactNode };

function DocumentNumber({ form, lookup, errorProps, errorMessage }: Props) {
  const maximum = form.tipoDocumento === 'DNI' ? 8 : form.tipoDocumento === 'RUC' ? 11 : form.tipoDocumento === 'CE' ? 12 : 20;
  return <div>
    <label htmlFor="lead-numero-documento" className="text-xs font-medium text-brand-700">Número de documento *</label>
    <Input id="lead-numero-documento" required value={form.numeroDocumento} maxLength={maximum}
      inputMode={form.tipoDocumento === 'PASAPORTE' ? 'text' : 'numeric'}
      onChange={event => lookup.change('numeroDocumento', event.target.value)}
      placeholder={form.tipoDocumento === 'DNI' ? '8 dígitos' : form.tipoDocumento === 'RUC' ? '11 dígitos' : form.tipoDocumento === 'CE' ? 'De 9 a 12 dígitos' : 'Letras y números'}
      {...errorProps('numeroDocumento')} />
    {errorMessage('numeroDocumento')}
  </div>;
}

/** Coloca la identificación al inicio y comunica el resultado sin bloquear la edición manual. */
export function LeadDocumentFields(props: Props) {
  return <>
    <div>
      <label htmlFor="lead-tipo-documento" className="text-xs font-medium text-brand-700">Tipo de documento *</label>
      <Select id="lead-tipo-documento" aria-label="Tipo de documento" value={props.form.tipoDocumento}
        onChange={event => props.lookup.change('tipoDocumento', event.target.value)} {...props.errorProps('tipoDocumento')}>
        <option value="DNI">DNI</option><option value="CE">Carné de extranjería</option>
        <option value="PASAPORTE">Pasaporte</option><option value="RUC">RUC</option>
      </Select>
      {props.errorMessage('tipoDocumento')}
    </div>
    <DocumentNumber {...props} />
    <p role="status" aria-live="polite" className="text-xs text-brand-600 sm:col-span-2">
      {props.lookup.message || 'Completa el documento para consultar los datos de la persona.'}
    </p>
  </>;
}
