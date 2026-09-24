'use client'

import { useMemo, useState } from 'react'
import { authorityChain, descendantsOf, type AuthorityLink } from '@/lib/graph/authority'
import { glyphPath, sealPath, seatOffset } from '@/lib/graph/glyph'
import { layoutGovernment, MAP, RING, type PlacedNode, type Tone } from '@/lib/graph/layout'
import type { CompiledGraph, NodeType } from '@/lib/graph/types'

export const ENTITY_LABEL: Partial<Record<NodeType, string>> = {
	elected: 'Elected offices',
	department: 'Agencies & departments',
	dept_head: 'Office holders',
	commission: 'Commissions',
	advisory: 'Advisory bodies',
	court: 'Courts',
	corporation: 'Corporations',
	state: 'States',
}

const LINK_LABEL: Record<AuthorityLink['type'], string> = {
	elects: 'Elects',
	appoints: 'Appoints',
	confirms: 'Confirms',
	oversees: 'Oversees',
	contains: 'Part of',
}

interface GraphMapProps {
	graph: CompiledGraph
	layer: 'federal' | 'state'
	selectedId?: string
	onSelect: (id: string) => void
}

export function GraphMap({ graph, layer, selectedId, onSelect }: GraphMapProps) {
	const [hoverId, setHoverId] = useState<string | null>(null)
	const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set())
	const layout = useMemo(() => layoutGovernment(graph, { layer }), [graph, layer])
	const at = useMemo(() => new Map(layout.nodes.map((item) => [item.id, item])), [layout])

	// A seat selects the organization it belongs to, so a minister's page lights up the ministry.
	const focusId = selectedId && !at.has(selectedId) ? graph.nodes[selectedId]?.parentId : selectedId
	const chain = useMemo(
		() => (focusId && at.has(focusId) ? authorityChain(graph, focusId).filter((link) => at.has(link.fromId) && at.has(link.toId)) : []),
		[graph, focusId, at],
	)
	const fan = useMemo(
		() => (focusId ? descendantsOf(graph, focusId).filter((id) => at.has(id)) : []),
		[graph, focusId, at],
	)
	const lit = new Set(chain.flatMap((link) => [link.fromId, link.toId]))
	const hover = hoverId ? at.get(hoverId) : undefined
	const focus = focusId ? at.get(focusId) : undefined
	const visible = (item: PlacedNode) => !hiddenTypes.has(item.node.type) && !(item.kind === 'dot' && hiddenTypes.has('sub'))

	const toggle = (key: string) =>
		setHiddenTypes((current) => {
			const next = new Set(current)
			if (next.has(key)) next.delete(key)
			else next.add(key)
			return next
		})
	const nodeTypes = [...new Set(layout.nodes.filter((item) => item.kind !== 'hub').map((item) => item.node.type))]

	return (
		<div className="graph-map">
			<svg viewBox={layout.viewBox} role="group" aria-label="Map of the Nigerian government" className="graph-svg">
				<Markers />
				{layout.wedges.map((wedge) => (
					<g key={wedge.key}>
						<path d={wedge.d} className={`wedge wedge-${wedge.tone}`} />
						<path id={`arc-${wedge.key.replace(/\s+/g, '-')}`} d={wedge.labelArc} fill="none" />
						<text className={`wedge-label tone-${wedge.tone}`}>
							<textPath href={`#arc-${wedge.key.replace(/\s+/g, '-')}`} startOffset="50%" textAnchor="middle">
								{wedge.label}
							</textPath>
						</text>
					</g>
				))}
				{layout.bands.map((band) => <path key={band.key} d={band.d} className={`band band-${band.tone}`} />)}
				{layout.rings.map((ring) => <path key={ring.key} d={ring.d} className="ring-guide" />)}
				<circle cx={MAP.cx} cy={MAP.cy} r={RING.disc} className="hub-disc" />
				{layout.labels.map((label) => (
					<g key={label.key}>
						<path id={`label-${label.key}`} d={label.d} fill="none" />
						<text className={`arc-label arc-label-${label.size} tone-${label.tone}`}>
							<textPath href={`#label-${label.key}`} startOffset="50%" textAnchor="middle">{label.text}</textPath>
						</text>
					</g>
				))}

				{focus && fan.length > 0 && (
					<g className="fan">
						{fan.map((id) => {
							const target = at.get(id)!
							return <line key={id} x1={focus.x} y1={focus.y} x2={target.x} y2={target.y} className={`fan-line tone-${focus.tone}`} />
						})}
					</g>
				)}
				<g className="chain">
					{chain.map((link) => {
						const from = at.get(link.fromId)!
						const to = at.get(link.toId)!
						return (
							<path
								key={`${link.fromId}-${link.toId}-${link.type}`}
								d={linkPath(from, to)}
								className={`chain-link link-${link.type} tone-${link.type === 'elects' ? 'hub' : link.type === 'confirms' ? 'legislative' : from.tone}`}
								markerMid={link.type === 'elects' ? 'url(#m-elects)' : undefined}
								markerEnd={link.type === 'elects' ? undefined : `url(#m-${link.type}-${link.type === 'confirms' ? 'legislative' : from.tone})`}
							>
								<title>{`${from.node.name} ${LINK_LABEL[link.type].toLowerCase()} ${to.node.name}`}</title>
							</path>
						)
					})}
				</g>

				{layout.nodes.filter(visible).map((item) => (
					<Node
						key={item.id}
						item={item}
						state={item.id === focusId ? 'selected' : lit.has(item.id) || fan.includes(item.id) ? 'lit' : item.id === hoverId ? 'hover' : 'idle'}
						onSelect={onSelect}
						onHover={setHoverId}
					/>
				))}
				{hover && hover.kind !== 'hub' && <HoverPill item={hover} />}
			</svg>
			{focus && focus.kind !== 'hub' ? (
				<p className={`map-caption tone-${focus.tone}`}>{focus.node.name}</p>
			) : null}
			<details className="graph-legend">
				<summary>Legend</summary>
				<div className="graph-legend-content">
					<p>Entities</p>
					{nodeTypes.map((type) => (
						<label key={type}>
							<input type="checkbox" checked={!hiddenTypes.has(type)} onChange={() => toggle(type)} />
							<svg viewBox="0 0 24 24" aria-hidden="true"><path d={glyphPath(type, 12, 12, 7.5)} /></svg>
							{ENTITY_LABEL[type] ?? type}
						</label>
					))}
					{layout.nodes.some((item) => item.kind === 'dot') && (
						<label>
							<input type="checkbox" checked={!hiddenTypes.has('sub')} onChange={() => toggle('sub')} />
							<svg viewBox="0 0 24 24" aria-hidden="true" className="legend-dots">
								<circle cx="7" cy="9" r="2.6" /><circle cx="15" cy="9" r="2.6" /><circle cx="11" cy="16" r="2.6" />
							</svg>
							Sub-agencies
						</label>
					)}
					<p>Relationships</p>
					{(['elects', 'appoints', 'confirms', 'oversees'] as const).map((type) => (
						<span key={type} className="legend-link">
							<svg viewBox="0 0 28 10" aria-hidden="true">
								<path d="M 2 5 L 14 5 L 26 5" className={`chain-link link-${type} tone-${type === 'elects' ? 'hub' : type === 'confirms' ? 'legislative' : 'executive'}`}
									markerMid={type === 'elects' ? 'url(#m-elects)' : undefined}
									markerEnd={type === 'elects' ? undefined : `url(#m-${type}-${type === 'confirms' ? 'legislative' : 'executive'})`} />
							</svg>
							{LINK_LABEL[type]}
						</span>
					))}
				</div>
			</details>
		</div>
	)
}

