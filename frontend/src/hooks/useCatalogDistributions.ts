import { useMemo } from 'react'
import { getCatalogDistributions } from '@/api/endpoints'
import { columnsToRows } from '@/lib/distributions'
import { useAsync } from './useAsync'

/**
 * Per-object columns for the WHOLE stored catalog, rebuilt as chart rows. Refetched when the stored object count
 * changes (the server caches per catalog version). `rows` is null while loading, on failure, or when the response is
 * malformed: the Analytics view then falls back to the loaded rows and says so.
 */
export function useCatalogDistributions(storedCount: number | null) {
  const columns = useAsync((signal) => getCatalogDistributions({ signal }), [storedCount])
  const rows = useMemo(() => (columns.data ? columnsToRows(columns.data) : null), [columns.data])
  return { rows, status: columns.status, error: columns.error, reload: columns.reload, malformed: columns.data !== null && rows === null }
}
