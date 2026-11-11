import { Link } from 'react-router-dom';
import { ClipboardListIcon, ArrowLeftIcon } from 'lucide-react';
import { Card } from '../ui/Card';

export function PortalFeaturePending({
  titulo
}: {titulo:string}) {
  return (
    <Card as="section" className="mx-auto max-w-2xl p-8">
      <ClipboardListIcon className="mb-4 h-9 w-9 text-slateux-400"/>
      <h1 className="text-xl font-semibold text-ink-800">{titulo}</h1>
      <p className="mt-3 text-sm leading-relaxed text-slateux-600">
        Esta sección está en integración con los datos reales de su cuenta.
        No se muestran movimientos, documentos ni importes de demostración
        como si correspondieran a su compra.
      </p>
      <Link to="/portal" className="mt-6 inline-flex items-center gap-2 rounded-field bg-ink-800 px-4 py-2 text-sm font-semibold text-white">
        <ArrowLeftIcon className="h-4 w-4"/>Volver al resumen de mi compra
      </Link>
    </Card>
  );
}
