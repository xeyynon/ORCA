/**
 * "Ask ORCA": the deterministic intent engine behind the conversational panel (MD/design_system_v2.md, Conversational UI).
 * Pure: text in, a reply out, from a read-only context. Every number in a reply comes from that context; a value it does
 * not hold is said to be "not loaded yet", never estimated. Only an `unknown` reply may be passed on to the optional AI.
 */
import { fixed, integer } from './format'
import { expectedRuntimeMinutes } from './conjunctionSummary'
import { STALE_MEDIAN_DAYS } from './staleness'
import { VIEW_LABEL } from './views'
import type { ViewId } from './views'

export type RegimeKey = 'LEO' | 'MEO' | 'GEO' | 'HEO'
const REGIME_KEYS: readonly RegimeKey[] = ['LEO', 'MEO', 'GEO', 'HEO']
const REGIME_NAME: Record<RegimeKey, string> = {
  LEO: 'low Earth orbit',
  MEO: 'medium Earth orbit',
  GEO: 'geosynchronous orbit',
  HEO: 'highly elliptical orbit',
}

/** A quick reply: a real button that sends `say` (or its label) as if typed, so every chip goes through the same engine. */
export interface QuickReply { label: string; say?: string }

export type AskAction =
  | { kind: 'go'; view: ViewId }
  | { kind: 'showObject'; query: string }
  | { kind: 'runSearch'; horizonDays: number }
  | { kind: 'openSavedExample' }
  | { kind: 'setTheme'; theme: 'light' | 'dark' }
  | { kind: 'startTour' }
  | { kind: 'showShortcuts' }

export type AskIntent =
  | 'help' | 'thanks' | 'showObject' | 'go' | 'count' | 'freshness' | 'define' | 'conjunctions'
  | 'runSearch' | 'savedExample' | 'theme' | 'tour' | 'shortcuts' | 'unknown'

export interface AskReply { intent: AskIntent; text: string; chips?: QuickReply[]; action?: AskAction }

export interface AskContext {
  view: ViewId
  theme: 'light' | 'dark'
  /** Objects in the stored catalog (the whole of it). Null until known. */
  total: number | null
  /** Rows the app has loaded for the views that draw every object (a subset). Null until loaded. */
  loaded: number | null
  /** Counts by orbit regime, and what they cover: the whole stored catalog, or only the loaded rows. */
  regimes: { counts: Record<RegimeKey, number>; scope: 'catalog' | 'loaded'; of: number | null; unclassified?: number | null } | null
  /** Element-set ages over the loaded rows, in days, and when the API last stored a Celestrak fetch (formatted UTC). */
  ages: { medianDays: number | null; newestDays: number | null; oldestDays: number | null; lastRefreshUtc: string | null }
  /** The conjunction search held by the workspace: its answer sentence when there is a result, and where it came from. */
  conjunction: {
    phase: 'idle' | 'running' | 'done' | 'failed'
    source: 'live' | 'saved'
    headline: string | null
    detail: string | null
    error: string | null
  }
  views: readonly ViewId[]
  glossary: Readonly<Record<string, string>>
}

// ---------------------------------------------------------------------------------------------------------------------
// Vocabulary

/** Extra ways people name each glossary term. The term's own name always matches too. */
const TERM_ALIASES: Record<string, readonly string[]> = {
  TLE: ['tle', 'tles', 'two-line element', 'two line element', 'two-line elements', 'two line elements', 'two-line element set', 'two line element set', 'element set', 'element sets'],
  Pc: ['pc', 'p c', 'probability of collision', 'collision probability'],
  TCA: ['tca', 'time of closest approach'],
  SGP4: ['sgp4', 'sgp-4', 'sgp 4'],
  'miss distance': ['miss distance', 'miss-distance', 'miss distances'],
  uncertainty: ['uncertainty', 'position uncertainty', 'uncertainties'],
  Mahalanobis: ['mahalanobis', 'mahalanobis distance'],
  'hard-body radius': ['hard-body radius', 'hard body radius', 'hbr'],
  'long encounter': ['long encounter', 'long encounters', 'long-encounter', 'long-encounters'],
}

