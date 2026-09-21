import { DISTRICTS, STATE_SLUG, slug } from './nass-live'
import type { OccupancyRow } from './wiki-fill'
import { applyVacantOccupancy } from './wiki-fill'
import type { CompiledGraph } from './types'

const NALTF_MEMBERS_URL = 'https://naltf.gov.ng/honorable-members/'

function htmlToMarkdown(source: string) {
	if (!/<h2[\s>]/i.test(source) && !/<html/i.test(source)) {
		return source
	}
	return source
		.replace(/<script[\s\S]*?<\/script>/gi, ' ')
		.replace(/<style[\s\S]*?<\/style>/gi, ' ')
		.replace(/<h2[^>]*>/gi, '\n## ')
		.replace(/<\/h2>/gi, '\n')
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<\/p>/gi, '\n')
		.replace(/<strong[^>]*>/gi, '**')
		.replace(/<\/strong>/gi, '**')
		.replace(/<[^>]+>/g, ' ')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/[ \t]+/g, ' ')
}

function field(block: string, labels: string[]) {
	for (const label of labels) {
		const match = block.match(
			new RegExp(`\\*\\*${label}:?\\s*\\*\\*\\s*:?\\s*([^\\n*]+)`, 'i'),
		)
		const value = match?.[1]?.replace(/\s+/g, ' ').trim()
		if (value) {
			return value
		}
	}
	return ''
}

function stateKey(raw: string) {
	const cleaned = raw.replace(/\./g, ' ').replace(/\s+/g, ' ').trim().toLowerCase()
	if (cleaned === 'f c t' || cleaned === 'fct') {
		return 'fct'
	}
	const hyphen = slug(cleaned)
	if (DISTRICTS[hyphen]) {
		return hyphen
	}
	return STATE_SLUG[cleaned] ?? null
}

export function parseNaltfMembers(source: string): OccupancyRow[] {
	const text = htmlToMarkdown(source)
	const rows: OccupancyRow[] = []
	const seen = new Set<string>()
	for (const block of text.split(/(?=##\s+Hon)/i)) {
		const heading = block.match(/##\s+Hon\.?,?\s+([^\n]+)/i)
		const name = heading?.[1]?.replace(/\s+/g, ' ').trim() ?? ''
		if (!name || /member not found/i.test(name) || /not found/i.test(block.slice(0, 40))) {
			continue
		}
		const state = stateKey(field(block, ['State']))
		const constituency = field(block, ['Constituency', 'Contituency'])
		const party = field(block, ['Party', 'party'])
		if (!state || !constituency) {
			continue
		}
		let id = `ng-rep-${state}-${slug(constituency.replace(/federal constituency/i, ''))}`
		if (seen.has(id)) {
			id = `${id}-${slug(name)}`
		}
		seen.add(id)
		rows.push({
			id,
			name,
			party: party || undefined,
		})
	}
	return rows
}

export async function overlayNaltfOccupancy(
	graph: CompiledGraph,
): Promise<CompiledGraph> {
	const res = await fetch(NALTF_MEMBERS_URL, {
		headers: {
			'user-agent': 'Govgraph/0.1 (https://ng-gov-graph.vercel.app)',
		},
		cache: 'no-store',
	})
	if (!res.ok) {
		return graph
	}
	return applyVacantOccupancy(graph, parseNaltfMembers(await res.text()))
}
