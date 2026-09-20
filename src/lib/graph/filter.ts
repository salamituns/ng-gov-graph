import type { CompiledGraph, GraphLayer, NodeType } from './types'

export type LayerFilter = GraphLayer | 'states' | 'all'

export function filterGraph(
	graph: CompiledGraph,
	layer: LayerFilter,
): CompiledGraph {
	if (layer === 'all') {
		return graph
	}

	const wanted: GraphLayer = layer === 'states' ? 'state' : layer

	const keep = new Set(
		Object.values(graph.nodes)
			.filter((node) => node.type === 'constituency' || node.layer === wanted)
			.map((node) => node.id),
	)

	const nodes = Object.fromEntries(
		Object.entries(graph.nodes)
			.filter(([id]) => keep.has(id))
			.map(([id, node]) => [
				id,
				{
					...node,
					connectedNodes: node.connectedNodes.filter((connected) =>
						keep.has(connected),
					),
					edges: node.edges.filter((edgeId) => {
						const edge = graph.edges[edgeId]
						return Boolean(edge && keep.has(edge.fromId) && keep.has(edge.toId))
					}),
				},
			]),
	)
	const edges = Object.fromEntries(
		Object.entries(graph.edges).filter(
			([, edge]) => keep.has(edge.fromId) && keep.has(edge.toId),
		),
	)

	const idsOfType = (type: NodeType) =>
		Object.values(nodes)
			.filter((node) => node.type === type)
			.map((node) => node.id)

	const organizations = Object.values(nodes).filter(
		(node) => node.type !== 'constituency' && node.type !== 'dept_head',
	)

	return {
		...graph,
		nodes,
		edges,
		elected: idsOfType('elected'),
		departments: idsOfType('department'),
		commissions: idsOfType('commission'),
		advisories: idsOfType('advisory'),
		courts: idsOfType('court'),
		corporations: idsOfType('corporation'),
		deptHeads: idsOfType('dept_head'),
		satellites: organizations
			.filter((node) => Boolean(node.parentId))
			.map((node) => node.id),
	}
}

export function parseLayer(value: string | undefined): LayerFilter {
	if (value === 'states' || value === 'state') {
		return 'state'
	}
	if (value === 'all') {
		return 'all'
	}
	return 'federal'
}
