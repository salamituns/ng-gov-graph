import type { CompiledGraph, GraphNode } from './types'

/** Seat names held in more than one body ("Director-General", "Honourable Minister"), per graph. */
const shared = new WeakMap<CompiledGraph, Set<string>>()

function sharedNames(graph: CompiledGraph) {
	let names = shared.get(graph)
	if (!names) {
		const counts = new Map<string, number>()
		for (const node of Object.values(graph.nodes)) if (node.type === 'dept_head') counts.set(node.name, (counts.get(node.name) ?? 0) + 1)
		names = new Set([...counts].filter(([, count]) => count > 1).map(([name]) => name))
		shared.set(graph, names)
	}
	return names
}

/** A body's name in a title: its acronym when it has one (EFCC), else its name without "Federal Ministry of". */
function bodyName(body: GraphNode) {
	const acronym = body.aliases.find((alias) => /^[A-Z]{2,8}$/.test(alias))
	return acronym ?? body.name.replace(/^(The )?(Federal )?Ministry of /, '')
}

/**
 * A seat's name that says which seat it is. Many seats share a bare title (708 seats, 37 of them
 * "Director-General"), which reads as nothing in a search result, a tab or the sheet's header, so a shared
 * title gains its body: "Minister of Works", "Minister of State for Works", "Director-General, NAFDAC".
 * A title that is already unique ("Attorney-General of the Federation and Minister of Justice") is kept.
 */
export function seatTitle(graph: CompiledGraph, node: GraphNode): string {
	if (node.type !== 'dept_head' || !sharedNames(graph).has(node.name)) return node.name
	const body = node.parentId ? graph.nodes[node.parentId] : undefined
	if (!body) return node.name
	const ministry = /Ministry of /.test(body.name) ? body.name.replace(/^(The )?(Federal )?Ministry of /, '') : undefined
	if (ministry && node.name === 'Honourable Minister') return `Minister of ${ministry}`
	if (ministry && node.name === 'Honourable Minister of State') return `Minister of State for ${ministry}`
	return `${node.name}, ${bodyName(body)}`
}
