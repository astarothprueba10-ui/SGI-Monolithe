import { type ClipboardEvent, type Dispatch, type InputHTMLAttributes, type ReactNode, type SetStateAction } from 'react';
import { pastedLeadPhone } from '../../lib/leadPhone';
import { phoneCountry, phoneCountryHint } from '../../lib/phoneCountries';
import type { LeadField, LeadFormValues } from '../../utils/crmLeadValidation';
import { Input } from '../ui/Field';
import { PhoneCountrySelect } from './PhoneCountrySelect';

type Props = { form: LeadFormValues; setForm: Dispatch<SetStateAction<LeadFormValues>>; disabled: boolean;
  errorProps: (field: LeadField) => InputHTMLAttributes<HTMLInputElement>; errorMessage: (field: LeadField) => ReactNode };

function usePhoneInput({ form, setForm }: Props) {
  const pasteError = form.phoneInputError ?? '';
  const country = phoneCountry(form.phoneCountry ?? 'PE')!;
  const change = (value: string) => setForm(previous => ({ ...previous, phone: value.replace(/\D/g, ''), phoneInputError: undefined }));
  const paste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const result = pastedLeadPhone(event.clipboardData.getData('text'), country.code);
    if (result.error) setForm(previous => ({ ...previous, phoneInputError: result.error })); else change(result.value ?? '');
  };
  const select = (code: typeof country.code) => {
    if (code === country.code) return;
    setForm(previous => ({ ...previous, phoneCountry: code, phone: '', phoneInputError: undefined }));
  };
  return { country, pasteError, change, paste, select };
}

/** Número nacional de celular con país peruano inicial y validación del plan seleccionado. */
export function LeadPhoneField(props: Props) {
  const model = usePhoneInput(props); const control = props.errorProps('phone');
  return <div className="min-w-0 space-y-1">
    <label htmlFor="lead-phone-number" className="text-xs font-medium text-brand-700">Teléfono / WhatsApp *</label>
    <PhoneCountrySelect value={model.country.code} onChange={model.select} disabled={props.disabled} />
    <Input {...control} id="lead-phone-number" required type="tel" inputMode="numeric" autoComplete="tel-national"
      disabled={props.disabled} value={props.form.phone} maxLength={Math.max(1, ...model.country.lengths)}
      placeholder={model.country.code === 'PE' ? '987654321' : model.country.example}
      onChange={event => model.change(event.target.value)} onPaste={model.paste}
      aria-invalid={Boolean(model.pasteError) || control['aria-invalid']}
      aria-describedby={[model.pasteError ? 'lead-phone-paste-error' : control['aria-describedby'], 'lead-phone-hint'].filter(Boolean).join(' ')}
      className={model.pasteError ? 'border-red-500 focus:border-red-500' : control.className} />
    <p id="lead-phone-hint" className="text-[11px] text-brand-500">{phoneCountryHint(model.country.code)}</p>
    {model.pasteError ? <p id="lead-phone-paste-error" role="alert" className="text-[11px] text-red-600">{model.pasteError}</p> : props.errorMessage('phone')}
  </div>;
}