const VIEW_ALIASES: Record<ViewId, readonly string[]> = {
  home: ['home', 'mission control', 'home page', 'start', 'start page', 'dashboard', 'landing page'],
  overview: ['overview', 'catalog', 'catalogue', 'catalog table', 'object list', 'table'],
  globe: ['globe', 'map', 'earth', '3d', '3d view', 'globe view'],
  conjunctions: ['conjunctions', 'conjunction', 'conjunctions page', 'conjunction search page'],
  analytics: ['analytics', 'charts', 'statistics', 'stats', 'graphs'],
  data: ['data', 'data page', 'refresh page', 'catalog status'],
  health: ['health', 'api health', 'health page', 'health check', 'api status', 'api', 'system status'],
  reports: ['reports', 'report', 'reports page', 'pdf', 'make a report', 'generate a report', 'print'],
}

/** Starter chips for the first-open greeting, picked for what the current view is about. */
const STARTERS: Record<ViewId, readonly string[]> = {
  home: ['How many objects are there?', 'Is the data fresh?', 'Any close approaches?', 'Take the tour'],
  overview: ['How many in LEO?', 'How old is the data?', 'Find the ISS', 'Open the globe'],
  globe: ['Find the ISS', 'How many in GEO?', 'What is a TLE?', 'Any close approaches?'],
  conjunctions: ['Any close approaches?', 'What is Pc?', 'What is TCA?', 'Explore the saved example'],
  analytics: ['How many objects by orbit?', 'How old is the data?', 'What is SGP4?', 'Open the globe'],
  data: ['How old is the data?', 'How many objects are there?', 'What is a TLE?', 'Keyboard shortcuts'],
  reports: ['Any close approaches?', 'How old is the data?', 'What is Pc?', 'What is TCA?'],
  health: ['Is the data fresh?', 'How many objects are there?', 'How old is the data?', 'Keyboard shortcuts'],
}

const UNKNOWN_CHIPS: readonly string[] = ['What can you do?', 'How many objects are there?', 'Is the data fresh?', 'What is Pc?']

const chips = (labels: readonly string[]): QuickReply[] => labels.map((label) => ({ label }))

const WORD_NUMBER: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 }

// ---------------------------------------------------------------------------------------------------------------------
// Text helpers

