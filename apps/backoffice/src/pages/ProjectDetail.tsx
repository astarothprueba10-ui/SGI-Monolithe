import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  Building2Icon,
  MapIcon,
  MapPinIcon,
  Maximize2Icon,
  PencilIcon
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import { EmptyState } from '../components/ui/Feedback';
import { useAuth } from '../contexts/AuthContext';
import { coreService } from '../services/coreService';
import { ProjectFormModal } from '../components/projects/ProjectFormModal';
import { ProjectSummaryTab } from '../components/projects/detail/ProjectSummaryTab';
import { ProjectStagesTab } from '../components/projects/detail/ProjectStagesTab';
import { ProjectZonesTab } from '../components/projects/detail/ProjectZonesTab';
import { ProjectBlocksTab } from '../components/projects/detail/ProjectBlocksTab';
import { ProjectLotsTab } from '../components/projects/detail/ProjectLotsTab';
import { number } from '../utils/format';
import type { ProyectoResponse } from '../types/core';

export function ProjectDetail() {
  const { idProyecto } = useParams<{ idProyecto: string }>();
  const { can } = useAuth();
  const canEdit = can('projects.edit');
  const canViewLots = can('lots.view');

  const [project, setProject] = useState<ProyectoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState('resumen');
  const [editModalOpen, setEditModalOpen] = useState(false);

  const loadProject = useCallback(async () => {
    if (!idProyecto || Number.isNaN(Number(idProyecto))) {
      setError('Identificador de proyecto inválido');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await coreService.getProjectById(Number(idProyecto));
      setProject(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los detalles del proyecto');
    } finally {
      setLoading(false);
    }
  }, [idProyecto]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  const handleEditSuccess = async () => {
    await loadProject();
  };

  const tabItems = useMemo(() => {
    const items = [
      { id: 'resumen', label: 'Resumen' },
      { id: 'etapas', label: 'Etapas' },
      { id: 'zonas', label: 'Zonas' },
      { id: 'manzanas', label: 'Manzanas' }
    ];
    if (canViewLots) {
      items.push({ id: 'lotes', label: 'Lotes' });
    }
    return items;
  }, [canViewLots]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-brand-100 bg-white">
        <p className="text-sm font-medium text-brand-600">Cargando proyecto desde core-service...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="space-y-4">
        <Link
          to="/proyectos"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-900"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Volver a proyectos
        </Link>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">
          <h3 className="font-semibold text-base mb-1">No se pudo cargar el proyecto</h3>
          <p className="text-sm">{error ?? 'Proyecto no encontrado'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Modal de edición */}
      <ProjectFormModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSuccess={handleEditSuccess}
        project={project}
      />

      {/* Navegación de retorno */}
      <Link
        to="/proyectos"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-900 transition-colors"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Volver a proyectos
      </Link>

      {/* Cabecera del Proyecto */}
      <Card className="border-[#4cbb17] shadow-card bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <Building2Icon className="h-6 w-6 text-brand-600 shrink-0" />
              <h1 className="text-2xl font-bold text-brand-900 truncate">
                {project.nombre}
              </h1>
              <span className="inline-flex items-center rounded-md border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
                {project.codigo}
              </span>
              {project.activo ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#4cbb17]/40 bg-[#4cbb17]/10 px-3 py-0.5 text-xs font-semibold text-[#2d7a0c]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#4cbb17]"></span>
                  {project.nombreEstadoProyecto ?? 'Activo'}
                </span>
              ) : (
                <Badge tone="neutral">
                  {project.nombreEstadoProyecto ?? 'Inactivo'}
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-brand-500 pt-1">
              <span className="flex items-center gap-1">
                <MapPinIcon className="h-3.5 w-3.5 text-brand-400 shrink-0" />
                {project.distrito ? `${project.distrito}, ${project.provincia ?? ''}` : 'Sin ubicación'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Maximize2Icon className="h-3.5 w-3.5 text-brand-400 shrink-0" />
                {project.areaTotalM2 ? `${number(project.areaTotalM2)} m²` : '—'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link to="/plano">
              <Button icon={MapIcon} className="border-brand-200 text-brand-800 hover:bg-brand-50">
                Ver plano
              </Button>
            </Link>
            {canEdit && (
              <Button
                icon={PencilIcon}
                onClick={() => setEditModalOpen(true)}
                className="bg-brand-900 text-white hover:bg-brand-800 border border-[#4cbb17]/40 shadow-sm"
              >
                Editar
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Tabs de Navegación del Proyecto */}
      <Tabs
        active={activeTab}
        onChange={setActiveTab}
        items={tabItems}
      />

      {/* Contenido según tab activo */}
      <div className="mt-4">
        {activeTab === 'resumen' && <ProjectSummaryTab project={project} />}
        {activeTab === 'etapas' && <ProjectStagesTab project={project} />}
        {activeTab === 'zonas' && <ProjectZonesTab project={project} />}
        {activeTab === 'manzanas' && <ProjectBlocksTab project={project} />}
        {activeTab === 'lotes' && canViewLots && <ProjectLotsTab project={project} />}
      </div>
    </div>
  );
}
