import type { NewsItem } from '@/data/nigeria/news'
import { decodeHtml } from './news-text'
import { mentionedIds, type MentionLabel } from './mentions'
import type { CompiledGraph, GraphNode, PersonnelChange } from './types'

const DISTRICT_SEAT = /^ng-(senator|rep)-/

function slug(value: string) {
	return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
}

function seats(graph: CompiledGraph) {
	return Object.values(graph.nodes).filter((node) => node.type === 'dept_head')
}

function entryMode(graph: CompiledGraph, seat: GraphNode): PersonnelChange['entryMode'] {
	if (DISTRICT_SEAT.test(seat.id)) return 'elected'
	const appointed = seat.edges.some((id) => graph.edges[id]?.type === 'appoints' && graph.edges[id]?.toId === seat.id)
	return appointed ? 'appointed' : 'elected'
}

/**
 * Compares officeholders between the stored snapshot and a fresh one. A seat whose holder changed is an
 * appointment with a known predecessor; a seat that lost its holder is a departure. A seat filled for the
 * first time is only data coming in, not news, so it is not reported.
 */
export function diffOfficeholders(previous: CompiledGraph | null, next: CompiledGraph, date: string): PersonnelChange[] {
	if (!previous) return []
	const changes: PersonnelChange[] = []
	for (const seat of seats(next)) {
		const before = previous.nodes[seat.id]?.people[0]?.name
		const after = seat.people[0]?.name
		if (!before || (after && slug(before) === slug(after)) || seat.people[0]?.sourceCheckedAt) continue
		const base = {
			kind: 'personnel' as const,
			date,
			positionId: seat.id,
			positionName: seat.name,
			groupId: seat.parentId ?? seat.id,
			entryMode: entryMode(next, seat),
			sourceUrl: seat.officialUrl ?? seat.legalSourceUrl,
		}
		if (after) {
			changes.push({ ...base, id: `diff-${seat.id}-${slug(after)}`, personName: after, departure: false, predecessorName: before })
		} else if (!DISTRICT_SEAT.test(seat.id)) {
			changes.push({ ...base, id: `diff-${seat.id}-${slug(before)}-out`, personName: before, departure: true, predecessorName: null })
		}
	}
	return changes
}

const HONORIFIC = String.raw`(?:(?:Mr|Mrs|Ms|Dr|Prof|Engr|Engineer|Barr|Arc|Pharm|Alhaji|Hajiya|Chief|Senator|Sen|Hon|Rtd|Ambassador|Amb|Air Vice Marshal|Major General|Rear Admiral|AVM|Maj\.?-?Gen)\.?\s+)*`
const NAME_NC = String.raw`[A-Z][\p{L}'’.-]+(?:\s+[A-Z][\p{L}'’.-]+){1,4}`
const NAME = `(${NAME_NC})`
const VERB = String.raw`(?:approved\s+the\s+(?:re-?)?appointment\s+of|(?:re-?)?appoint(?:s|ed)|named|nominated|swore\s+in|swears\s+in|sworn\s+in|renew(?:s|ed)\s+the\s+tenure\s+of)`
const APPOINTMENT = new RegExp(
	String.raw`${VERB}\s+${HONORIFIC}${NAME},?\s+as\s+(?:the\s+)?(?:new\s+)?([^.;:]+?)(?=[.;:]|,\s+(?:with|while|for|effective|and\s+the)|\s+(?:with\s+effect|effective)|,\s*(?:and\s+)?${HONORIFIC}${NAME_NC}\s+as\s|$)`,
	'giu',
)
/** Roles that head a body; an aide or adviser is not the head of the body named in their title. */
const HEAD_ROLE = /^(?:acting\s+)?(?:director-general|director general|dg|executive (?:vice-)?chairman|chairman|chairperson|chief executive|managing director|md|executive secretary|executive director|registrar(?:-general)?|comptroller-general|controller-general|commandant-general|corps marshal|statistician-general|accountant-general|auditor-general|postmaster-general|national coordinator|commissioner|inspector-general|chief of|head of|governor of|minister of|president of|chief judge|chief justice)/i

