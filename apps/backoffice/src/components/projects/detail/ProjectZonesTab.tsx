import { useCallback, useEffect, useState } from 'react';
import { MapPinIcon, PlusIcon, PencilIcon } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Table, TD, TH, TR } from '../../ui/Table';
import { Badge } from '../../ui/Badge';
import { EmptyState } from '../../ui/Feedback';
import { useAuth } from '../../../contexts/AuthContext';
import { coreService } from '../../../services/coreService';
import { ZoneFormModal } from '../ZoneFormModal';
import type { ProyectoResponse, ZonaResponse } from '../../../types/core';

interface Props {
  project: ProyectoResponse;
}

export function ProjectZonesTab({ project }: Props) {
  const { can } = useAuth();
  const canEdit = can('projects.edit');

  const [zones, setZones] = useState<ZonaResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<ZonaResponse | null>(null);

  const loadZones = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await coreService.getZonesByProject(project.idProyecto);
      setZones(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar las zonas del proyecto');
    } finally {
      setLoading(false);
    }
  }, [project.idProyecto]);

  useEffect(() => {
    loadZones();
  }, [loadZones]);

  const handleOpenCreate = () => {
    setEditingZone(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (zone: ZonaResponse) => {
    setEditingZone(zone);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingZone(null);
  };

  const handleFormSuccess = async () => {
    await loadZones();
  };

  return (
    <div className="space-y-6">
      <ZoneFormModal
        open={formOpen}
        onClose={handleCloseForm}
        onSuccess={handleFormSuccess}
        project={project}
        zone={editingZone}
      />

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-brand-900 flex items-center gap-2">
            <MapPinIcon className="h-5 w-5 text-brand-600" />
            Zonas del proyecto
          </h3>
          <p className="text-xs text-brand-500 mt-0.5">
            Organiza sectores o áreas dentro del proyecto {project.nombre}.
          </p>
        </div>

        {canEdit && (
          <Button
            icon={PlusIcon}
            onClick={handleOpenCreate}
            className="bg-brand-900 text-white hover:bg-brand-800 border border-[#4cbb17]/40 shadow-sm"
          >
            Nueva zona
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">Error al cargar zonas:</p>
          <p>{error}</p>
        </div>
      )}

      <Card className="border border-brand-100 shadow-card bg-white overflow-hidden">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <p className="text-sm font-medium text-brand-600">Cargando zonas desde core-service...</p>
          </div>
        ) : zones.length === 0 ? (
          <EmptyState
            title="Este proyecto aún no tiene zonas."
            description={canEdit ? 'Crea la primera zona para organizar sus lotes.' : 'No se han registrado zonas todavía.'}
          />
        ) : (
          <Table
            head={
              <>
                <TH className="text-brand-900 font-bold bg-brand-50/80">Orden</TH>
                <TH className="text-brand-900 font-bold bg-brand-50/80">Código</TH>
                <TH className="text-brand-900 font-bold bg-brand-50/80">Nombre</TH>
                <TH className="text-brand-900 font-bold bg-brand-50/80">Descripción</TH>
                <TH className="text-brand-900 font-bold bg-brand-50/80">Estado</TH>
                {canEdit && <TH align="right" className="text-brand-900 font-bold bg-brand-50/80">Acciones</TH>}
              </>
            }
          >
            {zones.map((zn) => (
              <TR key={zn.idZona} className="hover:bg-brand-50/40">
                <TD className="font-semibold text-brand-900 w-16">
                  {zn.numeroOrden ?? '—'}
                </TD>
                <TD>
                  <span className="inline-flex items-center rounded-md border border-brand-200 bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                    {zn.codigo}
                  </span>
                </TD>
                <TD className="font-semibold text-brand-900">{zn.nombre}</TD>
                <TD className="text-brand-600 max-w-xs truncate">
                  {zn.descripcion ?? '—'}
                </TD>
                <TD>
                  {zn.activo ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#4cbb17]/40 bg-[#4cbb17]/10 px-2.5 py-0.5 text-xs font-semibold text-[#2d7a0c]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#4cbb17]"></span>
                      Activa
                    </span>
                  ) : (
                    <Badge tone="neutral">Inactiva</Badge>
                  )}
                </TD>
                {canEdit && (
                  <TD align="right">
                    <Button
                      size="sm"
                      icon={PencilIcon}
                      onClick={() => handleOpenEdit(zn)}
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
