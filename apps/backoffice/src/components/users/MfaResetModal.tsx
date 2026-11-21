import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { securityApi, type SecurityUser } from '../../services/securityApi';

interface Props {
  open: boolean;
  user: SecurityUser | null;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}

/** Operación excepcional: verificación externa de identidad y confirmación explícita. */
export function MfaResetModal({ open, user, onClose, onSuccess }: Props) {
  const [confirmacion, setConfirmacion] = useState('');
  const [motivo, setMotivo] = useState('');
  const [verificada, setVerificada] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setConfirmacion('');
    setMotivo('');
    setVerificada(false);
  }, [open, user?.idUsuario]);

  const valid = Boolean(user && confirmacion.trim() === user.usuarioLogin
    && motivo.trim().length >= 12 && motivo.trim().length <= 500 && verificada && !busy);
  const cerrar = () => { if (!busy) onClose(); };

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!user || !valid) return;
    try {
      setBusy(true);
      const respuesta = await securityApi.restablecerMfa(user.idUsuario, confirmacion.trim(), motivo.trim());
      toast.success('Autenticador restablecido', { description: respuesta.mensaje });
      await onSuccess();
      onClose();
    } catch (error) {
      toast.error('No se pudo restablecer el autenticador', {
        description: error instanceof Error ? error.message : 'Solicitud rechazada'
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={cerrar} title="Restablecer autenticador MFA"
      description="Solo Administración puede autorizar la recuperación de otra cuenta."
      footer={<>
        <Button variant="secondary" disabled={busy} onClick={cerrar}>Cancelar</Button>
        <Button variant="danger" disabled={!valid} onClick={submit}>
          {busy ? 'Restableciendo…' : 'Revocar autenticador y sesiones'}
        </Button>
      </>}>
      {user && (
        <form onSubmit={submit} className="space-y-4">
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Esta operación invalida el autenticador actual y todas las sesiones del usuario.
            Solo ejecútala después de comprobar su identidad por el procedimiento oficial
            de Monolithe. Se registrará quién la realizó y el motivo. No se revelarán códigos.
          </p>
          <p className="text-sm text-brand-700">
            Cuenta: <strong>{user.nombreCompleto}</strong> · Documento: <strong>{user.usuarioLogin}</strong>
          </p>
          <label className="block space-y-1 text-sm text-brand-800">
            <span>Escribe el documento del usuario para confirmar</span>
            <input className="w-full rounded-md border border-brand-200 px-3 py-2"
              value={confirmacion} disabled={busy} onChange={e => setConfirmacion(e.target.value)}
              autoComplete="off" />
          </label>
          <label className="block space-y-1 text-sm text-brand-800">
            <span>Motivo documentado de recuperación (mínimo 12 caracteres)</span>
            <textarea className="w-full rounded-md border border-brand-200 px-3 py-2"
              value={motivo} maxLength={500} rows={3} disabled={busy}
              onChange={e => setMotivo(e.target.value)} />
          </label>
          <label className="flex items-start gap-2 text-sm text-brand-800">
            <input type="checkbox" checked={verificada} disabled={busy}
              onChange={e => setVerificada(e.target.checked)} className="mt-1" />
            <span>Confirmo que verifiqué presencialmente o mediante el procedimiento autorizado
              la identidad del titular. Su correo principal está verificado.</span>
          </label>
          <p className="text-xs text-brand-600">
            Si el usuario tiene correo verificado recibirá una alerta. Después podrá solicitar una
            nueva invitación por correo o recibirla presencialmente mediante «Invitar MFA».
            Si no hay correo verificado, la entrega asistida exige comprobar su identidad.
          </p>
        </form>
      )}
    </Modal>
  );
}
