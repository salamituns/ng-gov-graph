import type { CompiledGraph } from './types'

const FIELD = /^\s*\|\s*(chief\d*_name|leader\d*_name|head\d*_name|chief\d*_position|leader\d*_title|leader\d*_position|head\d*_position)\s*=\s*(.*)$/gim

function clean(value: string) {
	const link = value.match(/\[\[([^\]|#]+)(?:\|([^\]]+))?\]\]/)
	return (link ? link[2] ?? link[1] : value)
		.replace(/\{\{[^}]*\}\}/g, '')
		.replace(/<[^>]+>/g, '')
		.replace(/'{2,}/g, '')
		.replace(/\([^)]*\)/g, '')
		.replace(/\s+/g, ' ')
		.trim()
}

/** A plausible personal name: two to five capitalised words, no digits, not a placeholder. */
function looksLikeName(value: string) {
	const words = value.replace(/^(?:Dr|Prof|Mr|Mrs|Ms|Engr|Alhaji|Hajiya|Barr|Arc)\.?\s+/i, '').split(/\s+/)
	return words.length >= 2 && words.length <= 5 && words.every((word) => /^[A-Z][\p{L}'’.-]*$/u.test(word)) && !/vacant|acting|none|tba/i.test(value)
}

/**
 * Reads the head of an agency from its Wikipedia infobox. Infoboxes list several chiefs; the one whose
 * position matches the seat title wins, otherwise the first listed chief.
 */
export function parseInfoboxHead(wikitext: string, seatTitle: string): string | null {
	const infobox = wikitext.slice(0, 12000)
	const names = new Map<string, string>()
	const positions = new Map<string, string>()
	for (const match of infobox.matchAll(FIELD)) {
		const [, key, raw] = match
		const slot = key.replace(/_(name|position|title)$/i, '').toLowerCase().replace(/^(chief|leader|head)$/, '$11')
		if (/_name$/i.test(key)) names.set(slot, clean(raw))
		else positions.set(slot, clean(raw).toLowerCase())
	}
	const wanted = seatTitle.toLowerCase().replace(/ of .*$/, '').split(/[\s-]+/).filter((word) => word.length > 3)
	const slots = [...names.keys()]
	const best =
		slots.find((slot) => wanted.length && wanted.every((word) => positions.get(slot)?.includes(word))) ??
		slots.find((slot) => wanted.some((word) => positions.get(slot)?.includes(word))) ??
		slots[0]
	const name = best ? names.get(best) : undefined
	return name && looksLikeName(name) ? name.replace(/^(?:Dr|Prof|Mr|Mrs|Ms|Engr|Alhaji|Hajiya|Barr|Arc)\.?\s+/i, '') : null
}

async function fetchWikitext(page: string) {
	const url = new URL('https://en.wikipedia.org/w/api.php')
	url.searchParams.set('action', 'parse')
	url.searchParams.set('page', page)
	url.searchParams.set('prop', 'wikitext')
	url.searchParams.set('redirects', '1')
	url.searchParams.set('format', 'json')
	try {
		const res = await fetch(url, {
			headers: { 'user-agent': 'Govgraph/0.1 (https://ng-gov-graph.vercel.app)' },
			cache: 'no-store',
			signal: AbortSignal.timeout(8000),
		})
		if (!res.ok) return ''
		const body = (await res.json()) as { parse?: { wikitext?: { '*': string } } }
		return body.parse?.wikitext?.['*'] ?? ''
	} catch {
		return ''
	}
}

/**
 * Many agency names are shared with other countries ("Securities and Exchange Commission"), so the
 * disambiguated "(Nigeria)" page is tried first and any page must be about Nigeria near its top.
 */
async function nigerianPage(name: string, fetchPage: (page: string) => Promise<string>) {
	for (const title of [`${name} (Nigeria)`, name]) {
		const text = await fetchPage(title)
		if (text && /Nigeria/.test(text.slice(0, 4000))) return text
	}
	return ''
}

/**
 * Fills seats whose holder is not yet recorded from the agency's Wikipedia infobox. Seats that already
 * have a sourced holder are never overwritten.
 */
export async function overlayAgencyHeads(
	graph: CompiledGraph,
	fetchPage: (page: string) => Promise<string> = fetchWikitext,
	concurrency = 6,
): Promise<CompiledGraph> {
	const seats = Object.values(graph.nodes).filter((node) => node.type === 'dept_head' && node.unrecorded && !node.people.length)
	let cursor = 0
	const worker = async () => {
		while (cursor < seats.length) {
			const seat = seats[cursor++]
			const org = seat.parentId ? graph.nodes[seat.parentId] : undefined
			if (!org) continue
			const name = parseInfoboxHead(await nigerianPage(org.name, fetchPage), seat.name)
			if (!name) continue
			seat.people = [{ name }]
			delete seat.unrecorded
			org.people = [{ name }]
		}
	}
	await Promise.all(Array.from({ length: concurrency }, worker))
	return graph
}
