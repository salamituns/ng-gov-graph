import type { CompiledGraph } from './types'

export function neighborhood(graph: CompiledGraph, id: string): CompiledGraph {
	const focus = graph.nodes[id]
	const ids = new Set<string>([graph.constituency, id])
	if (focus) {
		for (const other of focus.connectedNodes) {
			ids.add(other)
		}
		if (focus.parentId) {
			ids.add(focus.parentId)
		}
	}
	for (const node of Object.values(graph.nodes)) {
		if (node.parentId === id) {
			ids.add(node.id)
		}
	}
	const nodes = Object.fromEntries(
		Object.entries(graph.nodes).filter(([nodeId]) => ids.has(nodeId)),
	)
	const edges = Object.fromEntries(
		Object.entries(graph.edges).filter(
			(entry) => ids.has(entry[1].fromId) && ids.has(entry[1].toId),
		),
	)
	return { ...graph, nodes, edges }
}
