import type { CompiledGraph, GraphNode } from './types'

export interface MentionLabel {
	id: string
	label: string
	/** Person labels resolve to the person's primary seat, never to every office they hold. */
	kind: 'entity' | 'person'
	/** A bare surname only counts after a title, so "Musa" alone never tags the Defence minister. */
	titled?: boolean
}

const PLACE_WORDS = [
	'Stadium', 'Airport', 'International', 'University', 'Polytechnic', 'College', 'Hospital', 'Teaching', 'Street', 'Road',
	'Way', 'Avenue', 'Crescent', 'Close', 'Drive', 'Boulevard', 'Bridge', 'Estate', 'Square', 'Park', 'Hall', 'Centre',
	'Center', 'Library', 'Barracks', 'Foundation', 'Memorial', 'Mosque', 'Church', 'Cathedral', 'Theatre', 'Hostel', 'House',
].flatMap((word) => [word, word.toUpperCase()]).join('|')

const TITLES = ['President', 'Vice President', 'Senator', 'Sen.', 'Governor', 'Gov.', 'Minister', 'Speaker', 'Deputy Speaker', 'Justice', 'Chief Justice', 'Chairman', 'Dr.', 'Dr', 'Mr', 'Mrs', 'Ms', 'Prof.', 'Hon.']

export interface MentionSpan {
	id: string
	start: number
	end: number
	text: string
	kind: MentionLabel['kind']
}

const ELECTED_FIRST: Record<string, number> = { elected: 0, court: 1, commission: 2, department: 3 }

function isAcronym(label: string) {
	return /^[A-Z][A-Z0-9&]{1,7}$/.test(label)
}

export function usableEntityLabel(label: string) {
	if (isAcronym(label)) return true
	const words = label.split(/\s+/).filter(Boolean)
	return words.length > 1 ? label.length >= 8 : label.length >= 12
}

function escape(value: string) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Each officeholder's primary seat: elected offices first, then courts, commissions and
 * departments, top-level bodies before sub-agencies. Tinubu is the President, not the Petroleum minister.
 */
export function primarySeats(graph: CompiledGraph): Map<string, GraphNode> {
	const ranked = Object.values(graph.nodes)
		.filter((node) => node.type !== 'dept_head' && node.type !== 'constituency')
		.sort(
			(a, b) => (ELECTED_FIRST[a.type] ?? 9) - (ELECTED_FIRST[b.type] ?? 9) || (a.parentId ? 1 : 0) - (b.parentId ? 1 : 0),
		)
	const primary = new Map<string, GraphNode>()
	for (const node of ranked) {
		for (const person of node.people) {
			if (person.name && !primary.has(person.name)) primary.set(person.name, node)
		}
	}
	return primary
}

/**
 * Builds the label table used to tag news. Institutions match on their name and aliases;
 * officeholders match on their full name, or a distinctive surname, and resolve to one primary seat.
 */
const labelCache = new WeakMap<CompiledGraph, MentionLabel[]>()

export function mentionLabels(graph: CompiledGraph): MentionLabel[] {
	const cached = labelCache.get(graph)
	if (cached) return cached
	const built = buildLabels(graph)
	labelCache.set(graph, built)
	return built
}

function buildLabels(graph: CompiledGraph): MentionLabel[] {
	const labels: MentionLabel[] = []
	const orgs = Object.values(graph.nodes).filter(
		(node) => node.type !== 'dept_head' && node.type !== 'constituency',
	)
	for (const node of orgs) {
		const shortName = node.name.replace(/^Federal (Ministry of )/, '$1')
		for (const label of new Set([node.name, shortName, ...node.aliases])) {
			const trimmed = label.trim()
			if (usableEntityLabel(trimmed)) labels.push({ id: node.id, label: trimmed, kind: 'entity' })
		}
	}

	const primary = primarySeats(graph)
	const surnames = new Map<string, number>()
	for (const name of primary.keys()) {
		const surname = name.split(/\s+/).at(-1) ?? ''
		surnames.set(surname, (surnames.get(surname) ?? 0) + 1)
	}
	for (const [name, node] of primary) {
		labels.push({ id: node.id, label: name, kind: 'person' })
		const surname = name.split(/\s+/).at(-1) ?? ''
		if (surname.length >= 4 && surnames.get(surname) === 1 && /^[A-Z]/.test(surname)) {
			labels.push({ id: node.id, label: surname, kind: 'person', titled: true })
		}
	}
	return labels.sort((a, b) => b.label.length - a.label.length)
}

interface Compiled {
	entry: MentionLabel
	pattern: RegExp
	/** A cheap pre-check: skip the regex when the text cannot contain the label. */
	probe: string
}

// Label tables are built once per graph, so their compiled patterns are cached by identity.
const compiledCache = new WeakMap<MentionLabel[], Compiled[]>()

function compile(labels: MentionLabel[]): Compiled[] {
	const cached = compiledCache.get(labels)
	if (cached) return cached
	const compiled = labels.map((entry) => {
		const caseless = !(isAcronym(entry.label) || entry.kind === 'person')
		// State House headlines are set in capitals, so a name also matches its upper-case form.
		const body = entry.kind === 'person'
			? `(?:${escape(entry.label)}|${escape(entry.label.toUpperCase())})`
			: escape(entry.label)
		const title = entry.titled
			? `(?<=(?:${TITLES.flatMap((word) => [word, word.toUpperCase()]).map(escape).join('|')})\\s)`
			: ''
		// "Godswill Akpabio Stadium", "Nnamdi Azikiwe Airport": a place named after someone is not that person.
		const notAPlace = entry.kind === 'person' ? `(?!\\s+(?:${PLACE_WORDS})\\b)` : ''
		return {
			entry,
			pattern: new RegExp(`${title}(?<![\\p{L}\\p{N}])${body}(?![\\p{L}\\p{N}])${notAPlace}`, caseless ? 'giu' : 'gu'),
			probe: entry.label.toLowerCase(),
		}
	})
	compiledCache.set(labels, compiled)
	return compiled
}

/** Finds non-overlapping mentions, longest label first, on word boundaries. */
export function findMentions(text: string, labels: MentionLabel[]): MentionSpan[] {
	const spans: MentionSpan[] = []
	const lower = text.toLowerCase()
	const taken = (start: number, end: number) => spans.some((span) => start < span.end && end > span.start)
	for (const { entry, pattern, probe } of compile(labels)) {
		if (!lower.includes(probe)) continue
		pattern.lastIndex = 0
		for (const match of text.matchAll(pattern)) {
			const start = match.index ?? 0
			const end = start + match[0].length
			if (!taken(start, end)) spans.push({ id: entry.id, start, end, text: match[0], kind: entry.kind })
		}
	}
	return spans.sort((a, b) => a.start - b.start)
}

export function mentionedIds(text: string, labels: MentionLabel[]): string[] {
	return [...new Set(findMentions(text, labels).map((span) => span.id))]
}
