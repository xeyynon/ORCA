/** Plain-language meanings for the terms the conjunction pages use. One list, so a term reads the same everywhere. */
export const GLOSSARY = {
  Pc: 'Probability of collision. This is the chance that the two objects hit each other, based on the assumed position uncertainty. It is used to rank pairs and is not a forecast.',
  TCA: 'Time of closest approach. This is the moment when the two objects are nearest to each other.',
  TLE: 'Two-line element set. This is the public orbit description that every position here is calculated from. It goes out of date within days.',
  SGP4: 'The standard simplified model used to turn a TLE into a position at a given time.',
  'miss distance': 'How far apart the two objects are at their closest approach.',
  uncertainty: 'How far the true position might be from the calculated one (1 sigma). TLEs don’t publish this, so ORCA measures it from successive TLEs.',
  Mahalanobis: 'The miss distance measured in units of the combined uncertainty. A small value means the objects could really touch.',
  'hard-body radius': 'The combined physical size of the two objects. This is the target that the miss distance is compared with.',
  'long encounter': 'A slow pass, under 0.1 km/s. The two objects stay close for a long time, and Pc can be several times too low.',
} as const

export type GlossaryTermKey = keyof typeof GLOSSARY