/** Lower case, straight quotes, punctuation to spaces (hyphens kept), one space between words. */
export function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”"]/g, ' ')
    .replace(/[?!,;:()[\]{}]/g, ' ')
    .replace(/(?<!\d)\.|\.(?!\d)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const hasPhrase = (t: string, phrase: string) => new RegExp(`(^|[^a-z0-9-])${escapeRe(phrase)}($|[^a-z0-9-])`).test(t)
const stripArticles = (t: string) => t.replace(/^(an?|the)\s+/, '').trim()
const days1 = (v: number | null) => `${fixed(v, 1)} ${v === 1 ? 'day' : 'days'}`

/** The glossary term a text mentions (longest alias wins), among the terms the context's glossary holds. */
export function findTerm(t: string, glossary: Readonly<Record<string, string>>): string | null {
  let best: { term: string; len: number } | null = null
  for (const term of Object.keys(glossary)) {
    for (const alias of [term.toLowerCase(), ...(TERM_ALIASES[term] ?? [])]) {
      if (hasPhrase(t, alias) && (!best || alias.length > best.len)) best = { term, len: alias.length }
    }
  }
  return best?.term ?? null
}

/** The view a phrase names, if it is nothing but a view's name (with an optional "page"/"view"/"tab"). */
function viewNamed(target: string): ViewId | null {
  const clean = stripArticles(target).replace(/\s+(page|view|tab|screen)$/, '').trim()
  for (const [view, aliases] of Object.entries(VIEW_ALIASES) as [ViewId, readonly string[]][]) {
    if (clean === view || aliases.includes(clean)) return view
  }
  return null
}

function regimesNamed(t: string): RegimeKey[] {
  const out: RegimeKey[] = []
  if (/\bleo\b|\blow earth\b|\blow orbit\b/.test(t)) out.push('LEO')
  if (/\bmeo\b|\bmedium earth\b|\bmid(dle)? earth\b/.test(t)) out.push('MEO')
  if (/\bgeo\b|\bgeostationary\b|\bgeosynchronous\b/.test(t)) out.push('GEO')
  if (/\bheo\b|\bhighly elliptical\b|\belliptical\b/.test(t)) out.push('HEO')
  return out
}

/** Days asked for in a search request: a number, a word number, "a week", "24 hours". Null when none is named. */
export function horizonFrom(t: string): number | null {
  const n = /\b(\d+(?:\.\d+)?)\s*-?\s*days?\b/.exec(t)
  if (n) return Number(n[1])
  const w = /\b(one|two|three|four|five|six|seven|eight|nine|ten)\s*-?\s*days?\b/.exec(t)
  if (w) return WORD_NUMBER[w[1]]
  if (/\b(a|one|1)\s*-?\s*weeks?\b/.test(t)) return 7
  if (/\b(\d+)\s*weeks\b/.test(t)) return Number(/\b(\d+)\s*weeks\b/.exec(t)![1]) * 7
  if (/\b(a|one|1)\s*-?\s*day\b|\b24\s*-?\s*h(ours?|rs?)?\b|\btomorrow\b/.test(t)) return 1
  return null
}

// ---------------------------------------------------------------------------------------------------------------------
// Replies

const CAPABILITIES =
  'I answer using only what ORCA has loaded, so no AI is needed. I can find an object and show it on the globe ("find ISS", "show 25544"). ' +
  'I can also open a page ("open analytics"), count objects ("how many in LEO?"), tell you how old the data is and explain a term ("what is Pc?"). ' +
  'On top of that, I can report the conjunction result, run a search or open the saved example, switch the theme, start the tour and list the keyboard shortcuts.'

/** The first-open greeting, with four starters for the view the user is on. */
export function greeting(view: ViewId): AskReply {
  return {
    intent: 'help',
    text: `You can ask me about what ORCA has loaded, such as objects, the age of the data, terms and close approaches. All of my answers come from the app's own data. You are currently on ${VIEW_LABEL[view]}.`,
    chips: chips(STARTERS[view]),
  }
}

function help(ctx: AskContext): AskReply {
  return { intent: 'help', text: CAPABILITIES, chips: chips(STARTERS[ctx.view]) }
}

/** What the engine says when it cannot place a question. Also the fallback when the AI is off or fails. */
export function unknownReply(prefix = "I can't answer that using ORCA's data."): AskReply {
  return { intent: 'unknown', text: `${prefix} ${CAPABILITIES}`, chips: chips(UNKNOWN_CHIPS) }
}

function define(term: string, ctx: AskContext): AskReply {
  const terms = Object.keys(ctx.glossary)
  const i = terms.indexOf(term)
  const others = [terms[(i + 1) % terms.length], terms[(i + 2) % terms.length]].filter((x) => x && x !== term)
  return {
    intent: 'define',
    text: `${term}: ${ctx.glossary[term]}`,
    chips: [...others.map((o) => ({ label: `What is ${o}?` })), { label: 'Any close approaches?' }],
  }
}

function count(ctx: AskContext, asked: RegimeKey[], byRegime: boolean): AskReply {
  const analytics = { label: 'Open Analytics' }
  if (!byRegime && asked.length === 0) {
    if (ctx.total === null && ctx.loaded === null) return { intent: 'count', text: 'The object count has not loaded yet.' }
    if (ctx.total === null) return { intent: 'count', text: `The app has loaded ${integer(ctx.loaded)} objects. The total for the stored catalog has not loaded yet.`, chips: [analytics] }
    const part = ctx.loaded !== null && ctx.loaded < ctx.total ? ` The pages that draw every object have loaded ${integer(ctx.loaded)} of them.` : ''
    return { intent: 'count', text: `There are ${integer(ctx.total)} objects in our stored catalog.${part}`, chips: [{ label: 'How many objects by orbit?' }, analytics] }
  }
  const r = ctx.regimes
  if (!r) return { intent: 'count', text: 'The counts by orbit have not loaded yet.' }
  const keys = asked.length ? asked : REGIME_KEYS
  const lines = keys.map((k) => `${k} (${REGIME_NAME[k]}): ${integer(r.counts[k] ?? 0)}`)
  const scope = r.scope === 'catalog'
    ? `This covers the whole stored catalog${r.of !== null ? ` of ${integer(r.of)} objects` : ''}.`
    : `This only covers the ${r.of !== null ? `${integer(r.of)} ` : ''}loaded objects, because the counts for the whole catalog have not loaded yet.`
  const unclassified = r.unclassified ? ` ${integer(r.unclassified)} couldn't be classified.` : ''
  return { intent: 'count', text: `${lines.join('. ')}. ${scope}${unclassified}`, chips: [analytics, { label: 'Open the globe' }] }
}

function freshness(ctx: AskContext): AskReply {
  const a = ctx.ages
  const refresh = a.lastRefreshUtc ? ` The API last saved a Celestrak fetch at ${a.lastRefreshUtc}.` : ''
  const replyChips = [{ label: 'Open Data' }, { label: 'What is a TLE?' }]
  if (a.medianDays === null) return { intent: 'freshness', text: `The age of the data has not loaded yet.${refresh}`, chips: replyChips }
  const over = ctx.loaded !== null ? `, measured over the ${integer(ctx.loaded)} loaded objects` : ''
  const range = a.newestDays !== null && a.oldestDays !== null ? ` The newest is ${days1(a.newestDays)} old and the oldest is ${days1(a.oldestDays)} old.` : ''
  const verdict = a.medianDays > STALE_MEDIAN_DAYS
    ? `That is past ORCA's ${STALE_MEDIAN_DAYS}-day threshold, so please treat every figure as a rough guide.`
    : `That is within ORCA's ${STALE_MEDIAN_DAYS}-day threshold. Accuracy still drops within days, so the figures should only be treated as a rough guide.`
  return { intent: 'freshness', text: `The orbital data (TLEs) has a median age of ${days1(a.medianDays)}${over}.${range} ${verdict}${refresh}`, chips: replyChips }
}

function conjunctions(ctx: AskContext): AskReply {
  const c = ctx.conjunction
  const offer = chips(['Run a search', 'Explore the saved example'])
  if (c.phase === 'running') {
    return { intent: 'conjunctions', text: 'A conjunction search is running right now. It will keep going while you use other pages, and I will have the answer once it finishes.', chips: chips(['Open Conjunctions']) }
  }
  if (c.phase === 'done' && c.headline) {
    const from = c.source === 'saved' ? 'This comes from the saved example run, which is stored with the app and is not live' : 'This comes from the search you ran'
    const extra = c.source === 'saved' ? chips(['Open Conjunctions', 'Run a search']) : chips(['Open Conjunctions', 'What is Pc?'])
    return { intent: 'conjunctions', text: `${from}. ${c.headline}.${c.detail ? ` ${c.detail}` : ''} Pc is used to rank pairs. It is NOT a forecast.`, chips: extra }
  }
  if (c.phase === 'failed') {
    return { intent: 'conjunctions', text: `The last conjunction search failed${c.error ? `: ${c.error}` : ''}. There is no result to report.`, chips: offer }
  }
  return { intent: 'conjunctions', text: 'No conjunction search has been run in this session, so there is no result to report yet.', chips: offer }
}

function runSearch(ctx: AskContext, requested: number | null): AskReply {
  if (ctx.conjunction.phase === 'running') {
    return { intent: 'runSearch', text: 'A conjunction search is already running. Starting another one would cancel it.', chips: chips(['Open Conjunctions']) }
  }
  const n = requested ?? 1
  if (!Number.isInteger(n) || n < 1 || n > 7) {
    return { intent: 'runSearch', text: `A search can cover anywhere from 1 to 7 days, and ${requested} is outside of that.`, chips: chips(['Run a 1-day search', 'Run a 7-day search']) }
  }
  const est = ctx.total !== null ? ` For ${integer(ctx.total)} objects expect roughly ${integer(Math.max(1, expectedRuntimeMinutes(ctx.total, n)))} min, based on a laptop estimate.` : ''
  return {
    intent: 'runSearch',
    text: `Starting a ${n}-day conjunction search over the stored catalog.${est} It will keep running while you use other pages. Ask "any close approaches?" once it finishes.`,
    action: { kind: 'runSearch', horizonDays: n },
  }
}

function savedExample(ctx: AskContext): AskReply {
  if (ctx.conjunction.phase === 'running') {
    return { intent: 'savedExample', text: 'A live search is already running, and the example would not replace it. Open Conjunctions to keep an eye on it.', chips: chips(['Open Conjunctions']) }
  }
  return {
    intent: 'savedExample',
    text: 'Opening the saved example run. This is a real search that is stored with the app and is not live. It is labelled as an example on every screen.',
    action: { kind: 'openSavedExample' },
  }
}

function go(view: ViewId, ctx: AskContext): AskReply {
  if (!ctx.views.includes(view)) return unknownReply()
  if (view === ctx.view) return { intent: 'go', text: `You are already on ${VIEW_LABEL[view]}.` }
  return { intent: 'go', text: `Opening ${VIEW_LABEL[view]}.`, action: { kind: 'go', view } }
}

// ---------------------------------------------------------------------------------------------------------------------
// Matchers. Order matters: specific intents first, the catch-all object search last.

const GREETING = /^(hi|hello|hey|hiya|howdy|yo|greetings|good (morning|afternoon|evening))( there| orca)?$/
const CAPABILITY_Q = /\b(what can you do|what do you do|what can i (ask|do|say)|how do(es)? (this|it|you) work|who are you|what are you|what is orca|what's orca|how can you help|commands)\b/
const HELP_WORD = /^(help|help me|\?|options|menu)$/
const THANKS = /^(thanks|thank you|thank you very much|thanks a lot|thx|ty|cheers|great|ok|okay|cool|nice|got it)( orca)?$/
const SHORTCUTS = /\b(keyboard )?shortcuts?\b|\bhot ?keys?\b|\bkey ?bindings?\b|\bkeyboard\b/
const TOUR = /\b(tour|walkthrough|walk me through|onboarding|show me around|guide me)\b/
const DEFINE_Q = /^(what('s| is| are| does| do)?|whats|define|definition( of)?|meaning( of)?|explain|tell me (about|what)|describe|what is meant by)\b|\b(mean|means|meaning|stand for|stands for)$/
const SAVED = /\b(saved|example|sample|demo)\b/
const SEARCH_WORD = /\b(search|screen|screening|scan)\b/
const RUN_SEARCH = /\b(run|re-?run|start|launch|kick off|begin|do|new|fresh|live|another)\b.*\b(search|screening|screen|scan)\b/
const CONJ_WORD = /\b(conjunctions?|approach(es)?|collisions?|risks?|risky|near[- ]miss(es)?|danger(ous)?|critical|high[- ]risk|close calls?)\b/
const VIEW_VERB = /^(?:please |can you |could you )?(?:open|go to|goto|go|take me to|switch to|navigate to|bring up|show(?: me)?|view|jump to|back to|go back to|return to)\s+(.+)$/
const FRESH = /\bhow old\b|\b(data|tle|tles|element sets?|catalog)\s+ages?\b|\bage of\b|\bages?\b.*\b(data|tles?|element sets?)\b|\bfresh(ness)?\b|\bstale\b|\bup[ -]to[ -]date\b|\bout[ -]of[ -]date\b|\boutdated\b|\blast (update|updated|refresh|refreshed|fetch|fetched)\b|\bwhen (was|is|were|did)\b.*\b(updated?|refresh(ed)?|fetch(ed)?)\b/
const COUNT_Q = /\bhow many\b|\bcount\b|\bnumber of\b|\btotal\b|\btally\b|\bbreakdown\b|\b(by|per) (orbit|regime)\b|\bdistribution\b|\bsplit\b/
const BY_REGIME = /\b(by|per|each|every) (orbit|regime)s?\b|\bregimes\b|\bbreakdown\b|\bdistribution\b|\bsplit\b/
// Run on the original text so a name keeps its case. Kept as one regex: verb, then whatever is left is the object.
const OBJECT_VERB = /^(?:please\s+|can you\s+|could you\s+|help me\s+)?(?:show(?:\s+me)?|find|locate|track|where(?:'s|’s|\s+is|\s+are)|search(?:\s+for)?|look\s*up|zoom\s+(?:to|in\s+on)|focus(?:\s+on)?|highlight|pick|select)\s+(.+)$/i

/** The object a request names, cleaned of filler: "show me the satellite NOAA 19 on the globe" -> "NOAA 19". */
export function objectQuery(raw: string): string | null {
  const m = OBJECT_VERB.exec(raw.trim())
  let q = m ? m[1] : /^#?\d{1,9}$/.test(raw.trim()) ? raw.trim() : null
  if (q === null) return null
  q = q.replace(/[?!.]+$/, '').trim()
  q = q.replace(/\s+(?:on|in)\s+(?:the\s+)?(?:globe|map|3d view)$/i, '').replace(/\s+(?:please|now|for me)$/i, '').trim()
  for (let i = 0; i < 3; i++) {
    q = q.replace(/^(?:me\s+|the\s+|an?\s+|satellite\s+|object\s+|sat\s+|norad(?:\s+cat(?:alog)?)?(?:\s+(?:id|number|no|#))?\s*|id\s+|#)/i, '').trim()
  }
  q = q.replace(/^#/, '').trim()
  return /^(the|an?|me|it|object|satellite|one)$/i.test(q) ? '' : q
}

/** The one entry point: a reply for what the user typed. */
export function askOrca(input: string, ctx: AskContext): AskReply {
  const reply = match(input, ctx)
  // A chip that would open the view you are already on is a dead end: drop it.
  const here = `open ${VIEW_LABEL[ctx.view].toLowerCase()}`
  const kept = reply.chips?.filter((c) => (c.say ?? c.label).toLowerCase() !== here && (c.say ?? c.label).toLowerCase() !== here.replace('open ', 'open the '))
  return kept === undefined ? reply : { ...reply, chips: kept }
}

/**
 * A question that asks for an explanation, not a figure: "why does an old TLE make a forecast less reliable?", "how does
 * screening work?". Keyword intents would answer these with an unrelated canned figure (a TLE question mentioning
 * "close approach" got the conjunction summary), so they go to the AI path when it is on, and otherwise get the plain
 * "I can't answer that" reply. "how many", "how old" and "explain Pc" are not matched: they have exact answers.
 */
const OPEN_Q = /^(?:(?:please |can you |could you )?explain why|why|how (?:does|do|did|is|are|can|could|would|will|should)|what (?:happens|would happen|causes|makes|if)|is it (?:safe|true|possible|likely)|should (?:i|we)|could (?:a|an|the|two|it))\b/

function match(input: string, ctx: AskContext): AskReply {
  const raw = input.trim()
  const t = normalize(raw)
  if (!t) return help(ctx)
  if (GREETING.test(t)) return { ...help(ctx), text: `Hello! ${CAPABILITIES}` }
  if (THANKS.test(t)) return { intent: 'thanks', text: 'You are welcome!' }
  if (CAPABILITY_Q.test(t) || HELP_WORD.test(t)) return help(ctx)

  if (SHORTCUTS.test(t)) return { intent: 'shortcuts', text: 'Opening the keyboard shortcuts. Pressing "." opens this panel, and Esc closes it.', action: { kind: 'showShortcuts' } }

  const themeWord = /\b(dark|light)\b/.exec(t)?.[1] as 'dark' | 'light' | undefined
  const themeAsked = /\b(theme|mode|colou?rs?)\b/.test(t) || /^(go|switch( to)?|use|turn( on)?|make it|set)\s+(dark|light)$/.test(t) || /^(dark|light)$/.test(t)
  if (themeAsked && (themeWord || /\b(toggle|switch|change|flip|other)\b/.test(t))) {
    const target = themeWord ?? (ctx.theme === 'dark' ? 'light' : 'dark')
    if (target === ctx.theme) return { intent: 'theme', text: `The theme is already ${target}.` }
    return { intent: 'theme', text: `Switching to the ${target} theme. Pressing T does the same thing.`, action: { kind: 'setTheme', theme: target } }
  }

  // Explanations before keyword intents: a "why" question containing "approach" is not asking for the conjunction summary.
  if (OPEN_Q.test(t)) return unknownReply("I can't answer that using ORCA's data, because it needs an explanation and AI answers are turned off.")

  if (TOUR.test(t)) return { intent: 'tour', text: 'Starting the tour. You can leave at any step and replay it later from the menu.', action: { kind: 'startTour' } }

  const term = findTerm(t, ctx.glossary)
  const bareTerm = term !== null && [term.toLowerCase(), ...(TERM_ALIASES[term] ?? [])].includes(stripArticles(t))
  if (term && (DEFINE_Q.test(t) || bareTerm)) return define(term, ctx)

  if (SAVED.test(t)) return savedExample(ctx)
  const horizon = horizonFrom(t)
  if (RUN_SEARCH.test(t) || (SEARCH_WORD.test(t) && (CONJ_WORD.test(t) || horizon !== null))) return runSearch(ctx, horizon)

  // A bare "conjunctions" asks for the answer, not the page; "open conjunctions" opens it.
  const verb = VIEW_VERB.exec(t)
  const view = verb ? viewNamed(verb[1]) : viewNamed(t)
  if (view && (verb || view !== 'conjunctions')) return go(view, ctx)

  if (CONJ_WORD.test(t)) return conjunctions(ctx)
  if (FRESH.test(t)) return freshness(ctx)

  // "find GEO-KOMPSAT" names an object, not a regime: an explicit find/show wins unless it is also a count question.
  const q = objectQuery(raw)
  if (q !== null && !COUNT_Q.test(t)) {
    if (!q) return { intent: 'showObject', text: 'Which object? Please give me a name or a NORAD catalog number.' }
    return { intent: 'showObject', text: `Looking for "${q}" in the stored catalog.`, action: { kind: 'showObject', query: q } }
  }

  const regimes = regimesNamed(t)
  if (COUNT_Q.test(t) || regimes.length > 0) return count(ctx, regimes, BY_REGIME.test(t))

  if (term) return define(term, ctx)
  if (DEFINE_Q.test(t)) {
    const known = Object.keys(ctx.glossary).join(', ')
    return { intent: 'unknown', text: `That is not in ORCA's glossary or its data. These are the terms I can explain: ${known}.`, chips: chips(['What is a TLE?', 'What is Pc?', 'What is TCA?', 'What can you do?']) }
  }
  return unknownReply()
}

// ---------------------------------------------------------------------------------------------------------------------
// For the optional AI: the same context as plain facts. Aggregate public numbers only, no object names.

export function askFacts(ctx: AskContext): string[] {
  const facts: string[] = [`Current view: ${VIEW_LABEL[ctx.view]}`]
  facts.push(ctx.total !== null ? `Objects in the stored catalog: ${integer(ctx.total)}` : 'Objects in the stored catalog: not loaded yet')
  if (ctx.loaded !== null) facts.push(`Objects loaded in the app for drawing: ${integer(ctx.loaded)}`)
  if (ctx.regimes) {
    const r = ctx.regimes
    const parts = REGIME_KEYS.map((k) => `${k} ${integer(r.counts[k] ?? 0)}`).join(', ')
    facts.push(`Objects by orbit regime (${r.scope === 'catalog' ? 'whole stored catalog' : 'loaded objects only'}): ${parts}`)
  } else facts.push('Objects by orbit regime: not loaded yet')
  const a = ctx.ages
  facts.push(a.medianDays !== null
    ? `Element-set (TLE) age over the loaded objects: median ${days1(a.medianDays)}, newest ${days1(a.newestDays)}, oldest ${days1(a.oldestDays)}; ORCA warns above a ${STALE_MEDIAN_DAYS}-day median`
    : 'Element-set (TLE) age: not loaded yet')
  if (a.lastRefreshUtc) facts.push(`The API last stored a Celestrak fetch at ${a.lastRefreshUtc}`)
  const c = ctx.conjunction
  if (c.phase === 'running') facts.push('A conjunction search is running; no result yet')
  else if (c.phase === 'done' && c.headline) facts.push(`Conjunction result (${c.source === 'saved' ? 'saved example run, not live' : 'live search this session'}): ${c.headline}.${c.detail ? ` ${c.detail}` : ''}`)
  else if (c.phase === 'failed') facts.push('The last conjunction search failed')
  else facts.push('No conjunction search has been run this session')
  facts.push('Limits: positions come from public TLEs with a simplified propagator; Pc uses an assumed covariance model and ranks pairs, it is not a forecast; ORCA is not an operational system')
  return facts
}

/** Why the AI could not answer, in words a user can act on. From the HTTP status of the failed call (null: no answer). */
export function assistantFailure(status: number | null): string {
  if (status === 503 || status === 404) return 'the AI assistant is turned off on this server'
  if (status === 429) return 'too many AI questions in a short time; try again in a minute'
  if (status === 400) return 'the question could not be sent as it was'
  if (status === null) return 'the server could not be reached'
  return `the AI request failed (${status})`
}
