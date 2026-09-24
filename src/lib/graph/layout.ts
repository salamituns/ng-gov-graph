import { STATE_ZONES, ZONE_ORDER } from '@/data/nigeria/states'
import type { CompiledGraph, GraphNode, Sector } from './types'

/**
 * Concentric government map, measured from the CivLab reference: the People at the centre,
 * then rings for the highest authorities, oversight bodies and the administration, with
 * sub-agencies packed as dot clusters in lobes along the rim.
 */
export const MAP = { size: 800, cx: 400, cy: 400 }
export const RING = {
	hub: 50,
	disc: 112,
	authority: 152,
	oversight: 210,
	administration: 290,
	rim: 322,
	cluster: 352,
} as const

const DOT_STEP = 7.6
const GAP = 0.045

export type Tone = 'executive' | 'legislative' | 'judicial'
export type Tier = 'authority' | 'oversight' | 'administration'

export interface PlacedNode {
	id: string
	node: GraphNode
	x: number
	y: number
	angle: number
	/** Glyph half-size. Dots are sub-agencies drawn in clusters. */
	r: number
	kind: 'hub' | 'glyph' | 'dot' | 'assembly' | 'chamber'
	tone: Tone
	/** Assembly and chamber shapes are pills rather than glyphs. */
	w?: number
	h?: number
}

export interface Wedge {
	key: string
	tone: Tone
	label: string
	d: string
	/** Arc for the wedge's title; the renderer turns it into a readable path at the current rotation. */
	labelArc: LabelArc
}

export interface RingGuide {
	key: string
	r: number
	start: number
	end: number
	d: string
}

export interface LabelArc {
	r: number
	start: number
	end: number
}

export interface ArcLabel {
	key: string
	text: string
	arc: LabelArc
	tone: Tone
	size: 'ring' | 'band'
}

export interface Band {
	key: string
	d: string
	tone: Tone
}

export interface GovernmentLayout {
	viewBox: string
	nodes: PlacedNode[]
	wedges: Wedge[]
	rings: RingGuide[]
	bands: Band[]
	labels: ArcLabel[]
}

const SECTOR_ARC: Record<Tone, { start: number; end: number }> = {
	judicial: { start: -2.95, end: -2.12 },
	legislative: { start: -2.08, end: -1.08 },
	executive: { start: -1.04, end: Math.PI * 2 - 2.99 },
}

export function toneOf(node: GraphNode): Tone {
	const sector: Sector = node.sector ?? 'independent'
	return sector === 'legislative' || sector === 'judicial' ? sector : 'executive'
}

function polar(r: number, angle: number) {
	return { x: MAP.cx + Math.cos(angle) * r, y: MAP.cy + Math.sin(angle) * r }
}

function pt(r: number, angle: number) {
	const p = polar(r, angle)
	return `${round(p.x)} ${round(p.y)}`
}

export function arcPath(r: number, start: number, end: number) {
	const large = end - start > Math.PI ? 1 : 0
	return `M ${pt(r, start)} A ${r} ${r} 0 ${large} 1 ${pt(r, end)}`
}

/** Text on the lower half of a circle is drawn along a reversed arc so it is not upside down. */
export function readableArc(r: number, start: number, end: number) {
	const mid = normalize((start + end) / 2)
	if (mid > 0.15 && mid < Math.PI - 0.15) {
		const large = end - start > Math.PI ? 1 : 0
		return `M ${pt(r, end)} A ${r} ${r} 0 ${large} 0 ${pt(r, start)}`
	}
	return arcPath(r, start, end)
}

function normalize(angle: number) {
	const turn = Math.PI * 2
	return ((angle % turn) + turn) % turn
}

function round(value: number) {
	return Math.round(value * 10) / 10
}

export function tierOf(node: GraphNode, graph: CompiledGraph): Tier {
	const tone = toneOf(node)
	if (node.type === 'elected' && !node.parentId) return 'authority'
	if (tone === 'judicial') {
		if (/supreme/.test(node.id)) return 'authority'
		if (node.type === 'commission' || /appeal/.test(node.id)) return 'oversight'
		return 'administration'
	}
	if (tone === 'legislative') return 'administration'
	const parent = node.parentId ? graph.nodes[node.parentId] : undefined
	if (parent?.type === 'elected' && node.type === 'department') return 'administration'
	if (node.sector === 'independent' || node.type === 'commission' || node.type === 'advisory' || node.type === 'corporation') {
		return 'oversight'
	}
	if (/chief-of-staff/.test(node.id)) return 'oversight'
	return 'administration'
}