function Node({
	item,
	state,
	onSelect,
	onHover,
}: {
	item: PlacedNode
	state: 'selected' | 'lit' | 'hover' | 'idle'
	onSelect: (id: string) => void
	onHover: (id: string | null) => void
}) {
	const activate = () => onSelect(item.id)
	const common = {
		role: 'link',
		tabIndex: item.kind === 'dot' ? -1 : 0,
		'aria-label': item.node.name,
		className: `node node-${item.kind} tone-${item.tone} is-${state}`,
		onClick: activate,
		onKeyDown: (event: React.KeyboardEvent) => {
			if (event.key === 'Enter' || event.key === ' ') {
				event.preventDefault()
				activate()
			}
		},
		onMouseEnter: () => onHover(item.id),
		onMouseLeave: () => onHover(null),
		onFocus: () => onHover(item.id),
		onBlur: () => onHover(null),
	}
	if (item.kind === 'hub') {
		return (
			<g {...common} className="node node-hub">
				<path d={sealPath(item.x, item.y, item.r)} className="hub-seal" />
				<text x={item.x} y={item.y - 3} className="hub-text">People of</text>
				<text x={item.x} y={item.y + 13} className="hub-text">Nigeria</text>
			</g>
		)
	}
	if (item.kind === 'dot') {
		return (
			<g {...common}>
				<circle cx={item.x} cy={item.y} r={5} className="hit" />
				<rect x={item.x - item.r} y={item.y - item.r} width={item.r * 2} height={item.r * 2} rx={0.8} className="dot" />
			</g>
		)
	}
	if (item.kind === 'assembly' || item.kind === 'chamber') {
		const w = item.w ?? 40
		const h = item.h ?? 30
		return (
			<g {...common}>
				<rect x={item.x - w / 2} y={item.y - h / 2} width={w} height={h} rx={h / 2} className={item.kind === 'assembly' ? 'assembly' : 'glyph'} />
			</g>
		)
	}
	const seat = item.node.head && item.node.type !== 'elected' ? seatOffset(item.r) : null
	return (
		<g {...common}>
			<circle cx={item.x} cy={item.y} r={item.r + 4} className="hit" />
			<path d={glyphPath(item.node.type, item.x, item.y, item.r)} className="glyph" />
			{seat && (
				<circle
					cx={item.x + seat.dx}
					cy={item.y + seat.dy}
					r={seat.r}
					className={item.node.people.length ? 'seat seat-filled' : 'seat seat-vacant'}
				>
					<title>{item.node.people[0]?.name ?? 'Vacant seat'}</title>
				</circle>
			)}
		</g>
	)
}

