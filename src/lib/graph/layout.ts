import type { CompiledGraph, GraphNode, Sector } from './types'

export interface PlacedNode {
	id: string
	x: number
	y: number
	node: GraphNode
	arc?: { start: number; end: number }
}

const SECTOR_ARC: Record<Sector, { start: number; end: number }> = {
	executive: { start: -1.1, end: 2.73 },
	independent: { start: 2.78, end: 3.43 },
	judicial: { start: 3.48, end: 4.25 },
	legislative: { start: 4.3, end: 5.15 },
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
			d: sector === 'executive'
				? sculptedWedge(cx, cy, inner, outer, arc.start, arc.end, [-0.78, -0.2, 0.38, 0.96, 2.46])
				: sector === 'legislative' || sector === 'independent'
					? sculptedWedge(cx, cy, inner, outer, arc.start, arc.end, [mid])
					: wedge(cx, cy, inner, outer, arc.start, arc.end),
			labelX: round(cx + Math.cos(mid) * labelRadius),
			labelY: round(cy + Math.sin(mid) * labelRadius),
		}
	})
}

function sculptedWedge(
	cx: number,
	cy: number,
	inner: number,
	outer: number,
	start: number,
	end: number,
	lobes: number[],
) {
	const point = (radius: number, angle: number) =>
		`${round(cx + Math.cos(angle) * radius)} ${round(cy + Math.sin(angle) * radius)}`
	const steps = Math.ceil((end - start) / 0.02)
	const rim = Array.from({ length: steps + 1 }, (_, index) => {
		const angle = start + ((end - start) * index) / steps
		const bulge = Math.max(0, ...lobes.map((center) => {
			const distance = Math.abs(angle - center)
			return distance < 0.18 ? 25 * Math.cos((distance / 0.18) * Math.PI / 2) ** 2 : 0
		}))
		return `${index ? 'L' : 'M'} ${point(outer + bulge, angle)}`
	}).join(' ')
	const large = end - start > Math.PI ? 1 : 0
	return `${rim} L ${point(inner, end)} A ${inner} ${inner} 0 ${large} 0 ${point(inner, start)} Z`
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
	const placeBranch = (
		node: GraphNode,
		start: number,
		end: number,
		radius: number,
		angle = (start + end) / 2,
		childRadius?: number,
	) => {
		placed.push({
			id: node.id,
			x: cx + Math.cos(angle) * radius,
			y: cy + Math.sin(angle) * radius,
			node,
			arc: { start, end },
		})
		const children = childrenOf.get(node.id) ?? []
		const total = children.reduce((sum, child) => sum + weight(child), 0)
		const minSpan = children.length * 17 / outer
		const span = Math.max(end - start, minSpan)
		let cursor = angle - span / 2
		for (const [index, child] of children.entries()) {
			const next = cursor + (span * weight(child)) / total
			const baseRadius = childRadius ?? radius + 64
			placeBranch(child, cursor, next, Math.min(outer, baseRadius + (index % 2) * scale * 0.04))
			cursor = next
		}
	}
	const placeGroup = (
		group: GraphNode[],
		start: number,
		end: number,
		leaders = false,
		legislative = false,
		rootRadius?: number,
		childRadius?: number,
	) => {
		if (!group.length) return
		const total = group.reduce((sum, node) => sum + weight(node), 0)
		let cursor = start
		group.forEach((node) => {
			const next = cursor + ((end - start) * weight(node)) / total
			const radius = rootRadius ?? (leaders ? scale * 0.23 : legislative ? scale * 0.25 : scale * 0.34)
			const angle = (cursor + next) / 2
			placeBranch(node, cursor, next, radius, angle, childRadius)
			cursor = next
		})
	}
	for (const sector of Object.keys(SECTOR_ARC) as Sector[]) {
		const group = parents.filter((node) => (node.sector ?? 'independent') === sector)
		const arc = SECTOR_ARC[sector]
		const leaders = sector === 'executive' ? group.filter((node) => node.type === 'elected') : []
		const regular = group.filter((node) => !leaders.includes(node))
		const states = regular.filter((node) => node.type === 'state')
		const mixed = sector === 'executive' && states.length > 0 && states.length < regular.length
		if (mixed) {
			const split = Math.round(states.length * (1.25 - arc.start) / (arc.end - arc.start - 0.7))
			placeGroup(states.slice(0, split), arc.start, 1.25, false, false, scale * 0.265, scale * 0.315)
			placeGroup(states.slice(split), 1.95, arc.end, false, false, scale * 0.265, scale * 0.315)
		}
		const sectorRegular = mixed ? regular.filter((node) => node.type !== 'state') : regular
		if (leaders.length) {
			const leaderStart = 1.25
			const leaderEnd = 1.95
			const beforeCount = Math.round(
				sectorRegular.length * (leaderStart - arc.start) / (arc.end - arc.start - (leaderEnd - leaderStart)),
			)
			placeGroup(
				sectorRegular.slice(0, beforeCount), arc.start, leaderStart,
				false, false, scale * 0.39, scale * (mixed ? 0.465 : 0.46),
			)
			placeGroup(leaders, leaderStart, leaderEnd, true)
			placeGroup(
				sectorRegular.slice(beforeCount), leaderEnd, arc.end,
				false, false, scale * 0.39, scale * (mixed ? 0.465 : 0.46),
			)
		} else if (sectorRegular.length) {
			placeGroup(
				sectorRegular, arc.start, arc.end, false, sector === 'legislative',
				sector === 'executive' ? scale * 0.39 : undefined,
				sector === 'executive' ? scale * 0.46 : undefined,
			)
		}
	}

	// Dense ministry clusters need a small final separation after ring placement.
	// ponytail: quadratic scan is fine for this catalog; use spatial bins if it grows into thousands of visible nodes.
	for (let pass = 0; pass < 32; pass++) {
		let moved = false
		for (let i = 1; i < placed.length; i++) {
			for (let j = i + 1; j < placed.length; j++) {
				const a = placed[i]
				const b = placed[j]
				const dx = b.x - a.x
				const dy = b.y - a.y
				const distance = Math.hypot(dx, dy)
				if (distance >= 21) continue
				const angle = distance ? Math.atan2(dy, dx) : (i + j) * 2.4
				const shift = (21 - distance) / 2 + 0.05
				a.x -= Math.cos(angle) * shift
				a.y -= Math.sin(angle) * shift
				b.x += Math.cos(angle) * shift
				b.y += Math.sin(angle) * shift
				moved = true
			}
		}
		if (!moved) break
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
		if (!item.arc) return []
		const children = placed.filter(
			(child) => child.node.parentId === item.id && child.node.type !== 'dept_head',
		)
		if (!children.length) return []
		const childRadius = Math.max(...children.map((child) => Math.hypot(child.x - cx, child.y - cy)))
		const inner = Math.max(Math.hypot(item.x - cx, item.y - cy) + 15, childRadius - 15)
		const outer = Math.min(
			Math.min(width, height) * 0.49,
			childRadius + 15,
		)
		return [{
			id: item.id,
			sector: item.node.sector ?? 'independent',
			children: children.length,
			d: lobe(cx, cy, inner, outer, item.arc.start, item.arc.end),
		}]
	})
}

function lobe(cx: number, cy: number, inner: number, outer: number, start: number, end: number) {
	const span = end - start
	const bulge = Math.min(10, span * outer * 0.22)
	const steps = Math.max(8, Math.ceil(span / 0.04))
	const point = (radius: number, angle: number) =>
		`${round(cx + Math.cos(angle) * radius)} ${round(cy + Math.sin(angle) * radius)}`
	const rim = Array.from({ length: steps + 1 }, (_, index) => {
		const progress = index / steps
		const radius = outer - bulge + bulge * Math.sin(Math.PI * progress) ** 2
		return `${index ? 'L' : 'M'} ${point(radius, start + span * progress)}`
	}).join(' ')
	return `${rim} L ${point(inner, end)} A ${inner} ${inner} 0 ${span > Math.PI ? 1 : 0} 0 ${point(inner, start)} Z`
}

function round(value: number) {
	return Math.round(value * 10) / 10
}
