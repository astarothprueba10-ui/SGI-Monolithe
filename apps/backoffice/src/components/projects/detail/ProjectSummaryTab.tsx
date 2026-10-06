import { Building2Icon, CalendarIcon, MapPinIcon, Maximize2Icon, InfoIcon } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { number } from '../../../utils/format';
import type { ProyectoResponse } from '../../../types/core';

interface Props {
  project: ProyectoResponse;
}

export function ProjectSummaryTab({ project }: Props) {
  const fullLocation = [project.direccion, project.distrito, project.provincia, project.departamento, project.pais]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="space-y-6">
      <Card className="p-6 border border-brand-100 shadow-card bg-white">
        <h3 className="text-base font-semibold text-brand-900 mb-4 flex items-center gap-2">
          <InfoIcon className="h-5 w-5 text-brand-600" />
          Información general
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <p className="text-xs font-medium text-brand-500">Estado del proyecto</p>
            <div className="mt-1">
              {project.activo ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#4cbb17]/40 bg-[#4cbb17]/10 px-3 py-1 text-xs font-semibold text-[#2d7a0c]">
                  <span className="h-2 w-2 rounded-full bg-[#4cbb17]"></span>
                  {project.nombreEstadoProyecto ?? 'Activo'}
                </span>
              ) : (
                <Badge tone="neutral">
                  {project.nombreEstadoProyecto ?? 'Inactivo'}
                </Badge>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-brand-500 flex items-center gap-1">
              <Maximize2Icon className="h-3.5 w-3.5 text-brand-400" />
              Área total
            </p>
            <p className="mt-1 text-sm font-semibold text-brand-900">
              {project.areaTotalM2 ? `${number(project.areaTotalM2)} m²` : 'No especificada'}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-brand-500 flex items-center gap-1">
              <CalendarIcon className="h-3.5 w-3.5 text-brand-400" />
              Fecha inicio
            </p>
            <p className="mt-1 text-sm font-semibold text-brand-900">
              {project.fechaInicio ?? 'No definida'}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-brand-500 flex items-center gap-1">
              <CalendarIcon className="h-3.5 w-3.5 text-brand-400" />
              Fecha fin estimada
            </p>
            <p className="mt-1 text-sm font-semibold text-brand-900">
              {project.fechaFinEstimada ?? 'No definida'}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-brand-500 flex items-center gap-1">
              <MapPinIcon className="h-3.5 w-3.5 text-brand-400" />
              Ubicación
            </p>
            <p className="mt-1 text-sm font-semibold text-brand-900">
              {project.distrito ? `${project.distrito}, ${project.provincia ?? ''}` : 'No definida'}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-brand-500 flex items-center gap-1">
              <Building2Icon className="h-3.5 w-3.5 text-brand-400" />
              Departamento / País
            </p>
            <p className="mt-1 text-sm font-semibold text-brand-900">
              {project.departamento ? `${project.departamento}${project.pais ? `, ${project.pais}` : ''}` : 'No definido'}
            </p>
          </div>
        </div>

        {(project.direccion || project.ubicacionReferencia) && (
          <div className="mt-6 pt-4 border-t border-brand-100 grid grid-cols-1 md:grid-cols-2 gap-4">
            {project.direccion && (
              <div>
                <p className="text-xs font-medium text-brand-500">Dirección</p>
                <p className="mt-1 text-sm text-brand-800">{project.direccion}</p>
              </div>
            )}
            {project.ubicacionReferencia && (
              <div>
                <p className="text-xs font-medium text-brand-500">Referencia de ubicación</p>
                <p className="mt-1 text-sm text-brand-800">{project.ubicacionReferencia}</p>
              </div>
            )}
          </div>
        )}

        {project.descripcion && (
          <div className="mt-6 pt-4 border-t border-brand-100">
            <p className="text-xs font-medium text-brand-500">Descripción</p>
            <p className="mt-1 text-sm text-brand-700 whitespace-pre-line">{project.descripcion}</p>
          </div>
        )}
      </Card>
    </div>
  );
}
