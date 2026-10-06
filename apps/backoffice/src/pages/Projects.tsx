import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  DownloadIcon,
  MapIcon,
  PlusIcon,
  Building2Icon,
  CalendarIcon,
  Maximize2Icon,
  MapPinIcon,
  PencilIcon
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/Feedback';
import { Gate } from '../components/auth/PermissionRoute';
import { useAuth } from '../contexts/AuthContext';
import { coreService } from '../services/coreService';
import { ProjectFormModal } from '../components/projects/ProjectFormModal';
import { number } from '../utils/format';
import type { ProyectoResponse } from '../types/core';

export function Projects() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const canCreate = can('projects.create');
  const canEdit = can('projects.edit');

  const [projects, setProjects] = useState<ProyectoResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Project Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProyectoResponse | null>(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await coreService.getProjects();
      setProjects(res);
    } catch (err: any) {
      setError(err.message || 'Error al cargar proyectos desde core-service');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleOpenCreate = () => {
    setEditingProject(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (e: React.MouseEvent, project: ProyectoResponse) => {
    e.stopPropagation();
    setEditingProject(project);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingProject(null);
  };

  const handleModalSuccess = useCallback(async () => {
    await loadProjects();
  }, [loadProjects]);

  const handleCardClick = (idProyecto: number) => {
    navigate(`/proyectos/${idProyecto}`);
  };

  return (
    <div>
      <ProjectFormModal
        open={modalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        project={editingProject}
      />

      <div className="border-l-4 border-[#4cbb17] pl-3.5 mb-6">
        <PageHeader
          title="Proyectos"
          description="Consulta y gestiona los proyectos de habilitación urbana."
          actions={
            <>
              <Link to="/plano">
                <Button icon={MapIcon} className="border-brand-200 text-brand-800 hover:bg-brand-50">
                  Plano interactivo
                </Button>
              </Link>
              <Gate permission="projects.export">
                <Button icon={DownloadIcon} className="border-brand-200 text-brand-800 hover:bg-brand-50">
                  Exportar
                </Button>
              </Gate>
              {canCreate && (
                <Button
                  icon={PlusIcon}
                  onClick={handleOpenCreate}
                  className="bg-brand-900 text-white hover:bg-brand-800 border border-[#4cbb17]/40 shadow-sm"
                >
                  Nuevo proyecto
                </Button>
              )}
            </>
          }
        />
      </div>

      {error && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">Error al cargar proyectos:</p>
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex h-48 items-center justify-center rounded-lg border border-brand-100 bg-white">
          <p className="text-sm font-medium text-brand-600">Cargando proyectos desde core-service...</p>
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          title="Sin proyectos"
          description="No se encontraron proyectos disponibles en el sistema."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {projects.map((project) => (
            <Card
              key={project.idProyecto}
              onClick={() => handleCardClick(project.idProyecto)}
              className="flex flex-col border-[#4cbb17] shadow-card bg-white cursor-pointer transition-all hover:shadow-md hover:border-brand-400 group"
              style={{ borderColor: '#4cbb17' }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-brand-100 px-5 py-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Building2Icon className="h-4 w-4 text-brand-600 shrink-0 group-hover:text-brand-900 transition-colors" />
                    <h3 className="text-base font-semibold text-brand-900 truncate group-hover:text-brand-700 transition-colors">
                      {project.nombre}
                    </h3>
                    <span className="inline-flex items-center rounded-md border border-brand-200 bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                      {project.codigo}
                    </span>
                  </div>
                  <p className="mt-1 flex items-center gap-1 text-[13px] text-brand-500">
                    <MapPinIcon className="h-3.5 w-3.5 text-brand-400 shrink-0" />
                    {project.distrito ?? '—'}{project.provincia ? `, ${project.provincia}` : ''}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {project.activo ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#4cbb17]/40 bg-[#4cbb17]/10 px-2.5 py-0.5 text-xs font-semibold text-[#2d7a0c]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#4cbb17]"></span>
                      {project.nombreEstadoProyecto ?? 'Activo'}
                    </span>
                  ) : (
                    <Badge tone="neutral">
                      {project.nombreEstadoProyecto ?? 'Inactivo'}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-b border-brand-100 px-5 py-3.5 sm:grid-cols-4 bg-brand-50/40">
                <div>
                  <p className="text-[11px] font-medium text-brand-500 flex items-center gap-1">
                    <Maximize2Icon className="h-3 w-3 text-brand-400" />
                    Área total
                  </p>
                  <p className="mt-0.5 text-[14px] font-semibold text-brand-900">
                    {project.areaTotalM2 ? `${number(project.areaTotalM2)} m²` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-brand-500">Departamento</p>
                  <p className="mt-0.5 text-[14px] font-semibold text-brand-900">
                    {project.departamento ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-brand-500 flex items-center gap-1">
                    <CalendarIcon className="h-3 w-3 text-brand-400" />
                    Inicio
                  </p>
                  <p className="mt-0.5 text-[14px] font-semibold text-brand-900">
                    {project.fechaInicio ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-brand-500 flex items-center gap-1">
                    <CalendarIcon className="h-3 w-3 text-brand-400" />
                    Fin Est.
                  </p>
                  <p className="mt-0.5 text-[14px] font-semibold text-brand-900">
                    {project.fechaFinEstimada ?? '—'}
                  </p>
                </div>
              </div>

              <div className="flex flex-1 flex-col px-5 py-4">
                {project.descripcion && (
                  <p className="text-xs text-brand-600 mb-4 line-clamp-2">{project.descripcion}</p>
                )}
                <div className="mt-auto flex items-center justify-end gap-2 pt-2">
                  <Link to="/plano" onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" icon={MapIcon} className="border-brand-200 text-brand-800 hover:bg-brand-50">
                      Ver plano
                    </Button>
                  </Link>
                  {canEdit && (
                    <Button
                      size="sm"
                      icon={PencilIcon}
                      onClick={(e) => handleOpenEdit(e, project)}
                      className="border-brand-700 text-brand-700 hover:bg-brand-50"
                    >
                      Editar
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}