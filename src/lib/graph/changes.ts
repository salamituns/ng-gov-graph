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
		if (!before || (after && slug(before) === slug(after))) continue
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
const NAME = String.raw`([A-Z][\p{L}'’.-]+(?:\s+[A-Z][\p{L}'’.-]+){1,4})`
const VERB = String.raw`(?:approved\s+the\s+(?:re-?)?appointment\s+of|(?:re-?)?appoint(?:s|ed)|named|nominated|swore\s+in|swears\s+in|sworn\s+in|renew(?:s|ed)\s+the\s+tenure\s+of)`
const APPOINTMENT = new RegExp(
	String.raw`${VERB}\s+${HONORIFIC}${NAME},?\s+as\s+(?:the\s+)?(?:new\s+)?([^.;:]+?)(?=[.;:]|,\s+(?:with|while|for|effective|and\s+the)|\s+(?:with\s+effect|effective)|$)`,
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

/** Resolves "Head of the Civil Service of the Federation" or "Director-General of NAFDAC" to a seat. */
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
	return { seat: org.head ? graph.nodes[org.head] : undefined, org }
}

/**
 * Reads appointment announcements out of official news, from the headline ("PRESIDENT TINUBU APPOINTS
 * ABEL ENITAN AS HEAD OF THE CIVIL SERVICE OF THE FEDERATION") or the lead ("… approved the appointment of
 * Dr Jane Doe as the Director-General of the National Bureau of Statistics").
 */
export function appointmentsFromNews(news: NewsItem[], labels: MentionLabel[], graph: CompiledGraph): PersonnelChange[] {
	const changes: PersonnelChange[] = []
	for (const item of news) {
		const date = item.publishedAt?.slice(0, 10)
		if (!date) continue
		for (const text of [decodeHtml(item.summary), decodeHtml(item.excerpt ?? '')]) {
			for (const match of text.matchAll(APPOINTMENT)) {
				const personName = titleName(match[1].trim()).replace(/^(?:Mr|Mrs|Ms|Dr|Prof|Engr)\.?\s+/i, '')
				const position = titleName(match[2].trim().replace(/\s+/g, ' '))
				if (position.length > 120) continue
				const resolved = resolveSeat(position, graph, labels)
				if (!resolved?.org) continue
				const { seat, org } = resolved
				changes.push({
					kind: 'personnel',
					id: `news-${seat?.id ?? org.id}-${slug(personName)}`,
					date,
					personName,
					positionId: seat?.id ?? org.id,
					positionName: seat?.name && seat.name.length > 16 ? seat.name : position,
					groupId: org.id,
					entryMode: /sw(?:ore|orn|ears)\s+in/i.test(match[0]) ? 'sworn' : 'appointed',
					departure: false,
					predecessorName: seat?.people[0]?.name && slug(seat.people[0].name) !== slug(personName) ? seat.people[0].name : null,
					sourceUrl: item.url,
				})
			}
		}
	}
	return changes
}

/**
 * A sourced appointment fills a seat whose holder is not yet recorded. Seats with a recorded holder are
 * left to their own sources; the change still appears in the feed.
 */
export function applyAppointments(graph: CompiledGraph, changes: PersonnelChange[]) {
	for (const change of [...changes].sort((a, b) => a.date.localeCompare(b.date))) {
		const seat = graph.nodes[change.positionId]
		if (change.departure || seat?.type !== 'dept_head' || !seat.unrecorded) continue
		const person = { name: change.personName, appointedYear: Number(change.date.slice(0, 4)) }
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
		if (!kept) byKey.set(key, change)
		else if (change.date < kept.date) byKey.set(key, { ...change, personName: longer(change.personName, kept.personName), sourceUrl: change.sourceUrl ?? kept.sourceUrl })
		else byKey.set(key, { ...kept, personName: longer(kept.personName, change.personName) })
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
