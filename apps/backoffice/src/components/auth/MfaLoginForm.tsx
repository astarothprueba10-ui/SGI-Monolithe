import { useEffect, useRef, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { ApiError } from '../../lib/apiClient';
import { prepareMfa, verifyMfa, type MfaChallenge, type MfaEnrollment, type MfaLoginSession } from '../../lib/mfaLogin';

interface Props {
    challenge: MfaChallenge;
    onSuccess: (session: MfaLoginSession) => Promise<void>;
    onRestart: (message?: string) => void;
}

const COPY = {
    ACTIVACION: ['Activa la verificación en dos pasos', 'Ingresa el código de activación que recibiste de Monolithe.'],
    CODIGO: ['Verificación en dos pasos', 'Abre tu aplicación autenticadora e ingresa el código de Monolithe.'],
    RECUPERACION: ['Recupera tu autenticador', 'Ingresa el código de recuperación que guardaste para vincular un dispositivo nuevo.'],
    VINCULACION: ['Vincula tu aplicación autenticadora', 'Escanea el QR con Google Authenticator u otra app compatible.']
} as const;

type Phase = keyof typeof COPY;
type Flow = {
    enrollment: MfaEnrollment | null;
    recovering: boolean;
    saved: boolean;
    code: string;
    busy: boolean;
    error: string;
};
type Update = Dispatch<SetStateAction<Flow>>;
const INITIAL: Flow = { enrollment: null, recovering: false, saved: false, code: '', busy: false, error: '' };

function EnrollmentDetails({ enrollment, saved, setSaved }: {
    enrollment: MfaEnrollment; saved: boolean; setSaved: (saved: boolean) => void;
}) {
    return (
        <div className="space-y-3">
            <img src={enrollment.qr} alt="Código QR para configurar el autenticador de Monolithe"
                width={176} height={176} className="mx-auto h-44 w-44 max-w-full rounded-lg border border-brand-200" />
            <details className="text-sm text-brand-600">
                <summary className="cursor-pointer font-medium">Ingresar la clave manualmente</summary>
                <p className="mt-2">Selecciona un código basado en tiempo y usa esta clave.</p>
                <code className="mt-1 block select-all break-all text-xs text-brand-900">{enrollment.claveManual}</code>
            </details>
            <RecoveryCode code={enrollment.codigoRecuperacion} saved={saved} setSaved={setSaved} />
        </div>
    );
}

function RecoveryCode({ code, saved, setSaved }: { code: string; saved: boolean; setSaved: (saved: boolean) => void }) {
    return (
        <div className="space-y-2 rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm">
            <p className="font-semibold text-brand-900">Código de recuperación</p>
            <code className="block select-all break-all text-xs text-brand-900">{code}</code>
            <p className="text-brand-600">Guárdalo en un lugar seguro. Se muestra una sola vez y sirve para cambiar de dispositivo.</p>
            <label className="flex items-start gap-2 text-brand-900">
                <input type="checkbox" checked={saved} onChange={event => setSaved(event.target.checked)}
                    className="mt-1 h-4 w-4 shrink-0 accent-brand-800" />
                Guardé mi código de recuperación
            </label>
        </div>
    );
}

function CodeField({ phase, flow, update }: { phase: Phase; flow: Flow; update: Update }) {
    const otp = isOtp(phase);
    const input = useRef<HTMLInputElement>(null);
    const label = otp ? 'Código del autenticador' : phase === 'ACTIVACION' ? 'Código de activación' : 'Código de recuperación';
    useEffect(() => { input.current?.focus(); }, [phase]);

    return (
        <div>
            <label htmlFor="mfa-codigo" className="mb-1.5 block text-sm font-medium text-brand-900">{label}</label>
            <input id="mfa-codigo" ref={input} type="text" value={flow.code} disabled={flow.busy}
                inputMode={otp ? 'numeric' : 'text'} autoComplete={otp ? 'one-time-code' : 'off'}
                autoCapitalize="none" spellCheck={false} maxLength={otp ? 6 : 48}
                aria-invalid={Boolean(flow.error)} aria-describedby={flow.error ? 'mfa-error' : undefined}
                onChange={event => changeCode(event.target.value, otp, update)}
                className="h-11 w-full rounded-lg border border-brand-200 focus-visible:outline-brand-700 px-3 text-base text-brand-900" />
            {flow.error && <p id="mfa-error" role="alert" className="mt-2 text-sm text-rose-700">{flow.error}</p>}
        </div>
    );
}

function isOtp(phase: Phase) {
    return phase === 'CODIGO' || phase === 'VINCULACION';
}

function changeCode(value: string, otp: boolean, update: Update) {
    const code = otp ? value.replace(/[^0-9]/g, '').slice(0, 6) : value;
    update(flow => ({ ...flow, code }));
}

function canSubmit(flow: Flow, phase: Phase) {
    if (flow.busy || (flow.enrollment && !flow.saved)) return false;
    return isOtp(phase) ? /^[0-9]{6}$/.test(flow.code) : flow.code.trim().length > 0;
}

async function submitMfa(props: Props, flow: Flow, phase: Phase, update: Update) {
    if (!canSubmit(flow, phase)) return;
    update(current => ({ ...current, busy: true, error: '' }));
    try {
        const reto = flow.enrollment?.reto ?? props.challenge.reto;
        if (isOtp(phase)) await props.onSuccess(await verifyMfa(reto, flow.code));
        else {
            const enrollment = await prepareMfa(reto, flow.code.trim());
            update(current => ({ ...current, enrollment, code: '' }));
        }
    } catch (problem) {
        if (problem instanceof ApiError && problem.status === 401) props.onRestart(problem.message);
        else {
            const error = problem instanceof ApiError ? problem.message : 'No pudimos verificar el código. Inténtalo nuevamente.';
            update(current => ({ ...current, error }));
        }
    } finally {
        update(current => ({ ...current, busy: false }));
    }
}

function LoginActions({ props, flow, phase, update }: { props: Props; flow: Flow; phase: Phase; update: Update }) {
    return (
        <>
            <button type="submit" disabled={!canSubmit(flow, phase)}
                className="min-h-11 w-full rounded-lg bg-brand-800 hover:bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {flow.busy ? 'Verificando…' : isOtp(phase) ? 'Verificar e ingresar' : 'Continuar'}
            </button>
            <div className="flex flex-wrap justify-between gap-x-4 gap-y-2 text-sm font-medium text-brand-700">
                <button type="button" disabled={flow.busy} onClick={() => props.onRestart()} className="min-h-10 hover:underline">
                    Volver al inicio
                </button>
                {props.challenge.paso === 'CODIGO' && !flow.enrollment && (
                    <button type="button" disabled={flow.busy} className="min-h-10 hover:underline"
                        onClick={() => update(current => ({ ...current, recovering: !current.recovering, code: '', error: '' }))}>
                        {flow.recovering ? 'Usar mi autenticador' : 'Usar código de recuperación'}
                    </button>
                )}
            </div>
        </>
    );
}

/** Solicita el segundo factor y conserva el reto y las claves únicamente en memoria. */
export function MfaLoginForm(props: Props) {
    const [flow, update] = useState<Flow>(INITIAL);
    const phase = flow.enrollment ? 'VINCULACION' : flow.recovering ? 'RECUPERACION' : props.challenge.paso;
    const [title, description] = COPY[phase];
    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        void submitMfa(props, flow, phase, update);
    }
    return (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1">
                <h2 className="text-lg font-semibold text-brand-900">{title}</h2>
                <p className="text-sm text-brand-600">{description}</p>
            </div>
            {flow.enrollment && <EnrollmentDetails enrollment={flow.enrollment} saved={flow.saved}
                setSaved={saved => update(current => ({ ...current, saved }))} />}
            <CodeField phase={phase} flow={flow} update={update} />
            <LoginActions props={props} flow={flow} phase={phase} update={update} />
        </form>
    );
}