function titleName(value: string) {
	return value === value.toUpperCase()
		? value.toLowerCase().replace(/(^|[\s'’-])(\p{L})/gu, (_, lead, letter: string) => lead + letter.toUpperCase())
		: value
}

function normal(value: string) {
	return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

/** "Abel Enitan" and "Abel Olumuyiwa Enitan" are one person: same first and last name. */
export function samePerson(a: string, b: string) {
	const tokens = (name: string) => slug(name).split('-').filter((token) => !/^(?:mr|mrs|ms|dr|prof|engr|alhaji|hajiya|hon|chief)$/.test(token))
	const x = tokens(a)
	const y = tokens(b)
	return x[0] === y[0] && x.at(-1) === y.at(-1)
}

function roleOf(title: string) {
	return normal(title.replace(/\s+(?:of|for)\s+.*$/i, '').replace(/^(?:acting|new)\s+/i, ''))
}

/**
 * Resolves "Head of the Civil Service of the Federation" or "Director-General of NAFDAC" to a seat. A
 * board chairman is not the agency's chief executive, so a role that differs from the seat's title is
 * recorded against the body, not its head seat.
 */
function resolveSeat(position: string, graph: CompiledGraph, labels: MentionLabel[]) {
	const text = normal(position)
	const specific = seats(graph)
		.filter((seat) => !DISTRICT_SEAT.test(seat.id) && / of | for /.test(seat.name) && seat.name.length >= 16)
		.filter((seat) => text.startsWith(normal(seat.name)))
		.sort((a, b) => b.name.length - a.name.length)[0]
	if (specific) return { seat: specific, org: graph.nodes[specific.parentId ?? ''] }
	if (!HEAD_ROLE.test(position)) return null
	const org = mentionedIds(position, labels.filter((label) => label.kind === 'entity'))
		.map((id) => graph.nodes[id])
		.find((node) => node && node.type !== 'dept_head' && node.type !== 'constituency')
	if (!org) return null
	const seat = org.head ? graph.nodes[org.head] : undefined
	const sameRole = seat && (roleOf(seat.name) === roleOf(position) || roleOf(position).startsWith(roleOf(seat.name)))
	return { seat: sameRole ? seat : undefined, org }
}

const PREDECESSOR = new RegExp(String.raw`\b(?:succeeds|succeeded|succeeding|replaces|replaced|replacing|takes\s+over\s+from|took\s+over\s+from|in\s+place\s+of|in\s+succession\s+to)\s+${HONORIFIC}${NAME}`, 'u')
/** ", Dr Akinola Odeyemi as Managing Director of …" after a first appointment in the same sentence. */
const CONTINUATION = new RegExp(String.raw`(?:,\s*(?:and\s+)?|\s+and\s+)${HONORIFIC}${NAME}\s+as\s+(?:the\s+)?(?:new\s+)?([^,.;:]+?)(?=,|\.|;|\s+and\s|$)`, 'gu')
/** In a renewal notice: "first appointed Abdulhamid Salihu Dembos of the NTA and Ali Mohammed Ali of the NAN". */
const RENEWED = new RegExp(String.raw`(?:appointed\s+|\band\s+)${HONORIFIC}${NAME}\s+of\s+(?:the\s+)?([A-Z][\p{L}\s()'’-]{1,70}?)(?=\s+and\s|\s+on\s|[,.;]|$)`, 'gu')

/** "Ayo Fayose, emerging as chairman of the Rural Electrification Agency": the name comes first. */
const EMERGING = new RegExp(String.raw`${NAME},?\s+(?:emerging|emerges|emerged)\s+as\s+(?:the\s+)?(?:new\s+)?([^.;:]+?)(?=[.;:]|,\s*(?:and\s+)?${HONORIFIC}${NAME_NC}\s+as\s|,\s+and\s|$)`, 'gu')

function sentencesOf(text: string) {
	return text.split(/\n+|(?<=[.!?])\s+(?=[A-Z“"])/).map((sentence) => sentence.trim()).filter(Boolean)
}

/** The readable text of an article page: its paragraphs and list items, without scripts or chrome. */
export function articleText(html: string) {
	const body = html.replace(/<(script|style|nav|header|footer|aside)\b[\s\S]*?<\/\1>/gi, '')
	return [...body.matchAll(/<(p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map((match) => decodeHtml(match[2])).filter(Boolean).join('\n')
}

/**
 * Reads appointment announcements out of official news: the headline ("PRESIDENT TINUBU APPOINTS ABEL
 * ENITAN AS HEAD OF THE CIVIL SERVICE OF THE FEDERATION"), the lead, and, when fetched, the article
 * body, including lists of appointments, tenure renewals, and who the new holder succeeds.
 */
export function appointmentsFromNews(
	news: NewsItem[],
	labels: MentionLabel[],
	graph: CompiledGraph,
	bodies: Record<string, string> = {},
): PersonnelChange[] {
	const changes: PersonnelChange[] = []
	for (const item of news) {
		const date = item.publishedAt?.slice(0, 10)
		if (!date) continue
		const full = [decodeHtml(item.summary), decodeHtml(item.excerpt ?? ''), bodies[item.url] ?? ''].join('\n')
		const renewal = /renew\w*\s+(?:the\s+)?tenure|re-?appoint/i.test(full)
		const found = new Map<string, PersonnelChange>()
		const emit = (rawName: string, rawPosition: string, verb: string, known?: { seat?: GraphNode; org: GraphNode }) => {
			const personName = titleName(rawName.trim()).replace(/^(?:Mr|Mrs|Ms|Dr|Prof|Engr)\.?\s+/i, '')
			const position = titleName(rawPosition.trim().replace(/\s+/g, ' '))
			if (position.length > 120) return
			const resolved = known ?? resolveSeat(position, graph, labels)
			if (!resolved?.org) return
			const { seat, org } = resolved
			const positionId = seat?.id ?? org.id
			const key = `${positionId}|${slug(personName)}`
			if (found.has(key)) return
			const reappointed = renewal || /renew|re-?appoint/i.test(verb)
			const holder = seat?.people[0]?.name
			found.set(key, {
				kind: 'personnel',
				id: `news-${positionId}-${slug(personName)}`,
				date,
				personName,
				positionId,
				positionName: seat ? (/ (?:of|for) /.test(seat.name) ? seat.name : `${seat.name}, ${org.name}`) : position.replace(/^(\p{Ll})/u, (letter) => letter.toUpperCase()),
				groupId: org.id,
				entryMode: reappointed ? 'reappointed' : /sw(?:ore|orn|ears)\s+in/i.test(verb) ? 'sworn' : 'appointed',
				departure: false,
				predecessorName: !reappointed && holder && !samePerson(holder, personName) ? holder : null,
				sourceUrl: item.url,
			})
		}
		for (const sentence of sentencesOf(full)) {
			for (const match of sentence.matchAll(APPOINTMENT)) {
				emit(match[1], match[2], match[0])
				// "… appointed A as X, B as Y, and C as Z": the rest of the sentence continues the list.
				for (const more of sentence.slice((match.index ?? 0) + match[0].length).matchAll(CONTINUATION)) emit(more[1], more[2], match[0])
			}
			for (const match of sentence.matchAll(EMERGING)) emit(match[1], match[2], 'appointed')
			if (renewal) {
				for (const match of sentence.matchAll(RENEWED)) {
					const org = mentionedIds(match[2], labels.filter((label) => label.kind === 'entity')).map((id) => graph.nodes[id]).find(Boolean)
					const seat = org?.head ? graph.nodes[org.head] : undefined
					if (org && seat) emit(match[1], `${seat.name} of ${org.name}`, 'renewed', { seat, org })
				}
			}
		}
		// "Enitan succeeds Mrs Didi Esther Walson-Jack": the predecessor, when the notice names one.
		const appointees = [...found.values()]
		for (const sentence of sentencesOf(full)) {
			const match = sentence.match(PREDECESSOR)
			if (!match) continue
			const predecessor = titleName(match[1].trim())
			const target = appointees.length === 1
				? appointees[0]
				: appointees.find((change) => sentence.toLowerCase().includes((change.personName.split(/\s+/).at(-1) ?? '').toLowerCase()))
			// The notice's own words beat what the graph held before, which may be the new holder already.
			if (target && !samePerson(predecessor, target.personName)) target.predecessorName = predecessor
		}
		changes.push(...appointees)
	}
	return changes
}

/** Official appointment notices whose bodies have not been read yet: fetch them once, capped per run. */
export async function fetchAppointmentBodies(news: NewsItem[], fetchImpl: typeof fetch = fetch, limit = 40) {
	const bodies: Record<string, string> = {}
	const targets = news
		.filter((item) => !item.bodyScanned && /statehouse\.gov\.ng|fmino\.gov\.ng/.test(item.url))
		.filter((item) => /appoint|swear|sworn|renew|tenure|nominat|succeed|replace/i.test(`${item.summary} ${item.excerpt ?? ''}`))
		.slice(0, limit)
	await Promise.all(targets.map(async (item) => {
		try {
			const res = await fetchImpl(item.url, { headers: { 'user-agent': 'Mozilla/5.0 (Govgraph)' }, signal: AbortSignal.timeout(12000) })
			if (!res.ok) return
			bodies[item.url] = articleText(await res.text())
			item.bodyScanned = true
		} catch {
			// Unread bodies are tried again on the next run.
		}
	}))
	return bodies
}

/**
 * A sourced appointment fills a seat whose holder is not yet recorded. Seats with a recorded holder are
 * left to their own sources; the change still appears in the feed.
 */
export function applyAppointments(graph: CompiledGraph, changes: PersonnelChange[]) {
	for (const change of [...changes].sort((a, b) => a.date.localeCompare(b.date))) {
		const seat = graph.nodes[change.positionId]
		if (change.departure || seat?.type !== 'dept_head' || (!seat.unrecorded && !(change.sourceUrl && seat.people[0]?.sourceCheckedAt && change.date > seat.people[0].sourceCheckedAt))) continue
		const person = { name: change.personName, appointedYear: Number(change.date.slice(0, 4)), sourceUrl: change.sourceUrl, sourceCheckedAt: change.date }
		seat.people = [person]
		delete seat.unrecorded
		const org = seat.parentId ? graph.nodes[seat.parentId] : undefined
		if (org && org.head === seat.id) org.people = [person]
	}
	return graph
}

function longer(a: string, b: string) {
	return b.length > a.length ? b : a
}

/** Keeps the history: new entries join the stored ones, duplicates collapse, newest first. */
export function mergeChanges(existing: PersonnelChange[], incoming: PersonnelChange[], limit = 400): PersonnelChange[] {
	const byKey = new Map<string, PersonnelChange>()
	for (const change of [...existing, ...incoming]) {
		// Same seat and surname is one event: "Abel Enitan" sworn in is "Abel Olumuyiwa Enitan" appointed.
		const surname = slug(change.personName.split(/\s+/).at(-1) ?? change.personName)
		const key = `${change.positionId}|${surname}|${change.departure ? 'out' : 'in'}`
		const kept = byKey.get(key)
		// The earliest sighting is the real date; a later run seeing the same change must not move it.
		if (kept && !kept.predecessorName && change.predecessorName) kept.predecessorName = change.predecessorName
		if (!kept) byKey.set(key, change)
		else if (change.date < kept.date) byKey.set(key, { ...change, personName: longer(change.personName, kept.personName), sourceUrl: change.sourceUrl ?? kept.sourceUrl })
		else byKey.set(key, { ...kept, personName: longer(kept.personName, change.personName), predecessorName: kept.predecessorName ?? change.predecessorName })
	}
	return [...byKey.values()].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id)).slice(0, limit)
}

/** News accumulates too, so the power map sees the whole 90-day window rather than the latest page of a feed. */
export function mergeNews(existing: NewsItem[], incoming: NewsItem[], limit = 600): NewsItem[] {
	const byUrl = new Map<string, NewsItem>()
	for (const item of [...existing, ...incoming]) byUrl.set(item.url, { ...byUrl.get(item.url), ...item })
	return [...byUrl.values()]
		.sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
		.slice(0, limit)
}
