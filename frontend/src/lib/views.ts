export const VIEWS = ['overview', 'globe', 'conjunctions', 'analytics', 'data'] as const
export type ViewId = (typeof VIEWS)[number]
