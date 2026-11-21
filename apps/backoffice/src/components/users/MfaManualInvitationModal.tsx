import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { securityApi, type SecurityUser } from '../../services/securityApi';

interface Props {
  open: boolean;
  user: SecurityUser | null;
  onClose: () => void;
}

/** Invitaciones asistidas para cuentas sin correo; jamás se almacenan en localStorage. */
export function MfaManualInvitationModal({ open, user, onClose }: Props) {
  const [confirmacion, setConfirmacion] = useState('');
  const [motivo, setMotivo] = useState('');
  const [verificada, setVerificada] = useState(false);
  const [busy, setBusy] = useState(false);
  const [invitacion, setInvitacion] = useState<{
    codigoActivacion: string; horasVigencia: number; mensaje: string
  } | null>(null);

  useEffect(() => {
    setConfirmacion('');
    setMotivo('');
    setVerificada(false);
    setInvitacion(null);
  }, [open, user?.idUsuario]);

  const valid = Boolean(user && !busy && !invitacion &&
    confirmacion.trim() === user.usuarioLogin && motivo.trim().length >= 12
    && motivo.trim().length <= 500 && verificada);

  function cerrar() { if (!busy) onClose(); }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!user || !valid) return;
    try {
      setBusy(true);
      const response = await securityApi.invitarMfaAsistido(
        user.idUsuario, confirmacion.trim(), motivo.trim()
      );
      setInvitacion(response);
      toast.success('Invitación MFA emitida', { description: 'Entrega el código solo al titular verificado.' });
    } catch (error) {
      toast.error('No se pudo emitir la invitación MFA', {
        description: error instanceof Error ? error.message : 'Solicitud rechazada.'
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={cerrar} title="Invitar a activar MFA"
      description="Alternativa presencial y auditada cuando el usuario no tiene correo verificado."
      footer={<>
        <Button variant="secondary" disabled={busy} onClick={cerrar}>
          {invitacion ? 'Cerrar y ocultar el código' : 'Cancelar'}
        </Button>
        {!invitacion && <Button variant="primary" disabled={!valid} onClick={submit}>
          {busy ? 'Generando…' : 'Emitir código de activación'}
        </Button>}
      </>}>
      {user && <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-brand-700">
          Usuario: <strong>{user.nombreCompleto}</strong> · Documento: <strong>{user.usuarioLogin}</strong>
        </p>
        {!invitacion ? <>
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Verifica personalmente la identidad del titular antes de continuar.
            El código reemplaza cualquier invitación anterior y no concede acceso sin contraseña
            ni vinculación de una aplicación autenticadora.
          </p>
          <label className="block space-y-1 text-sm text-brand-800">
            <span>Confirma el documento del titular</span>
            <input className="w-full rounded-md border border-brand-200 px-3 py-2"
              value={confirmacion} autoComplete="off" disabled={busy}
              onChange={e => setConfirmacion(e.target.value)} />
          </label>
          <label className="block space-y-1 text-sm text-brand-800">
            <span>Motivo (mínimo 12 caracteres)</span>
            <textarea className="w-full rounded-md border border-brand-200 px-3 py-2"
              value={motivo} maxLength={500} rows={3} disabled={busy}
              onChange={e => setMotivo(e.target.value)} />
          </label>
          <label className="flex gap-2 text-sm text-brand-800">
            <input type="checkbox" checked={verificada} disabled={busy}
              onChange={e => setVerificada(e.target.checked)} />
            <span>Confirmo que comprobé la identidad del titular mediante el procedimiento oficial.</span>
          </label>
        </> : <>
          <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-emerald-900">Código de activación (se muestra solo esta vez)</p>
            <code className="mt-2 block select-all break-all font-mono text-sm text-emerald-950">
              {invitacion.codigoActivacion}
            </code>
            <p className="mt-2 text-xs text-emerald-800">Válido por {invitacion.horasVigencia} horas.</p>
          </div>
          <p className="text-sm text-brand-700">
            {invitacion.mensaje} No lo envíes a terceros ni lo compartas en capturas.
            Al cerrar, no podrás volver a consultar el código.
          </p>
        </>}
      </form>}
    </Modal>
  );
}
