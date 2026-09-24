import type { CompiledGraph, EdgeType } from './types'

export type AuthorityType = Extract<EdgeType, 'elects' | 'appoints' | 'confirms' | 'oversees'> | 'contains'

export interface AuthorityLink {
	fromId: string
	toId: string
	type: AuthorityType
}

const AUTHORITY: ReadonlySet<EdgeType> = new Set(['elects', 'appoints', 'confirms', 'oversees'])

/** Seats render inside their organization, so a link to a seat is drawn to the organization. */
export function organizationOf(graph: CompiledGraph, id: string) {
	const node = graph.nodes[id]
	return node?.type === 'dept_head' && node.parentId ? node.parentId : id
}

/**
 * Walks upward from an entity to the People: who elects, appoints, confirms or oversees it,
 * then who does the same for them. Bodies with no direct appointer inherit their container's chain,
 * so the Senate reaches the People through the National Assembly.
 */
export function authorityChain(graph: CompiledGraph, startId: string): AuthorityLink[] {
	const incoming = new Map<string, AuthorityLink[]>()
	for (const edge of Object.values(graph.edges)) {
		if (!AUTHORITY.has(edge.type)) continue
		const list = incoming.get(edge.toId) ?? []
		list.push({ fromId: edge.fromId, toId: edge.toId, type: edge.type as AuthorityType })
		incoming.set(edge.toId, list)
	}

	const links = new Map<string, AuthorityLink>()
	const seen = new Set<string>()
	const visit = (id: string) => {
		const orgId = organizationOf(graph, id)
		if (seen.has(orgId)) return
		seen.add(orgId)
		const org = graph.nodes[orgId]
		if (!org) return
		const seats = new Set([orgId, org.head].filter((seat): seat is string => Boolean(seat)))
		const direct = [...seats].flatMap((seat) => incoming.get(seat) ?? [])
		for (const link of direct) {
			const fromId = organizationOf(graph, link.fromId)
			// A chamber electing its own presiding officer is not an outside source of authority.
			if (fromId === orgId) continue
			links.set(`${fromId}>${orgId}>${link.type}`, { fromId, toId: orgId, type: link.type })
			visit(fromId)
		}
		const parent = org.parentId && graph.nodes[org.parentId] ? org.parentId : undefined
		const hasSource = direct.some((link) => organizationOf(graph, link.fromId) !== orgId)
		if (parent && !hasSource) {
			links.set(`${parent}>${orgId}>contains`, { fromId: parent, toId: orgId, type: 'contains' })
			visit(parent)
		}
	}
	visit(startId)
	return [...links.values()]
}

/** Every organization below an entity, used to fan the selection out to its sub-agencies. */
export function descendantsOf(graph: CompiledGraph, id: string): string[] {
	const children = new Map<string, string[]>()
	for (const node of Object.values(graph.nodes)) {
		if (!node.parentId || node.type === 'dept_head') continue
		const list = children.get(node.parentId) ?? []
		list.push(node.id)
		children.set(node.parentId, list)
	}
	const out: string[] = []
	const walk = (current: string) => {
		for (const child of children.get(current) ?? []) {
			out.push(child)
			walk(child)
		}
	}
	walk(id)
	return out
}
