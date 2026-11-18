import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { askAssistant, getAssistantStatus } from '@/api/assistant'
import type { AssistantStatus } from '@/api/assistant'
import { ApiError } from '@/api/client'
import { getCatalogSummary, searchTles } from '@/api/endpoints'
import type { Health, TleRecord } from '@/api/types'
import { answerSource, askFacts, askOrca, assistantFailure, greeting } from '@/lib/askOrca'
import type { AskAction, AskContext, AskReply, QuickReply } from '@/lib/askOrca'
import type { CatalogSummary } from '@/lib/catalog'
import { resultAnswer, tierCounts } from '@/lib/conjunctionSummary'
import { integer } from '@/lib/format'
import { GLOSSARY } from '@/lib/glossary'
import { searchObjects } from '@/lib/search'
import type { Theme } from '@/lib/theme'
import { formatUtc } from '@/lib/time'
import { VIEWS } from '@/lib/views'
import type { ViewId } from '@/lib/views'
import { useAsync } from './useAsync'
import type { ConjunctionSearch } from './useConjunctionSearch'

export interface ChatEntry {
  id: number
  role: 'user' | 'orca'
  text: string
  chips?: QuickReply[]
  /** Set on an AI answer: the model, the server's label, and exactly the facts it was given. */
  ai?: { model: string; label: string; facts: string[] }
  /** A reply still on its way (an object lookup or an AI answer). */
  pending?: boolean
}

/** What the panel's actions do. Workspace maps each to the function the rest of the app already uses. */
export interface AskHandlers {
  go: (view: ViewId) => void
  showObject: (noradId: string) => void
  runSearch: (horizonDays: number) => void
  /** Resolves false when the example could not be shown (a live search is running). */
  openSavedExample: () => Promise<boolean>
  setTheme: (theme: Theme) => void
  startTour: () => void
  showShortcuts: () => void
}

type Args = {
  open: boolean
  view: ViewId
  theme: Theme
  health: Health | null
  /** Summary of the LOADED rows. */
  summary: CatalogSummary | null
  loaded: readonly TleRecord[]
  conjSearch: ConjunctionSearch
  handlers: AskHandlers
  /** The composer: focus goes back to it after an action moves the page (a view change focuses the content). */
  inputRef: RefObject<HTMLInputElement | null>
}

/**
 * The "Ask ORCA" conversation: kept in memory only (gone on sign-out). Each question goes to the deterministic engine
 * (lib/askOrca); ONLY a question it cannot place, and only when the server reports the AI enabled, is sent on to
 * /api/assistant/ask, with the same context as aggregate facts. Any AI failure falls back to the engine's own reply.
 */
