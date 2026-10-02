import type { ObjectType } from '@/api/types'

export const OBJECT_TYPES: readonly ObjectType[] = ['payload', 'rocket_body', 'debris']

/**
 * The catalog stores no status or type field, so these come from the object NAME (Celestrak names debris "... DEB" and
 * rocket bodies "... R/B"). Labels say "payloads", not "active satellites": whether a payload still works is not known.
 */
export const OBJECT_TYPE_LABEL: Record<ObjectType, string> = {
  payload: 'Payloads',
  rocket_body: 'Rocket bodies',
  debris: 'Debris',
}

export const OBJECT_TYPE_SINGULAR: Record<ObjectType, string> = {
  payload: 'Payload',
  rocket_body: 'Rocket body',
  debris: 'Debris',
}
