import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FieldLabel, Input } from '../ui/Field';

import { securityApi } from '../../services/securityApi';

interface CreateRoleModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}

export function CreateRoleModal({
  open,
  onClose,
  onSuccess
}: CreateRoleModalProps) {
  const [nombre, setNombre] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setNombre('');
      setSubmitting(false);
    }
  }, [open]);

  const nombreLimpio = nombre.trim();

  const puedeGuardar =
    !submitting &&
    nombreLimpio.length >= 2 &&
    nombreLimpio.length <= 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!puedeGuardar) {
      toast.error('Ingresa un nombre de rol válido.');
      return;
    }

    try {
      setSubmitting(true);

      const resultado = await securityApi.crearRol(nombreLimpio);

      if (resultado.estado !== 'CREADO') {
        throw new Error(resultado.mensaje);
      }

      toast.success('Rol creado', {
        description: resultado.mensaje
      });

      setNombre('');
      await onSuccess();
      onClose();
    } catch (error) {
      toast.error('No se pudo crear el rol', {
        description:
          error instanceof Error
            ? error.message
            : 'Ocurrió un error inesperado.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={submitting ? () => {} : onClose}
      title="Nuevo rol"
      description="Crea un nuevo rol para el Backoffice."
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Cancelar
          </Button>

          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!puedeGuardar}
          >
            {submitting ? 'Creando...' : 'Crear rol'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <FieldLabel htmlFor="roleName">
            Nombre del rol *
          </FieldLabel>

          <Input
            id="roleName"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Supervisor Comercial"
            disabled={submitting}
            autoFocus
            maxLength={100}
          />

          <p className="mt-1 text-[11px] text-brand-400">
            El código interno se generará automáticamente.
          </p>
        </div>
      </form>
    </Modal>
  );
}