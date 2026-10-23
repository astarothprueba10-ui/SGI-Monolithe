import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileQuestionIcon, ArrowLeftIcon, HomeIcon } from 'lucide-react';
import { Button } from '../components/ui/Button';

/**
 * 404 Not Found Page for Portal Cliente
 */
export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 mb-6 shadow-sm">
        <FileQuestionIcon className="w-8 h-8" />
      </div>

      <span className="text-xs font-semibold tracking-wider uppercase text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
        Error 404
      </span>

      <h1 className="text-2xl font-bold text-slate-900 mt-4 mb-2">
        Página no encontrada
      </h1>

      <p className="text-sm text-slate-600 max-w-md mb-8">
        La sección que estás buscando no existe o fue reubicada.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          variant="outline"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Regresar
        </Button>

        <Button
          variant="primary"
          onClick={() => navigate('/portal')}
          className="flex items-center gap-2"
        >
          <HomeIcon className="w-4 h-4" />
          Ir a Mi Portal
        </Button>
      </div>
    </div>
  );
}
