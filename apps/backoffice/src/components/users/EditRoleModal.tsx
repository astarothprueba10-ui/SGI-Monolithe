import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FieldLabel, Input } from '../ui/Field';
import { securityApi, type SecurityRole } from '../../services/securityApi';
import { validarNombreRol } from './roleManagementPolicy';

interface EditRoleModalProps {
  open: boolean;
  role: SecurityRole | null;
  roles: readonly SecurityRole[];
  onClose: () => void;
  onSuccess: () => Promise<void>;
}

export function EditRoleModal({
  open,
  role,
  roles,
  onClose,
  onSuccess
}: EditRoleModalProps) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && role) {
      setNombre(role.nombre);
      setDescripcion(role.descripcion ?? '');
    }
  }, [open, role]);

  const errorNombre = role ? validarNombreRol(nombre, role.codigo, roles) : 'Selecciona un rol.';
  const descripcionValida = descripcion.length <= 255;
  const puedeGuardar = open && role !== null && !submitting && !errorNombre && descripcionValida;

  const cerrar = () => {
    if (!submitting) onClose();
  };

  const guardar = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!role || !puedeGuardar) return;

    try {
      setSubmitting(true);
      const resultado = await securityApi.actualizarRol(
        role.codigo,
        nombre.trim(),
        descripcion.trim() || null
      );
      if (!['OK', 'ACTUALIZADO'].includes(resultado.estado)) {
        throw new Error(resultado.mensaje || 'La solicitud fue rechazada.');
      }
      await onSuccess();
      toast.success('Rol actualizado', { description: resultado.mensaje });
      onClose();
    } catch (error) {
      toast.error('No se pudo actualizar el rol', {
        description: error instanceof Error ? error.message : 'Ocurrió un error inesperado.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={cerrar}
      title="Editar rol"
      description="Actualiza el nombre y la descripción. El código y los permisos se conservan."
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={guardar} disabled={!puedeGuardar}>
            {submitting ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>
      }
    >
      <form onSubmit={guardar} className="space-y-4">
        <div>
          <FieldLabel htmlFor="editRoleName">Nombre *</FieldLabel>
          <Input
            id="editRoleName"
            value={nombre}
            onChange={(event) => setNombre(event.target.value)}
            maxLength={100}
            disabled={submitting}
          />
          {errorNombre && <p className="mt-1 text-xs text-rose-600">{errorNombre}</p>}
        </div>
        <div>
          <FieldLabel htmlFor="editRoleDescription">Descripción</FieldLabel>
          <textarea
            id="editRoleDescription"
            value={descripcion}
            onChange={(event) => setDescripcion(event.target.value)}
            maxLength={255}
            disabled={submitting}
            rows={3}
            className="w-full rounded-md border border-brand-200 bg-white px-3 py-2 text-[13px] text-brand-800"
          />
          {!descripcionValida && (
            <p className="mt-1 text-xs text-rose-600">La descripción no debe superar 255 caracteres.</p>
          )}
        </div>
      </form>
    </Modal>
  );
}