function HoverPill({ item }: { item: PlacedNode }) {
	const text = item.node.name.length > 46 ? `${item.node.name.slice(0, 44)}…` : item.node.name
	const width = text.length * 5.9 + 16
	const above = item.y > MAP.cy - 60
	const y = above ? item.y - (item.h ?? item.r * 2) / 2 - 22 : item.y + (item.h ?? item.r * 2) / 2 + 6
	const x = Math.min(MAP.size + 20 - width, Math.max(-20, item.x - width / 2))
	return (
		<g className={`hover-pill tone-${item.tone}`} pointerEvents="none">
			<rect x={x} y={y} width={width} height={17} rx={4} />
			<text x={x + width / 2} y={y + 12}>{text}</text>
		</g>
	)
}

/** Straight when the path is clear; bowed outward when it would cross the People at the centre. */
function linkPath(from: PlacedNode, to: PlacedNode) {
	const pad = (item: PlacedNode) => (item.kind === 'hub' ? item.r + 4 : item.kind === 'assembly' || item.kind === 'chamber' ? (item.h ?? 20) / 2 + 3 : item.r + 4)
	const dx = to.x - from.x
	const dy = to.y - from.y
	const length = Math.hypot(dx, dy) || 1
	const ux = dx / length
	const uy = dy / length
	const ax = from.x + ux * pad(from)
	const ay = from.y + uy * pad(from)
	const bx = to.x - ux * pad(to)
	const by = to.y - uy * pad(to)
	const mx = (ax + bx) / 2
	const my = (ay + by) / 2
	// Distance from the hub centre to the segment decides whether to bow the path.
	const t = Math.max(0, Math.min(1, ((MAP.cx - ax) * (bx - ax) + (MAP.cy - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2 || 1)))
	const near = Math.hypot(ax + (bx - ax) * t - MAP.cx, ay + (by - ay) * t - MAP.cy)
	const involvesHub = from.kind === 'hub' || to.kind === 'hub'
	if (involvesHub || near > RING.disc + 6) return `M ${r(ax)} ${r(ay)} L ${r(mx)} ${r(my)} L ${r(bx)} ${r(by)}`
	// Bow sideways, perpendicular to the link, on the side away from the hub's centre.
	const closestX = ax + (bx - ax) * t - MAP.cx
	const closestY = ay + (by - ay) * t - MAP.cy
	const side = closestX * -uy + closestY * ux >= 0 ? 1 : -1
	const clearance = RING.disc + 34
	const tx = MAP.cx + -uy * side * clearance
	const ty = MAP.cy + ux * side * clearance
	// A quadratic's midpoint is (A + 2C + B) / 4, so solve for the control point that puts it at T.
	const cx = (4 * tx - ax - bx) / 2
	const cy = (4 * ty - ay - by) / 2
	// Split the quadratic at its midpoint so the elects/appoints marker can sit on a vertex.
	const q1x = (ax + cx) / 2
	const q1y = (ay + cy) / 2
	const q2x = (cx + bx) / 2
	const q2y = (cy + by) / 2
	const px = (q1x + q2x) / 2
	const py = (q1y + q2y) / 2
	return `M ${r(ax)} ${r(ay)} Q ${r(q1x)} ${r(q1y)} ${r(px)} ${r(py)} Q ${r(q2x)} ${r(q2y)} ${r(bx)} ${r(by)}`
}

function r(value: number) {
	return Math.round(value * 10) / 10
}

function Markers() {
	const tones: Array<Tone | 'hub'> = ['executive', 'legislative', 'judicial', 'hub']
	return (
		<defs>
			<marker id="m-elects" viewBox="0 0 12 10" refX="6" refY="5" markerWidth="12" markerHeight="10" orient="auto" markerUnits="userSpaceOnUse">
				<path d="M 1 1 L 5 5 L 1 9 M 6 1 L 10 5 L 6 9" className="marker-stroke tone-hub" />
			</marker>
			{tones.flatMap((tone) => [
				<marker key={`a-${tone}`} id={`m-appoints-${tone}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto" markerUnits="userSpaceOnUse">
					<path d="M 0 0 L 10 5 L 0 10 Z" className={`marker-fill tone-${tone}`} />
				</marker>,
				<marker key={`c-${tone}`} id={`m-confirms-${tone}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto" markerUnits="userSpaceOnUse">
					<path d="M 1 1 L 9 5 L 1 9 Z" className={`marker-open tone-${tone}`} />
				</marker>,
				<marker key={`o-${tone}`} id={`m-oversees-${tone}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto" markerUnits="userSpaceOnUse">
					<path d="M 1 1 L 9 5 L 1 9" className={`marker-stroke tone-${tone}`} />
				</marker>,
				<marker key={`p-${tone}`} id={`m-contains-${tone}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto" markerUnits="userSpaceOnUse">
					<path d="M 1 1 L 9 5 L 1 9" className={`marker-stroke tone-${tone}`} />
				</marker>,
			])}
		</defs>
	)
}