export function useAskOrca({ open, view, theme, health, summary, loaded, conjSearch, handlers, inputRef }: Args) {
  const [messages, setMessages] = useState<ChatEntry[]>([])
  const [status, setStatus] = useState<AssistantStatus | null>(null)
  const nextId = useRef(1)
  const greeted = useRef(false)
  const inflight = useRef(new Set<AbortController>())

  const stored = health?.database.tles_count ?? null
  // Whole-catalog counts by regime: fetched only once the panel has been opened.
  const whole = useAsync((signal) => getCatalogSummary({ signal }), [stored], open || greeted.current).data

  const context = useMemo<AskContext>(() => {
    const result = conjSearch.result
    const answer = result && conjSearch.query
      ? resultAnswer(tierCounts(result), result.total_events, { start: result.window_start, end: result.window_end }, result.report_km)
      : null
    return {
      view,
      theme,
      total: whole?.total ?? stored,
      loaded: summary?.count ?? null,
      regimes: whole
        ? { counts: whole.by_regime, scope: 'catalog', of: whole.total, unclassified: whole.regime_unclassified }
        : summary ? { counts: summary.regimes, scope: 'loaded', of: summary.count, unclassified: summary.unclassified } : null,
      ages: {
        medianDays: summary?.medianAgeDays ?? null,
        newestDays: summary?.newestAgeDays ?? null,
        oldestDays: summary?.oldestAgeDays ?? null,
        lastRefreshUtc: health?.database.last_update ? formatUtc(health.database.last_update) : null,
      },
      conjunction: {
        phase: conjSearch.phase,
        source: conjSearch.source,
        headline: answer?.headline ?? null,
        detail: answer?.detail ?? null,
        error: conjSearch.error?.message ?? null,
      },
      views: VIEWS,
      glossary: GLOSSARY,
      ai: status?.enabled === true,
    }
  }, [view, theme, whole, stored, summary, health, conjSearch.result, conjSearch.query, conjSearch.phase, conjSearch.source, conjSearch.error, status])

  // Callbacks below read these through refs, so a reply always uses the latest data and handlers.
  const ctxRef = useRef(context)
  ctxRef.current = context
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers
  const loadedRef = useRef(loaded)
  loadedRef.current = loaded
  const statusRef = useRef(status)
  statusRef.current = status

  const add = useCallback((entry: Omit<ChatEntry, 'id'>): number => {
    const id = nextId.current++
    setMessages((m) => [...m, { ...entry, id }])
    return id
  }, [])
  const patch = useCallback((id: number, change: Partial<ChatEntry>) => {
    setMessages((m) => m.map((e) => (e.id === id ? { ...e, ...change } : e)))
  }, [])
  const track = () => {
    const ctl = new AbortController()
    inflight.current.add(ctl)
    return { signal: ctl.signal, done: () => inflight.current.delete(ctl) }
  }
  const refocus = useCallback(() => {
    window.requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }))
  }, [inputRef])

  // First open: one check of whether the AI is on (a 404 or 503 simply means off), then the greeting, which says where
  // the answers come from and so must know (audit 2026-11-18, P1 #4). Its place is kept at the top while the check runs.
  // Not aborted on unmount: it never throws, and an aborted check would leave the greeting waiting for good.
  useEffect(() => {
    if (!open || greeted.current) return
    greeted.current = true
    const id = add({ role: 'orca', text: 'Getting ready', pending: true })
    const greet = (ai: boolean) => patch(id, { pending: false, ...greetingEntry(greeting(ctxRef.current.view, ai)) })
    getAssistantStatus().then((s) => { setStatus(s); greet(s.enabled) }, () => greet(false))
  }, [open, add, patch])

  useEffect(() => () => { for (const c of inflight.current) c.abort() }, [])

  const showObject = useCallback((query: string) => {
    const id = add({ role: 'orca', text: `Searching for "${query}"`, pending: true })
    const { signal, done } = track()
    const answer = (list: readonly TleRecord[], degraded: boolean) => {
      done()
      const n = integer(loadedRef.current.length)
      if (list.length === 0) {
        patch(id, {
          pending: false,
          text: degraded
            ? `The server search failed, and none of the ${n} loaded objects match "${query}", so I cannot tell whether it is in the catalog.`
            : `No object in the stored catalog matches "${query}".`,
          chips: [{ label: 'Open Overview' }],
        })
        return
      }
      const q = query.trim().toLowerCase()
      const pick = list.find((t) => t.norad_cat_id === q) ?? list.find((t) => t.object_name.toLowerCase() === q) ?? list[0]
      const others = list.filter((t) => t !== pick).slice(0, 3)
      handlersRef.current.showObject(pick.norad_cat_id)
      refocus()
      const more = others.length ? ` ${others.length} other ${others.length === 1 ? 'match' : 'matches'} below.` : ''
      const note = degraded ? ` The server search failed, so this matched only among the ${n} loaded objects.` : ''
      patch(id, {
        pending: false,
        text: `Showing ${pick.object_name} (NORAD ${pick.norad_cat_id}) on the globe.${more}${note}`,
        chips: others.map((t) => ({ label: t.object_name, say: `show ${t.norad_cat_id}` })),
      })
    }
    searchTles(query, 6, { signal }).then(
      (list) => { if (!signal.aborted) answer(list, false) },
      () => { if (!signal.aborted) answer(searchObjects(loadedRef.current, query, 6), true) },
    )
  }, [add, patch, refocus])

  const run = useCallback((action: AskAction) => {
    const h = handlersRef.current
    switch (action.kind) {
      case 'go': h.go(action.view); refocus(); return
      case 'showObject': showObject(action.query); return
      case 'runSearch': h.runSearch(action.horizonDays); refocus(); return
      case 'openSavedExample':
        h.openSavedExample().then(
          (ok) => { if (!ok) add({ role: 'orca', text: 'A live search is running, so the example was not opened.' }); refocus() },
          () => add({ role: 'orca', text: 'The saved example could not be loaded.' }),
        )
        return
      case 'setTheme': h.setTheme(action.theme); return
      case 'startTour': h.startTour(); return
      case 'showShortcuts': h.showShortcuts(); return
    }
  }, [add, refocus, showObject])

  const askAi = useCallback((question: string, fallback: AskReply) => {
    const ctx = ctxRef.current
    const facts = askFacts(ctx)
    const id = add({ role: 'orca', text: 'Asking the AI model', pending: true })
    const { signal, done } = track()
    askAssistant({ question, context: { view: ctx.view, facts } }, { signal }).then(
      (a) => { done(); patch(id, { pending: false, text: a.answer, ai: { model: a.model, label: a.label, facts } }) },
      (err: unknown) => {
        done()
        if (signal.aborted) return
        const code = err instanceof ApiError && err.kind === 'http' ? err.status : null
        patch(id, { pending: false, text: `The AI assistant was unavailable (${assistantFailure(code)}). ${fallback.text}`, chips: fallback.chips })
        if (code === 503) setStatus((s) => (s ? { ...s, enabled: false, reason: 'turned off on the server' } : s))
      },
    )
  }, [add, patch])

  const send = useCallback((text: string) => {
    const q = text.trim()
    if (!q) return
    add({ role: 'user', text: q })
    const reply = askOrca(q, ctxRef.current)
    if (reply.intent === 'unknown' && statusRef.current?.enabled) { askAi(q, reply); return }
    add({ role: 'orca', text: reply.text, chips: reply.chips })
    if (reply.action) run(reply.action)
  }, [add, askAi, run])

  const pick = useCallback((chip: QuickReply) => send(chip.say ?? chip.label), [send])

  // Plain sentences, no model id (audit 2026-11-18, P3): each AI answer already carries its own label.
  const footnote = status === null
    ? "Answers come from ORCA's data."
    : status.enabled
      ? answerSource(true)
      : `All answers come from ORCA's data. The AI is off${status.reason ? `: ${status.reason}` : ''}.`

  return { messages, send, pick, footnote, busy: messages.some((m) => m.pending) }
}

const greetingEntry = (r: AskReply) => ({ text: r.text, chips: r.chips })
