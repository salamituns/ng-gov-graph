import type { CompiledGraph, GraphNode } from './types'

function haystack(node: GraphNode): string {
	const holders = node.people.map((person) => person.name).join(' ')
	return [node.name, node.description, node.aliases.join(' '), holders]
		.join(' ')
		.toLowerCase()
}

export function searchGraph(graph: CompiledGraph, query: string): GraphNode[] {
	const needle = query.trim().toLowerCase()
	if (!needle) {
		return []
	}
	return Object.values(graph.nodes).filter((node) => haystack(node).includes(needle))
}
