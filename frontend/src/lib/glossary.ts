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
  'long encounter': 'A slow pass, under 0.1 km/s. The two objects stay close for a long time, and Pc is not reliable: it may be too high or too low.',
  // The basics a first-time visitor meets on the other pages, so Ask ORCA can explain them too.
  conjunction: 'Two objects passing close to each other. ORCA lists every pass that comes closer than the report distance during the time you search.',
  'report distance': 'The distance that counts as a close approach. Every pass closer than this is listed, and the value is shown with every result.',
  'relative velocity': 'How fast the two objects move compared with each other at their closest approach. Most passes are several km/s, and anything under 0.1 km/s is a long encounter.',
  'risk tier': 'The label a pair gets from its Pc: CRITICAL, HIGH, MEDIUM, LOW or NEGLIGIBLE. Like Pc, it depends on the assumed uncertainty, so it ranks pairs and is not a forecast.',
  screening: 'The fast first pass of a search. ORCA works out every object’s position at short, fixed steps and keeps only the pairs that come near each other, so the exact calculation runs on far fewer pairs.',
  epoch: 'The moment a TLE describes. Positions are most accurate close to that moment, and a TLE’s age is the time since its epoch.',
  'NORAD ID': 'The catalog number every tracked object is given, for example 25544 for the ISS. It stays the same even when an object’s name changes.',
  CelesTrak: 'The free public website that republishes the US Space Force’s TLEs. ORCA downloads its catalog from there.',
  'orbit regime': 'The kind of orbit an object is in. LEO stays below 2,000 km, GEO circles at about 35,786 km once a day, HEO is strongly stretched or sits higher than GEO, and MEO covers the rest.',
} as const

export type GlossaryTermKey = keyof typeof GLOSSARY
