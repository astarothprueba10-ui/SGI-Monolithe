import { useCallback, useEffect, useState } from 'react';
import { PlusIcon, PencilIcon, LayersIcon, CalendarIcon } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button, IconButton } from '../ui/Button';
import { Table, TD, TH, TR } from '../ui/Table';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/Feedback';
import { useAuth } from '../../contexts/AuthContext';
import { coreService } from '../../services/coreService';
import { StageFormModal } from './StageFormModal';
import type { EtapaResponse, ProyectoResponse } from '../../types/core';

interface Props {
  open: boolean;
  onClose: () => void;
  project: ProyectoResponse | null;
}

export function StageManagementModal({ open, onClose, project }: Props) {
  const { can } = useAuth();
  const canEdit = can('projects.edit');

  const [stages, setStages] = useState<EtapaResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<EtapaResponse | null>(null);

  const loadStages = useCallback(async () => {
    if (!project) return;
    setLoading(true);
    setError(null);
    try {
      const res = await coreService.getStagesByProject(project.idProyecto);
      setStages(res);
    } catch (err: any) {
      setError(err.message || 'Error al cargar las etapas del proyecto.');
    } finally {
      setLoading(false);
    }
  }, [project]);

  useEffect(() => {
    if (open && project) {
      loadStages();
    } else {
      setStages([]);
      setError(null);
    }
  }, [open, project, loadStages]);

  const handleOpenCreate = () => {
    setEditingStage(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (stage: EtapaResponse) => {
    setEditingStage(stage);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingStage(null);
  };

  const handleFormSuccess = async () => {
    await loadStages();
  };

  if (!project) return null;

  return (
    <>
      <Modal
        open={open && !formOpen} // Ocultar mientras el modal de formulario está abierto, o podemos dejarlo detrás. El user dijo "cerrar solo StageFormModal", "NO cerrar StageManagementModal". Mantenemos open=true y usamos z-index de framer motion (ya manejado en Modal) o podemos no ocultarlo. Mejor dejar formOpen independiente para que el Modal de formulario se ponga encima (Modal.tsx de por sí usa portals/z-index). Dejar open=open
        onClose={onClose}
        title="Gestión de Etapas"
        description={`Proyecto: ${project.nombre} (${project.codigo})`}
        width="max-w-4xl"
        footer={
          <Button type="button" variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        }
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[13px] font-semibold text-brand-900 uppercase tracking-wide">
            Etapas del proyecto
          </h3>
          {canEdit && (
            <Button
              size="sm"
              icon={PlusIcon}
              onClick={handleOpenCreate}
              className="bg-brand-900 text-white hover:bg-brand-800 border border-[#4cbb17]/40 shadow-sm"
            >
              Nueva etapa
            </Button>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="min-h-[300px]">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <p className="text-sm font-medium text-brand-600">Cargando etapas...</p>
            </div>
          ) : stages.length === 0 ? (
            <EmptyState
              title="Sin etapas"
              description="Este proyecto aún no tiene etapas registradas."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-brand-200">
              <Table
                head={
                  <>
                    <TH className="text-brand-900 font-bold bg-brand-50/80">Orden</TH>
                    <TH className="text-brand-900 font-bold bg-brand-50/80">Código</TH>
                    <TH className="text-brand-900 font-bold bg-brand-50/80">Nombre</TH>
                    <TH className="text-brand-900 font-bold bg-brand-50/80">Fechas</TH>
                    <TH className="text-brand-900 font-bold bg-brand-50/80">Estado</TH>
                    <TH className="text-brand-900 font-bold bg-brand-50/80">Activo</TH>
                    {canEdit && <TH align="right" className="text-brand-900 font-bold bg-brand-50/80">Acciones</TH>}
                  </>
                }
              >
                {stages.map((stage) => (
                  <TR key={stage.idEtapa} className="hover:bg-brand-50/40">
                    <TD className="text-brand-600 font-medium">
                      {stage.numeroOrden ?? '—'}
                    </TD>
                    <TD className="font-semibold text-brand-900">
                      {stage.codigo}
                    </TD>
                    <TD className="text-brand-800">
                      <div className="flex items-center gap-2">
                        <LayersIcon className="h-4 w-4 text-brand-400" />
                        {stage.nombre}
                      </div>
                    </TD>
                    <TD>
                      <div className="flex flex-col gap-1 text-[12px] text-brand-600">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="h-3 w-3 text-brand-400" />
                          Ini: {stage.fechaInicio ?? '—'}
                        </span>
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="h-3 w-3 text-brand-400" />
                          Fin: {stage.fechaFinEstimada ?? '—'}
                        </span>
                      </div>
                    </TD>
                    <TD>
                      <Badge tone="neutral" className="bg-brand-50 text-brand-700 border border-brand-200">
                        {stage.nombreEstadoEtapa ?? stage.codigoEstadoEtapa ?? '—'}
                      </Badge>
                    </TD>
                    <TD>
                      {stage.activo ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#4cbb17]/40 bg-[#4cbb17]/10 px-2 py-0.5 text-[11px] font-semibold text-[#2d7a0c]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#4cbb17]"></span>
                          Sí
                        </span>
                      ) : (
                        <Badge tone="neutral" className="text-[11px]">No</Badge>
                      )}
                    </TD>
                    {canEdit && (
                      <TD align="right">
                        <IconButton
                          icon={PencilIcon}
                          label="Editar etapa"
                          onClick={() => handleOpenEdit(stage)}
                          className="text-brand-500 hover:text-brand-800 hover:bg-brand-100"
                        />
                      </TD>
                    )}
                  </TR>
                ))}
              </Table>
            </div>
          )}
        </div>
      </Modal>

      {/* Formulario (Create/Edit) */}
      <StageFormModal
        open={formOpen}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
        project={project}
        stage={editingStage}
      />
    </>
  );
}
