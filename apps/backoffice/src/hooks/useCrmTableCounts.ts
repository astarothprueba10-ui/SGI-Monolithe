import { useCallback, useEffect, useState } from 'react';
import { loadCrmTableCounts, type CrmTableCounts, type LeadTableFilters, type TableRange } from '../lib/crmTableQueries';

/** Invalida conteos tras cambios y descarta respuestas de filtros anteriores. */
export function useCrmTableCounts(filters: LeadTableFilters, range: TableRange, buyerQuery: string) {
  const [counts, setCounts] = useState<CrmTableCounts>({}); const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    let current = true;
    setCounts({}); setLoading(true);
    const timer = window.setTimeout(() => {
      void loadCrmTableCounts(filters, range, buyerQuery).then(result => {
        if (current) { setCounts(result); setLoading(false); }
      });
    }, 120);
    return () => { current = false; window.clearTimeout(timer); };
  }, [filters, range, buyerQuery, revision]);
  return { counts, loading, refresh };
}
