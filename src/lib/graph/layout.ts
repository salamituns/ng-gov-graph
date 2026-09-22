import type { CompiledGraph, GraphNode, Sector } from './types'

export interface PlacedNode {
	id: string
	x: number
	y: number
	node: GraphNode
}

const SECTOR_ARC: Record<Sector, { start: number; end: number }> = {
	executive: { start: -Math.PI * 0.08, end: Math.PI * 0.82 },
	legislative: { start: Math.PI * 0.88, end: Math.PI * 1.12 },
	judicial: { start: Math.PI * 1.16, end: Math.PI * 1.38 },
	independent: { start: Math.PI * 1.44, end: Math.PI * 1.9 },
}

export interface SectorBand {
	sector: Sector
	d: string
	labelX: number
	labelY: number
}

export function sectorBands(width: number, height: number): SectorBand[] {
	const cx = width / 2
	const cy = height / 2
	const outer = Math.min(width, height) * 0.47
	const inner = Math.min(width, height) * 0.16
	return (Object.keys(SECTOR_ARC) as Sector[]).map((sector) => {
		const arc = SECTOR_ARC[sector]
		const mid = (arc.start + arc.end) / 2
		return {
			sector,
			d: wedge(cx, cy, inner, outer, arc.start, arc.end),
			labelX: round(cx + Math.cos(mid) * outer * 0.9),
			labelY: round(cy + Math.sin(mid) * outer * 0.9),
		}
	})
}

function wedge(
	cx: number,
	cy: number,
	inner: number,
	outer: number,
	start: number,
	end: number,
) {
	const large = end - start > Math.PI ? 1 : 0
	const point = (radius: number, angle: number) => {
		const x = round(cx + Math.cos(angle) * radius)
		const y = round(cy + Math.sin(angle) * radius)
		return `${x} ${y}`
	}
	return `M ${point(outer, start)} A ${outer} ${outer} 0 ${large} 1 ${point(outer, end)} L ${point(inner, end)} A ${inner} ${inner} 0 ${large} 0 ${point(inner, start)} Z`
}

export function layoutGraph(
	graph: CompiledGraph,
	width: number,
	height: number,
	options?: { mode?: 'orgs' | 'people' | 'chamber' },
): PlacedNode[] {
	const cx = width / 2
	const cy = height / 2
	const hub = graph.nodes[graph.constituency]
	const placed: PlacedNode[] = hub
		? [{ id: hub.id, x: round(cx), y: round(cy), node: hub }]
		: []

	const orgs = Object.values(graph.nodes).filter(
		(node) => node.type !== 'constituency' && node.type !== 'dept_head',
	)

	const orgIds = new Set(orgs.map((node) => node.id))
	const parents = orgs.filter(
		(node) => !node.parentId || !orgIds.has(node.parentId),
	)
	const childrenOf = new Map<string, GraphNode[]>()
	for (const node of orgs) {
		if (!node.parentId || !orgIds.has(node.parentId)) {
			continue
		}
		const list = childrenOf.get(node.parentId) ?? []
		list.push(node)
		childrenOf.set(node.parentId, list)
	}

	const outer = Math.min(width, height) * 0.36
	const inner = Math.min(width, height) * 0.24
	for (const sector of Object.keys(SECTOR_ARC) as Sector[]) {
		const group = parents.filter((node) => (node.sector ?? 'independent') === sector)
		const arc = SECTOR_ARC[sector]
		group.forEach((node, index) => {
			const tier = index % 3
			const slot = Math.ceil(group.length / 3)
			const column = Math.floor(index / 3)
			const start = arc.start + ((arc.end - arc.start) * column) / slot
			const end = arc.start + ((arc.end - arc.start) * (column + 1)) / slot
			const angle = (start + end) / 2
			const radius = outer - tier * 39
			const parentPoint = {
				id: node.id,
				x: cx + Math.cos(angle) * radius,
				y: cy + Math.sin(angle) * radius,
				node,
			}
			placed.push(parentPoint)
			const children = childrenOf.get(node.id) ?? []
			children.forEach((child, childIndex) => {
				const spread = Math.min(end - start, 0.35)
				const t = children.length === 1 ? 0.5 : childIndex / (children.length - 1)
				const childAngle = angle - spread / 2 + spread * t
				placed.push({
					id: child.id,
					x: cx + Math.cos(childAngle) * Math.min(inner, radius - 27),
					y: cy + Math.sin(childAngle) * Math.min(inner, radius - 27),
					node: child,
				})
			})
		})
	}

	if (options?.mode === 'people') {
		const holders: PlacedNode[] = []
		for (const item of placed) {
			if (item.node.type === 'constituency' || item.node.type === 'dept_head') {
				continue
			}
			const person = item.node.people[0]
			if (!person) {
				continue
			}
			const angle = Math.atan2(item.y - cy, item.x - cx)
			holders.push({
				id: `holder:${item.id}`,
				x: item.x + Math.cos(angle) * 26,
				y: item.y + Math.sin(angle) * 26,
				node: {
					...item.node,
					id: `holder:${item.id}`,
					name: person.name,
					type: 'dept_head',
					people: [person],
					parentId: item.id,
				},
			})
		}
		placed.push(...holders)
	}
	if (options?.mode === 'chamber') {
		const byParent = new Map(placed.map((item) => [item.id, item]))
		const holders: PlacedNode[] = []
		for (const node of Object.values(graph.nodes)) {
			if (node.type !== 'dept_head' || node.people.length === 0) {
				continue
			}
			if (
				!node.id.startsWith('ng-senator-') &&
				!node.id.startsWith('ng-rep-')
			) {
				continue
			}
			const parent = node.parentId ? byParent.get(node.parentId) : undefined
			if (!parent) {
				continue
			}
			holders.push({
				id: `holder:${node.id}`,
				x: parent.x + (holders.length % 12) * 8 - 40,
				y: parent.y + Math.floor(holders.length / 12) * 8 + 20,
				node: {
					...node,
					id: `holder:${node.id}`,
					name: node.people[0].name,
				},
			})
		}
		placed.push(...holders)
	}
	for (const item of placed) {
		item.x = round(item.x)
		item.y = round(item.y)
	}
	return placed
}

function round(value: number) {
	return Math.round(value * 10) / 10
}
