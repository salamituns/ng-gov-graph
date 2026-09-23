import type { CompiledGraph, GraphNode, Sector } from './types'

export interface PlacedNode {
	id: string
	x: number
	y: number
	node: GraphNode
	arc?: { start: number; end: number }
}

const SECTOR_ARC: Record<Sector, { start: number; end: number }> = {
	executive: { start: -0.84, end: 1.86 },
	independent: { start: 1.94, end: 2.64 },
	judicial: { start: 2.72, end: 3.74 },
	legislative: { start: 3.82, end: 5.36 },
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
	const outer = Math.min(width, height) * 0.49
	const inner = Math.min(width, height) * 0.16
	return (Object.keys(SECTOR_ARC) as Sector[]).map((sector) => {
		const arc = SECTOR_ARC[sector]
		const mid = (arc.start + arc.end) / 2
		const labelRadius = outer * (sector === 'judicial' || sector === 'executive' ? 1.07 : 0.9)
		return {
			sector,
			d: wedge(cx, cy, inner, outer, arc.start, arc.end),
			labelX: round(cx + Math.cos(mid) * labelRadius),
			labelY: round(cy + Math.sin(mid) * labelRadius),
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

	const scale = Math.min(width, height)
	const outer = scale * 0.49
	const weight = (node: GraphNode): number => {
		const children = childrenOf.get(node.id) ?? []
		return Math.max(1, children.reduce((sum, child) => sum + weight(child), 0))
	}
	const placeBranch = (node: GraphNode, start: number, end: number, radius: number) => {
		const angle = (start + end) / 2
		placed.push({
			id: node.id,
			x: cx + Math.cos(angle) * radius,
			y: cy + Math.sin(angle) * radius,
			node,
			arc: { start, end },
		})
		const children = childrenOf.get(node.id) ?? []
		const total = children.reduce((sum, child) => sum + weight(child), 0)
		let cursor = start
		for (const child of children) {
			const next = cursor + ((end - start) * weight(child)) / total
			placeBranch(child, cursor, next, Math.min(outer, radius + 64))
			cursor = next
		}
	}
	const placeGroup = (group: GraphNode[], start: number, end: number, leaders = false) => {
		const total = group.reduce((sum, node) => sum + weight(node), 0)
		let cursor = start
		group.forEach((node, index) => {
			const next = cursor + ((end - start) * weight(node)) / total
			const radius = leaders ? scale * 0.23 : scale * 0.3 + (index % 3) * 26
			placeBranch(node, cursor, next, radius)
			cursor = next
		})
	}
	for (const sector of Object.keys(SECTOR_ARC) as Sector[]) {
		const group = parents.filter((node) => (node.sector ?? 'independent') === sector)
		const arc = SECTOR_ARC[sector]
		const leaders = sector === 'executive' ? group.filter((node) => node.type === 'elected') : []
		const regular = group.filter((node) => !leaders.includes(node))
		const leaderStart = leaders.length ? arc.end - 0.9 : arc.end
		if (regular.length) placeGroup(regular, arc.start, leaderStart)
		if (leaders.length) placeGroup(leaders, leaderStart, arc.end, true)
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
			const distance = Math.hypot(item.x - cx, item.y - cy)
			const offset = distance + 26 > Math.min(width, height) * 0.47 ? -26 : 26
			holders.push({
				id: `holder:${item.id}`,
				x: item.x + Math.cos(angle) * offset,
				y: item.y + Math.sin(angle) * offset,
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

export function organizationBands(placed: PlacedNode[], width: number, height: number) {
	const cx = width / 2
	const cy = height / 2
	return placed.flatMap((item) => {
		if (item.node.sector !== 'executive' || !item.arc || item.node.type === 'elected') return []
		const children = placed.filter((child) => child.node.parentId === item.id && child.node.type !== 'dept_head')
		if (children.length < 3) return []
		const inner = Math.hypot(item.x - cx, item.y - cy) + 15
		const outer = Math.min(Math.min(width, height) * 0.49, Math.max(...children.map((child) => Math.hypot(child.x - cx, child.y - cy))) + 15)
		return [{ id: item.id, d: wedge(cx, cy, inner, outer, item.arc.start, item.arc.end) }]
	})
}

function round(value: number) {
	return Math.round(value * 10) / 10
}
