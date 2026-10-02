import { getCatalogSummary } from '@/api/endpoints'
import { useAsync } from './useAsync'

/** Counts over the whole stored catalog. Refetched when the stored object count changes (the server caches per catalog version). */
export function useCatalogSummary(storedCount: number | null) {
  return useAsync((signal) => getCatalogSummary({ signal }), [storedCount])
}
