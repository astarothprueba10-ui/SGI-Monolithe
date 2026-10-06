import { useCallback, useEffect, useState } from 'react';
import { LayersIcon, PlusIcon, PencilIcon, CalendarIcon } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Table, TD, TH, TR } from '../../ui/Table';
import { Badge } from '../../ui/Badge';
import { EmptyState } from '../../ui/Feedback';
import { useAuth } from '../../../contexts/AuthContext';
import { coreService } from '../../../services/coreService';
import { StageFormModal } from '../StageFormModal';
import type { ProyectoResponse, EtapaResponse } from '../../../types/core';

interface Props {
  project: ProyectoResponse;
}

export function ProjectStagesTab({ project }: Props) {
  const { can } = useAuth();
  const canEdit = can('projects.edit');

  const [stages, setStages] = useState<EtapaResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<EtapaResponse | null>(null);

  const loadStages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await coreService.getStagesByProject(project.idProyecto);
      setStages(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar las etapas del proyecto');
    } finally {
      setLoading(false);
    }
  }, [project.idProyecto]);

  useEffect(() => {
    loadStages();
  }, [loadStages]);

  const handleOpenCreate = () => {
    setEditingStage(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (stage: EtapaResponse) => {
    setEditingStage(stage);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingStage(null);
  };

  const handleFormSuccess = async () => {
    await loadStages();
  };

  return (
    <div className="space-y-6">
      <StageFormModal
        open={formOpen}
        onClose={handleCloseForm}
        onSuccess={handleFormSuccess}
        project={project}
        stage={editingStage}
      />

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-brand-900 flex items-center gap-2">
            <LayersIcon className="h-5 w-5 text-brand-600" />
            Etapas del proyecto
          </h3>
          <p className="text-xs text-brand-500 mt-0.5">
            Gestión y seguimiento de las etapas definidas para {project.nombre}
          </p>
        </div>

        {canEdit && (
          <Button
            icon={PlusIcon}
            onClick={handleOpenCreate}
            className="bg-brand-900 text-white hover:bg-brand-800 border border-[#4cbb17]/40 shadow-sm"
          >
            Nueva etapa
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">Error al cargar etapas:</p>
          <p>{error}</p>
        </div>
      )}

      <Card className="border border-brand-100 shadow-card bg-white overflow-hidden">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <p className="text-sm font-medium text-brand-600">Cargando etapas desde core-service...</p>
          </div>
        ) : stages.length === 0 ? (
          <EmptyState
            title="Sin etapas registradas"
            description="No hay etapas creadas para este proyecto todavía."
          />
        ) : (
          <Table
            head={
              <>
                <TH className="text-brand-900 font-bold bg-brand-50/80">Orden</TH>
                <TH className="text-brand-900 font-bold bg-brand-50/80">Código</TH>
                <TH className="text-brand-900 font-bold bg-brand-50/80">Nombre</TH>
                <TH className="text-brand-900 font-bold bg-brand-50/80">Descripción</TH>
                <TH className="text-brand-900 font-bold bg-brand-50/80">Fechas</TH>
                <TH className="text-brand-900 font-bold bg-brand-50/80">Estado</TH>
                {canEdit && <TH align="right" className="text-brand-900 font-bold bg-brand-50/80">Acciones</TH>}
              </>
            }
          >
            {stages.map((stg) => (
              <TR key={stg.idEtapa} className="hover:bg-brand-50/40">
                <TD className="font-semibold text-brand-900 w-16">
                  {stg.numeroOrden ?? '—'}
                </TD>
                <TD>
                  <span className="inline-flex items-center rounded-md border border-brand-200 bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                    {stg.codigo}
                  </span>
                </TD>
                <TD className="font-semibold text-brand-900">{stg.nombre}</TD>
                <TD className="text-brand-600 max-w-xs truncate">
                  {stg.descripcion ?? '—'}
                </TD>
                <TD className="text-brand-600 text-xs">
                  <div className="flex items-center gap-1">
                    <CalendarIcon className="h-3 w-3 text-brand-400 shrink-0" />
                    <span>{stg.fechaInicio ?? 'Sin inicio'}</span>
                    <span>→</span>
                    <span>{stg.fechaFinEstimada ?? 'Sin fin'}</span>
                  </div>
                </TD>
                <TD>
                  {stg.activo ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#4cbb17]/40 bg-[#4cbb17]/10 px-2.5 py-0.5 text-xs font-semibold text-[#2d7a0c]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#4cbb17]"></span>
                      {stg.nombreEstadoEtapa ?? 'Activo'}
                    </span>
                  ) : (
                    <Badge tone="neutral">
                      {stg.nombreEstadoEtapa ?? 'Inactivo'}
                    </Badge>
                  )}
                </TD>
                {canEdit && (
                  <TD align="right">
                    <Button
                      size="sm"
                      icon={PencilIcon}
                      onClick={() => handleOpenEdit(stg)}
                      className="border-brand-200 text-brand-700 hover:bg-brand-50"
                    >
                      Editar
                    </Button>
                  </TD>
                )}
              </TR>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
