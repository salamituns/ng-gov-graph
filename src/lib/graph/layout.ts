import type { CompiledGraph, GraphNode, Sector } from './types'

export interface PlacedNode {
	id: string
	x: number
	y: number
	node: GraphNode
}

const SECTOR_ARC: Record<Sector, { start: number; end: number }> = {
	executive: { start: -Math.PI * 0.15, end: Math.PI * 0.55 },
	legislative: { start: Math.PI * 0.58, end: Math.PI * 0.95 },
	judicial: { start: Math.PI * 0.98, end: Math.PI * 1.28 },
	independent: { start: Math.PI * 1.32, end: Math.PI * 1.82 },
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
	const bySector: Record<Sector, GraphNode[]> = {
		executive: [],
		legislative: [],
		judicial: [],
		independent: [],
	}
	for (const node of orgs) {
		bySector[node.sector ?? 'independent'].push(node)
	}

	const radius = Math.min(width, height) * 0.38
	for (const sector of Object.keys(bySector) as Sector[]) {
		const group = bySector[sector]
		const arc = SECTOR_ARC[sector]
		group.forEach((node, index) => {
			const t = group.length === 1 ? 0.5 : index / (group.length - 1)
			const angle = arc.start + (arc.end - arc.start) * t
			const wobble = node.parentId ? 0.78 : 1
			placed.push({
				id: node.id,
				x: cx + Math.cos(angle) * radius * wobble,
				y: cy + Math.sin(angle) * radius * wobble,
				node,
			})
		})
	}

	relax(placed, cx, cy, Math.min(width, height))
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
			holders.push({
				id: `holder:${item.id}`,
				x: item.x + 16,
				y: item.y - 16,
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
		relax(placed, cx, cy, Math.min(width, height))
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
		relax(placed, cx, cy, Math.min(width, height))
	}
	for (const item of placed) {
		item.x = round(item.x)
		item.y = round(item.y)
	}
	return placed
}

function relax(placed: PlacedNode[], cx: number, cy: number, size: number) {
	const minDist = Math.max(18, size * 0.028)
	for (let tick = 0; tick < 40; tick += 1) {
		for (let i = 0; i < placed.length; i += 1) {
			for (let j = i + 1; j < placed.length; j += 1) {
				const a = placed[i]
				const b = placed[j]
				const dx = b.x - a.x
				const dy = b.y - a.y
				const dist = Math.hypot(dx, dy) || 0.01
				if (dist >= minDist) {
					continue
				}
				const push = ((minDist - dist) / dist) * 0.35
				if (a.node.type !== 'constituency') {
					a.x -= dx * push
					a.y -= dy * push
				}
				if (b.node.type !== 'constituency') {
					b.x += dx * push
					b.y += dy * push
				}
			}
		}
	}
	for (const item of placed) {
		if (item.node.type === 'constituency') {
			item.x = cx
			item.y = cy
		}
	}
}

function round(value: number) {
	return Math.round(value * 10) / 10
}