interface Cluster {
	ownerId: string
	angle: number
	members: GraphNode[]
	rows: number
	cols: number
	/** Angular half-width, including padding, at the cluster radius. */
	half: number
}

function clusterShape(count: number) {
	const rows = count <= 3 ? 1 : count <= 8 ? 2 : count <= 18 ? 3 : 4
	return { rows, cols: Math.ceil(count / rows) }
}

function clusterHalf(count: number) {
	const { cols } = clusterShape(count)
	return (cols * DOT_STEP) / 2 / RING.cluster + 0.02
}

/**
 * Spreads items across an arc. Each item asks for a minimum angular width; spare room is shared
 * evenly, and an over-full arc compresses proportionally.
 */
function spread<T>(items: T[], start: number, end: number, want: (item: T) => number) {
	if (!items.length) return []
	const widths = items.map(want)
	const total = widths.reduce((sum, width) => sum + width, 0)
	const span = end - start
	const extra = Math.max(0, span - total) / items.length
	const scale = total > span ? span / total : 1
	let cursor = start
	return items.map((item, index) => {
		const width = widths[index] * scale + extra
		const angle = cursor + width / 2
		cursor += width
		return { item, angle }
	})
}

function relaxClusters(clusters: Cluster[], bounds: (cluster: Cluster) => { start: number; end: number }) {
	clusters.sort((a, b) => a.angle - b.angle)
	for (let pass = 0; pass < 60; pass++) {
		let moved = false
		for (let i = 0; i < clusters.length - 1; i++) {
			const a = clusters[i]
			const b = clusters[i + 1]
			const overlap = a.half + b.half + 0.01 - (b.angle - a.angle)
			if (overlap > 0) {
				a.angle -= overlap / 2
				b.angle += overlap / 2
				moved = true
			}
		}
		for (const cluster of clusters) {
			const { start, end } = bounds(cluster)
			cluster.angle = Math.min(end - cluster.half, Math.max(start + cluster.half, cluster.angle))
		}
		if (!moved) break
	}
}

function lobedWedge(start: number, end: number, base: number, clusters: Cluster[], labelR: number) {
	const steps = Math.ceil((end - start) / 0.008)
	const shoulder = 0.03
	const rim: string[] = []
	for (let index = 0; index <= steps; index++) {
		const angle = start + ((end - start) * index) / steps
		let r = base
		for (const cluster of clusters) {
			const outer = RING.cluster + (cluster.rows - 1) * DOT_STEP + 13
			const distance = Math.abs(angle - cluster.angle) - cluster.half
			if (distance <= 0) r = Math.max(r, outer)
			else if (distance < shoulder) {
				const t = distance / shoulder
				r = Math.max(r, base + (outer - base) * (1 - t * t * (3 - 2 * t)))
			}
		}
		rim.push(`${index ? 'L' : 'M'} ${pt(r, angle)}`)
	}
	const large = end - start > Math.PI ? 1 : 0
	return {
		d: `${rim.join(' ')} L ${pt(RING.disc, end)} A ${RING.disc} ${RING.disc} 0 ${large} 0 ${pt(RING.disc, start)} Z`,
		labelArc: { r: labelR, start, end },
	}
}

function glyphSize(node: GraphNode, descendants: number) {
	if (node.type === 'elected') return /vice/.test(node.id) ? 11 : 15
	if (node.type === 'court') return /supreme/.test(node.id) ? 10 : 8.5
	if (node.type === 'department') return 7 + Math.min(4, Math.sqrt(descendants) * 0.9)
	return 7.5
}

export function layoutGovernment(graph: CompiledGraph, options: { layer?: 'federal' | 'state' } = {}): GovernmentLayout {
	return options.layer === 'state' ? layoutStates(graph) : layoutFederal(graph)
}

