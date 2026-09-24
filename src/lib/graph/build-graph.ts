import type {
	Catalog,
	EntitySpec,
	SeatSpec,
	CompiledGraph,
	EdgeType,
	GraphEdge,
	GraphNode,
	NodeType,
} from './types'

function emptyNode(
	partial: Omit<GraphNode, 'aliases' | 'people' | 'edges' | 'connectedNodes'> &
		Partial<Pick<GraphNode, 'aliases' | 'people'>>,
): GraphNode {
	return {
		aliases: [],
		people: [],
		edges: [],
		connectedNodes: [],
		...partial,
	}
}

/** "Director-General of NAFDAC, the head of … Appointed by the President, subject to confirmation by the Senate, under …" */
function seatDescription(seat: SeatSpec, entity: EntitySpec, nameOf: (id: string) => string | undefined) {
	const body = entity.name.replace(/^the /i, '')
	const article = /^(?:the |[A-Z][a-z]+ State$)/.test(entity.name) || /State$/.test(body) ? '' : 'the '
	// An elected office's seat is the office itself; a chamber's seats are its presiding officers and members.
	if (entity.type === 'elected' && !seat.appointedBy) {
		if (entity.name.includes(seat.title)) return entity.description
		return / (?:of|for) /.test(seat.title) ? `${seat.title}, a seat in ${article}${body}.` : `${seat.title} of ${article}${body}.`
	}
	if (!seat.appointedBy) return `${seat.title}, the elected head of ${article}${body}.`
	const head = `${seat.title}, the head of ${article}${body}.`
	const by = nameOf(seat.appointedBy)?.replace(/ of the Federal Republic of Nigeria$/, '') ?? 'the President'
	const confirm = seat.confirmedBy ? `, subject to confirmation by the ${nameOf(seat.confirmedBy)?.replace(/ of Nigeria$/, '') ?? 'Senate'}` : ''
	const basis = seat.basis ? `, under ${seat.basis}` : ''
	return `${head} Appointed by the ${by.replace(/^the /i, '')}${confirm}${basis}.`
}

export function buildGraph(catalog: Catalog): CompiledGraph {
	const nodes: Record<string, GraphNode> = {}
	const edges: Record<string, GraphEdge> = {}
	let edgeSeq = 0

	function addNode(node: GraphNode) {
		nodes[node.id] = node
	}

	function addEdge(type: EdgeType, fromId: string, toId: string) {
		if (!nodes[fromId] || !nodes[toId]) {
			return
		}
		const id = `${type}-${fromId}-${toId}-${++edgeSeq}`
		edges[id] = { id, type, fromId, toId }
		nodes[fromId].edges.push(id)
		nodes[toId].edges.push(id)
		if (!nodes[fromId].connectedNodes.includes(toId)) {
			nodes[fromId].connectedNodes.push(toId)
		}
		if (!nodes[toId].connectedNodes.includes(fromId)) {
			nodes[toId].connectedNodes.push(fromId)
		}
	}

	addNode(
		emptyNode({
			type: 'constituency',
			id: catalog.constituency.id,
			name: catalog.constituency.name,
			description: catalog.constituency.description,
		}),
	)

	for (const entity of catalog.entities) {
		addNode(
			emptyNode({
				type: entity.type,
				id: entity.id,
				name: entity.name,
				description: entity.description,
				sector: entity.sector,
				aliases: entity.aliases ?? [],
				legalSourceUrl: entity.legalSourceUrl,
				officialUrl: entity.officialUrl,
				head: entity.head?.id,
				parentId: entity.parentId,
				layer: entity.layer ?? 'federal',
				people: entity.head?.person ? [entity.head.person] : [],
			}),
		)
	}

	for (const entity of catalog.entities) {
		const seats = [
			...(entity.head ? [entity.head] : []),
			...(entity.extraSeats ?? []),
		]
		for (const seat of seats) {
			addNode(
				emptyNode({
					type: 'dept_head',
					id: seat.id,
					name: seat.title,
					description: seatDescription(seat, entity, (id) => nodes[id]?.name),
					sector: entity.sector,
					parentId: entity.id,
					layer: entity.layer ?? 'federal',
					people: seat.person ? [seat.person] : [],
					legalSourceUrl: entity.legalSourceUrl,
					officialUrl: entity.officialUrl,
					...(seat.unrecorded && !seat.person ? { unrecorded: true } : {}),
				}),
			)
			addEdge('dept_head', entity.id, seat.id)
			if (seat.appointedBy) {
				addEdge('appoints', seat.appointedBy, seat.id)
			}
			if (seat.confirmedBy) {
				addEdge('confirms', seat.confirmedBy, seat.id)
			}
		}
	}

	for (const entity of catalog.entities) {
		if (entity.chairedBy) addEdge('ex_officio', entity.chairedBy, entity.id)
	}

	for (const relation of catalog.elects) {
		addEdge('elects', relation.fromId, relation.toId)
	}
	for (const relation of catalog.oversees) {
		addEdge('oversees', relation.fromId, relation.toId)
	}

	const idsOfType = (type: NodeType) =>
		Object.values(nodes)
			.filter((node) => node.type === type)
			.map((node) => node.id)

	const organizations = Object.values(nodes).filter(
		(node) => node.type !== 'constituency' && node.type !== 'dept_head',
	)

	return {
		nodes,
		edges,
		constituency: catalog.constituency.id,
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
