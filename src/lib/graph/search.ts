import type { CompiledGraph, GraphNode } from './types'

/** What people usually mean when a word names several bodies: a ministry, an elected office, a state. */
function central(node: GraphNode) {
	return node.type === 'elected' || node.type === 'state' || /\bministry\b/i.test(node.name)
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * How well a node answers the query, best first: the name itself, then an alias, an officeholder, and only
 * then the description. 0 means no match. "Education" should find the Ministry of Education before the
 * agencies whose descriptions merely mention education.
 */
function score(node: GraphNode, needle: string): number {
	const name = node.name.toLowerCase()
	const word = new RegExp(`\\b${escape(needle)}\\b`)
	// Among name matches a central body gets a lift: "defence" means the Ministry of Defence before the
	// Defence Intelligence Agency. Never enough to pass a better kind of match (an exact name).
	const lift = central(node) ? 12 : 0
	if (name === needle) return 100 + lift
	// An abbreviation people use as the name (INEC, EFCC) counts as the name.
	if (node.aliases.some((alias) => /^[A-Z]{2,6}$/.test(alias) && alias.toLowerCase() === needle)) return 95 + lift
	if (name.startsWith(needle)) return 85 + lift
	if (word.test(name)) return 80 + lift
	if (name.includes(needle)) return 70 + lift
	if (node.aliases.some((alias) => alias.toLowerCase().includes(needle))) return 60
	if (node.people.some((person) => person.name.toLowerCase().includes(needle))) return 50
	if (node.description.toLowerCase().includes(needle)) return 10
	return 0
}

export function searchGraph(graph: CompiledGraph, query: string): GraphNode[] {
	const needle = query.trim().toLowerCase()
	if (!needle) {
		return []
	}
	return Object.values(graph.nodes)
		.map((node) => ({ node, score: score(node, needle) }))
		.filter((hit) => hit.score > 0)
		.sort((a, b) => b.score - a.score || a.node.name.length - b.node.name.length)
		.map((hit) => hit.node)
}