function childrenIndex(graph: CompiledGraph) {
	const children = new Map<string, GraphNode[]>()
	for (const node of Object.values(graph.nodes)) {
		if (!node.parentId || node.type === 'dept_head' || node.type === 'constituency') continue
		const list = children.get(node.parentId) ?? []
		list.push(node)
		children.set(node.parentId, list)
	}
	return children
}

function hubNode(graph: CompiledGraph): PlacedNode[] {
	const hub = graph.nodes[graph.constituency]
	return hub ? [{ id: hub.id, node: hub, x: MAP.cx, y: MAP.cy, angle: 0, r: RING.hub, kind: 'hub', tone: 'executive' }] : []
}

function layoutFederal(graph: CompiledGraph): GovernmentLayout {
	const children = childrenIndex(graph)

	const nodes = hubNode(graph)
	const orgs = Object.values(graph.nodes).filter(
		(node) => node.type !== 'dept_head' && node.type !== 'constituency' && node.layer !== 'state',
	)
	const byId = new Map(orgs.map((node) => [node.id, node]))
	// Offices under an elected office (the OSGF under the President, the Clerk under the National Assembly) are placed as bodies in their own right.
	const isRoot = (node: GraphNode) => {
		const parent = node.parentId ? byId.get(node.parentId) : undefined
		if (!parent) return true
		return parent.type === 'elected' && !parent.parentId && node.type !== 'elected'
	}
	// Sub-agencies cluster under their nearest placed ancestor; the walk stops at bodies placed in their own right.
	const descendants = (id: string): GraphNode[] =>
		(children.get(id) ?? []).filter((child) => !isRoot(child)).flatMap((child) => [child, ...descendants(child.id)])
	const assembly = orgs.find((node) => node.type === 'elected' && toneOf(node) === 'legislative' && !node.parentId)
	const chambers = assembly ? (children.get(assembly.id) ?? []).filter((node) => node.type === 'elected') : []
	const roots = orgs.filter((node) => isRoot(node) && node !== assembly)

	const clusters: Cluster[] = []
	const rings: RingGuide[] = []
	const wedges: Wedge[] = []
	const bands: Band[] = []
	const labels: ArcLabel[] = []
	const place = (node: GraphNode, r: number, angle: number) => {
		const p = polar(r, angle)
		const below = descendants(node.id)
		nodes.push({ id: node.id, node, x: p.x, y: p.y, angle, r: glyphSize(node, below.length), kind: 'glyph', tone: toneOf(node) })
		if (below.length) {
			const { rows, cols } = clusterShape(below.length)
			clusters.push({ ownerId: node.id, angle, members: below, rows, cols, half: clusterHalf(below.length) })
		}
	}
	const want = (node: GraphNode, r: number, min: number) => {
		const count = descendants(node.id).length
		return Math.max(min / r, count ? clusterHalf(count) * 2 * (RING.cluster / r) * 0.72 : 0)
	}

	for (const tone of ['executive', 'legislative', 'judicial'] as const) {
		const arc = SECTOR_ARC[tone]
		const inSector = roots.filter((node) => toneOf(node) === tone)
		const tiers: Record<Tier, GraphNode[]> = { authority: [], oversight: [], administration: [] }
		for (const node of inSector) tiers[tierOf(node, graph)].push(node)

		if (tone === 'executive') {
			const leaders = tiers.authority.sort((a, b) => (/vice/.test(a.id) ? 1 : 0) - (/vice/.test(b.id) ? 1 : 0))
			leaders.forEach((node, index) => place(node, RING.authority, 1.64 - index * 0.28))
			const oversight = tiers.oversight
			const right = oversight.slice(0, Math.ceil(oversight.length / 2))
			const left = oversight.slice(right.length)
			for (const { item, angle } of spread(right, arc.start + GAP, 1.2, (node) => want(node, RING.oversight, 34))) place(item, RING.oversight, angle)
			for (const { item, angle } of spread(left, 2.02, arc.end - GAP, (node) => want(node, RING.oversight, 34))) place(item, RING.oversight, angle)

			// The OSGF coordinates the ministries, so it sits directly beneath the President.
			const admin = tiers.administration
			const pivot = admin.find((node) => /sgf/.test(node.id))
			const rest = admin.filter((node) => node !== pivot)
			const half = Math.ceil(rest.length / 2)
			const pivotAngle = 1.57
			const pivotWidth = pivot ? want(pivot, RING.administration, 34) : 0
			if (pivot) place(pivot, RING.administration, pivotAngle)
			const rightSide = spread(rest.slice(0, half), arc.start + GAP, pivotAngle - pivotWidth / 2, (node) => want(node, RING.administration, 30))
			const leftSide = spread(rest.slice(half), pivotAngle + pivotWidth / 2, arc.end - GAP, (node) => want(node, RING.administration, 30))
			for (const { item, angle } of [...rightSide, ...leftSide]) place(item, RING.administration, angle)

			const cabinet = [...rightSide, ...leftSide].map((entry) => entry.angle).concat(pivot ? [pivotAngle] : [])
			if (cabinet.length) {
				const start = Math.min(...cabinet) - 0.05
				const end = Math.max(...cabinet) + 0.05
				bands.push({ key: 'cabinet', tone, d: bandPath(RING.administration - 21, RING.administration + 21, start, end) })
				labels.push({ key: 'cabinet', text: 'CABINET', tone, size: 'band', arc: { r: RING.administration + 26, start: 0.25, end: 0.75 } })
			}
		} else if (tone === 'legislative') {
			const mid = (arc.start + arc.end) / 2
			if (assembly) {
				const p = polar(RING.authority + 8, mid)
				nodes.push({ id: assembly.id, node: assembly, x: p.x, y: p.y, angle: mid, r: 20, w: 92, h: 42, kind: 'assembly', tone })
				chambers.slice(0, 2).forEach((chamber, index) => {
					nodes.push({
						id: chamber.id, node: chamber, x: p.x + (index ? 21 : -21), y: p.y, angle: mid, r: 13, w: 38, h: 30, kind: 'chamber', tone,
					})
				})
				labels.push({ key: 'assembly', text: 'NATIONAL ASSEMBLY', tone, size: 'band', arc: { r: RING.authority + 38, start: mid - 0.4, end: mid + 0.4 } })
			}
			const rest = [...tiers.oversight, ...tiers.administration]
			for (const { item, angle } of spread(rest, arc.start + GAP, arc.end - GAP, (node) => want(node, RING.administration, 44))) {
				place(item, RING.administration, angle)
			}
		} else {
			for (const node of tiers.authority) place(node, RING.authority + 6, (arc.start + arc.end) / 2)
			for (const { item, angle } of spread(tiers.oversight, arc.start + GAP, arc.end - GAP, (node) => want(node, RING.oversight, 40))) {
				place(item, RING.oversight, angle)
			}
			for (const { item, angle } of spread(tiers.administration, arc.start + GAP, arc.end - GAP, (node) => want(node, RING.administration, 44))) {
				place(item, RING.administration, angle)
			}
		}
	}

	const sectorOf = (cluster: Cluster) => SECTOR_ARC[toneOf(byId.get(cluster.ownerId)!)]
	for (const tone of ['executive', 'legislative', 'judicial'] as const) {
		relaxClusters(clusters.filter((cluster) => toneOf(byId.get(cluster.ownerId)!) === tone), (cluster) => {
			const arc = sectorOf(cluster)
			return { start: arc.start + 0.02, end: arc.end - 0.02 }
		})
	}
	for (const cluster of clusters) {
		cluster.members.forEach((member, index) => {
			const row = index % cluster.rows
			const col = Math.floor(index / cluster.rows)
			const r = RING.cluster + row * DOT_STEP
			const angle = cluster.angle + ((col - (cluster.cols - 1) / 2) * DOT_STEP) / r
			const p = polar(r, angle)
			nodes.push({ id: member.id, node: member, x: p.x, y: p.y, angle, r: 2.7, kind: 'dot', tone: toneOf(member) })
		})
	}

	for (const tone of ['judicial', 'legislative', 'executive'] as const) {
		const arc = SECTOR_ARC[tone]
		const own = clusters.filter((cluster) => toneOf(byId.get(cluster.ownerId)!) === tone)
		const outer = Math.max(RING.rim, ...own.map((cluster) => RING.cluster + (cluster.rows - 1) * DOT_STEP + 13))
		const shape = lobedWedge(arc.start, arc.end, RING.rim, own, outer + 16)
		wedges.push({ key: tone, tone, label: tone.toUpperCase(), ...shape })
		for (const [key, r] of [['authority', RING.authority], ['oversight', RING.oversight], ['administration', RING.administration]] as const) {
			if (tone !== 'executive' && key === 'authority') continue
			rings.push({ key: `${tone}-${key}`, r, start: arc.start + 0.02, end: arc.end - 0.02, d: arcPath(r, arc.start + 0.02, arc.end - 0.02) })
		}
	}
	labels.push(
		{ key: 'authority', text: 'HIGHEST AUTHORITY', tone: 'executive', size: 'ring', arc: { r: RING.authority - 12, start: 0.3, end: 1.25 } },
		{ key: 'oversight', text: 'OVERSIGHT', tone: 'executive', size: 'ring', arc: { r: RING.oversight - 11, start: 1.36, end: 1.78 } },
		{ key: 'administration', text: 'ADMINISTRATION', tone: 'executive', size: 'ring', arc: { r: RING.administration - 30, start: 1.2, end: 1.94 } },
	)

	return finish({ nodes, wedges, rings, bands, labels })
}

