/** Plain-language meanings for the terms the conjunction pages use. One list, so a term reads the same everywhere. */
export const GLOSSARY = {
  Pc: 'Probability of collision: the chance the two objects hit, given the assumed position uncertainty. It ranks pairs; it is not a forecast.',
  TCA: 'Time of closest approach: the moment the two objects are nearest each other.',
  TLE: 'Two-line element set: the public orbit description every position here is computed from. It goes out of date within days.',
  SGP4: 'The standard simplified model that turns a TLE into a position at a given time.',
  'miss distance': 'How far apart the two objects are at closest approach.',
  uncertainty: 'How far the true position may be from the computed one (1 sigma). TLEs publish none, so ORCA measures it from successive TLEs.',
  Mahalanobis: 'The miss distance measured in units of the combined uncertainty. Small means the objects could really touch.',
  'hard-body radius': 'The combined physical size of the two objects: the target the miss distance is compared with.',
  'long encounter': 'A slow pass (under 0.1 km/s). The two stay close for a long time and Pc can be several times too low.',
} as const

export type GlossaryTermKey = keyof typeof GLOSSARY
