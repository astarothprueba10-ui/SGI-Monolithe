import { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRightIcon } from 'lucide-react';
import { NavigationContext } from '../../contexts/NavigationContext';
import { navigationTrail, type TrailItem } from '../../lib/navigationTrail';
import { cn } from '../../utils/cn';

function BreadcrumbEntry({ item, current }: { item: TrailItem; current: boolean }) {
  const style = 'min-w-0 max-w-[14rem] truncate text-[12px] sm:text-[13px]';
  return <li className="flex min-w-0 items-center gap-1.5">
    <ChevronRightIcon className="h-3.5 w-3.5 shrink-0 text-brand-300" aria-hidden="true" />
    {item.to && !current ? <Link className={cn(style, 'text-brand-500 hover:underline')} to={item.to} title={item.label}>{item.label}</Link>
      : <span className={cn(style, 'font-medium text-brand-800')} aria-current={current ? 'page' : undefined} title={item.label}>{item.label}</span>}
  </li>;
}

/** Ubicación del módulo, registro y pestaña con enlaces a sus niveles anteriores. */
export function Breadcrumbs({ className }: { className?: string }) {
  const { pathname } = useLocation(); const navigation = useContext(NavigationContext);
  const items = navigationTrail(pathname, navigation?.detail, navigation?.section);
  return <nav aria-label="Ruta de navegación" className={cn('min-w-0', className)}>
    <ol className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
      <li><Link to="/" className="text-[12px] text-brand-500 hover:underline sm:text-[13px]">SIGI</Link></li>
      {items.slice(1).map((item, index) => <BreadcrumbEntry key={`${index}:${item.label}`} item={item} current={index === items.length - 2} />)}
    </ol>
  </nav>;
}