function bandPath(inner: number, outer: number, start: number, end: number) {
	const large = end - start > Math.PI ? 1 : 0
	const cap = (outer - inner) / 2
	return [
		`M ${pt(outer, start)}`,
		`A ${outer} ${outer} 0 ${large} 1 ${pt(outer, end)}`,
		`A ${cap} ${cap} 0 0 1 ${pt(inner, end)}`,
		`A ${inner} ${inner} 0 ${large} 0 ${pt(inner, start)}`,
		`A ${cap} ${cap} 0 0 1 ${pt(outer, start)}`,
		'Z',
	].join(' ')
}

function finish(parts: Omit<GovernmentLayout, 'viewBox'>): GovernmentLayout {
	for (const item of parts.nodes) {
		item.x = round(item.x)
		item.y = round(item.y)
	}
	return { viewBox: '-24 -24 848 848', ...parts }
}

/** The States layer: the six geopolitical zones as wedges, each state with its House of Assembly. */
function layoutStates(graph: CompiledGraph): GovernmentLayout {
	const nodes = hubNode(graph)
	const states = Object.values(graph.nodes).filter((node) => node.type === 'state')
	const children = childrenIndex(graph)
	const wedges: Wedge[] = []
	const rings: RingGuide[] = []
	const labels: ArcLabel[] = []
	const zoneOf = (node: GraphNode) => STATE_ZONES[node.id] ?? 'North Central'
	const total = states.length
	let cursor = -Math.PI / 2 - (Math.PI * 2 * (states.filter((node) => zoneOf(node) === ZONE_ORDER[0]).length / total)) / 2
	for (const zone of ZONE_ORDER) {
		const members = states.filter((node) => zoneOf(node) === zone).sort((a, b) => a.name.localeCompare(b.name))
		if (!members.length) continue
		const span = (Math.PI * 2 * members.length) / total
		const start = cursor + GAP / 2
		const end = cursor + span - GAP / 2
		cursor += span
		const shape = lobedWedge(start, end, RING.rim + 14, [], RING.rim + 30)
		wedges.push({ key: zone, tone: 'executive', label: zone.toUpperCase(), ...shape })
		rings.push({ key: `${zone}-states`, r: 236, start, end, d: arcPath(236, start, end) })
		for (const { item, angle } of spread(members, start + 0.02, end - 0.02, () => 0.1)) {
			const p = polar(236, angle)
			nodes.push({ id: item.id, node: item, x: p.x, y: p.y, angle, r: 8, kind: 'glyph', tone: 'executive' })
			for (const child of children.get(item.id) ?? []) {
				const q = polar(302, angle)
				nodes.push({ id: child.id, node: child, x: q.x, y: q.y, angle, r: 6.5, kind: 'glyph', tone: toneOf(child) })
			}
		}
	}
	labels.push({ key: 'governors', text: 'STATES & GOVERNORS', tone: 'executive', size: 'ring', arc: { r: 236 - 18, start: 1.25, end: 1.9 } })
	labels.push({ key: 'assemblies', text: 'HOUSES OF ASSEMBLY', tone: 'legislative', size: 'ring', arc: { r: 302 + 18, start: 1.2, end: 1.94 } })
	return finish({ nodes, wedges, rings, bands: [], labels })
}
