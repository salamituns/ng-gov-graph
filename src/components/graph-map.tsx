'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { authorityChain, descendantsOf, organizationOf, type AuthorityLink } from '@/lib/graph/authority'
import { NIGERIA_MAP } from '@/data/nigeria/map-shapes'
import { glyphPath, sealPath, seatOffset } from '@/lib/graph/glyph'
import { layoutGovernment, MAP, readableArc, RING, type PlacedNode, type Tone } from '@/lib/graph/layout'
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

/** The verb shown when a reader hovers a relationship, read as "<source> <verb> <target>". */
const LINK_VERB: Record<AuthorityLink['type'], string> = {
	elects: 'elects',
	appoints: 'appoints',
	confirms: 'confirms',
	oversees: 'oversees',
	ex_officio: 'chairs',
	contains: 'includes',
}

const LINK_LABEL: Record<AuthorityLink['type'], string> = {
	elects: 'Elects',
	appoints: 'Appoints',
	confirms: 'Confirms',
	oversees: 'Oversees',
	ex_officio: 'Chairs',
	contains: 'Part of',
}

interface GraphMapProps {
	graph: CompiledGraph
	layer: 'federal' | 'state'
	selectedId?: string
	onSelect: (id: string) => void
	/** Names for the states on the core map, which the federal layer's graph does not contain. */
	stateNames?: Record<string, string>
}

export function GraphMap({ graph, layer, selectedId, onSelect, stateNames = {} }: GraphMapProps) {
	const [hoverId, setHoverId] = useState<string | null>(null)
	const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set())
	const [edgeHover, setEdgeHover] = useState<{ text: string; tone: string; x: number; y: number } | null>(null)
	const svgRef = useRef<SVGSVGElement>(null)
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
	// What the selection controls: the President's appointments, the Senate's confirmations, a council's chairs.
	const reach = useMemo(() => {
		if (!focusId || !at.has(focusId)) return []
		const sources = new Set([focusId, graph.nodes[focusId]?.head].filter(Boolean))
		const below = new Set(fan)
		const seen = new Set<string>()
		const links: AuthorityLink[] = []
		for (const edge of Object.values(graph.edges)) {
			if (!sources.has(edge.fromId) || !(edge.type in LINK_VERB)) continue
			const toId = organizationOf(graph, edge.toId)
			const key = `${toId}|${edge.type}`
			if (toId === focusId || below.has(toId) || !at.has(toId) || seen.has(key)) continue
			seen.add(key)
			links.push({ fromId: focusId, toId, type: edge.type as AuthorityLink['type'] })
		}
		return links
	}, [graph, focusId, fan, at])
	const lit = new Set([...chain, ...reach].flatMap((link) => [link.fromId, link.toId]))
	const focus = focusId ? at.get(focusId) : undefined
	// Selecting a body opens its dot cluster into full glyphs fanned out beneath it, as on CivLab.
	const expanded = useMemo(() => {
		const opened = new Map<string, PlacedNode>()
		if (!focus || focus.kind === 'dot' || focus.kind === 'hub') return opened
		const dots = fan.map((id) => at.get(id)!).filter((item) => item.kind === 'dot')
		const perRow = 12
		dots.forEach((item, index) => {
			const row = Math.floor(index / perRow)
			const inRow = Math.min(perRow, dots.length - row * perRow)
			const r = RING.cluster + 2 + row * 17
			const angle = focus.angle + (((index % perRow) - (inRow - 1) / 2) * 15) / r
			opened.set(item.id, {
				...item,
				x: MAP.cx + Math.cos(angle) * r,
				y: MAP.cy + Math.sin(angle) * r,
				angle,
				r: 4.6,
				kind: 'glyph',
			})
		})
		return opened
	}, [focus, fan, at])
	const place = (id: string) => expanded.get(id) ?? at.get(id)
	const hub = layout.nodes.find((item) => item.kind === 'hub')
	const rotation = useTurn(focus && focus.kind !== 'hub' ? Math.PI / 2 - focus.angle : 0)
	const hover = hoverId ? place(hoverId) : undefined
	const edgeProps = (text: string, tone: string) => ({
		onMouseMove: (event: React.MouseEvent) => {
			const svg = svgRef.current
			const matrix = svg?.getScreenCTM()
			if (!svg || !matrix) return
			const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
			setEdgeHover({ text, tone, x: point.x, y: point.y })
		},
		onMouseLeave: () => setEdgeHover(null),
	})
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
			<svg ref={svgRef} viewBox={layout.viewBox} role="group" aria-label="Map of the Nigerian government" className="graph-svg">
				<Markers />
				<g transform={`rotate(${(rotation * 180) / Math.PI} ${MAP.cx} ${MAP.cy})`}>
				{layout.wedges.map((wedge) => <path key={wedge.key} d={wedge.d} className={`wedge wedge-${wedge.tone}`} />)}
				{layout.bands.map((band) => <path key={band.key} d={band.d} className={`band band-${band.tone}`} />)}
				{layout.rings.map((ring) => <path key={ring.key} d={ring.d} className="ring-guide" />)}
				<circle cx={MAP.cx} cy={MAP.cy} r={RING.disc} className="hub-disc" />

				{focus && fan.length > 0 && (
					<g className="fan">
						{fan.map((id) => {
							const target = place(id)!
							return (
								<g key={id} className="link-group" {...edgeProps(LINK_VERB.oversees, focus.tone)}>
									<line x1={focus.x} y1={focus.y} x2={target.x} y2={target.y} className="link-hit" />
									<line x1={focus.x} y1={focus.y} x2={target.x} y2={target.y} className={`fan-line tone-${focus.tone}`} />
								</g>
							)
						})}
					</g>
				)}
				<g className="reach">
					{reach.map((link) => {
						const from = at.get(link.fromId)!
						const to = at.get(link.toId)!
						const tone = link.type === 'confirms' ? 'legislative' : link.type === 'elects' ? 'hub' : from.tone
						return (
							<g key={`${link.toId}-${link.type}`} className="link-group" {...edgeProps(LINK_VERB[link.type], tone)}>
								<title>{`${from.node.name} ${LINK_VERB[link.type]} ${to.node.name}`}</title>
								<line x1={from.x} y1={from.y} x2={to.x} y2={to.y} className="link-hit" />
								<path d={`M ${from.x} ${from.y} L ${(from.x + to.x) / 2} ${(from.y + to.y) / 2} L ${to.x} ${to.y}`} className={`reach-link link-${link.type} tone-${tone}`} markerMid={link.type === 'elects' ? 'url(#m-elects)' : `url(#m-${link.type}-${tone})`} />
							</g>
						)
					})}
				</g>
				<g className="chain">
					{chain.map((link) => {
						const from = at.get(link.fromId)!
						const to = at.get(link.toId)!
						const tone = link.type === 'elects' ? 'hub' : link.type === 'confirms' ? 'legislative' : from.tone
						const d = linkPath(from, to)
						return (
							<g key={`${link.fromId}-${link.toId}-${link.type}`} className="link-group" {...edgeProps(LINK_VERB[link.type], tone)}>
								<title>{`${from.node.name} ${LINK_VERB[link.type]} ${to.node.name}`}</title>
								<path d={d} className="link-hit" />
								<path
									d={d}
									className={`chain-link link-${link.type} tone-${tone}`}
									markerMid={link.type === 'elects' ? 'url(#m-elects)' : `url(#m-${link.type}-${tone})`}
								/>
							</g>
						)
					})}
				</g>

				{layout.nodes.filter((item) => item.kind !== 'hub' && visible(item)).map((item) => (
					<Node
						key={item.id}
						item={expanded.get(item.id) ?? item}
						seatUnrecorded={Boolean(item.node.head && graph.nodes[item.node.head]?.unrecorded)}
						seatSelected={Boolean(selectedId && item.node.head === selectedId)}
						state={item.id === focusId ? 'selected' : lit.has(item.id) || fan.includes(item.id) ? 'lit' : item.id === hoverId ? 'hover' : 'idle'}
						onSelect={onSelect}
						onHover={setHoverId}
					/>
				))}
				</g>
				{/* Titles sit outside the rotating group and are re-laid each frame so they never read upside down. */}
				{[...layout.wedges.map((wedge) => ({ key: `arc-${wedge.key}`, text: wedge.label, arc: wedge.labelArc, className: `wedge-label tone-${wedge.tone}` })),
					...layout.labels.map((label) => ({ key: `label-${label.key}`, text: label.text, arc: label.arc, className: `arc-label arc-label-${label.size} tone-${label.tone}` }))].map((label) => {
					const id = label.key.replace(/[^a-zA-Z0-9-]/g, '-')
					return (
						<g key={label.key} pointerEvents="none">
							<path id={id} d={readableArc(label.arc.r, label.arc.start + rotation, label.arc.end + rotation)} fill="none" />
							<text className={label.className}>
								<textPath href={`#${id}`} startOffset="50%" textAnchor="middle">{label.text}</textPath>
							</text>
						</g>
					)
				})}
				{hub && <NigeriaCore x={hub.x} y={hub.y} names={stateNames} selectedId={selectedId} onSelect={onSelect} />}
				{hover && hover.kind !== 'hub' && <HoverPill item={turn(hover, rotation)} />}
				{edgeHover && !hover && (
					<g className={`edge-pill tone-${edgeHover.tone}`} pointerEvents="none">
						<rect x={edgeHover.x + 6} y={edgeHover.y - 22} width={edgeHover.text.length * 5.6 + 12} height={15} rx={4} />
						<text x={edgeHover.x + 12} y={edgeHover.y - 11.5}>{edgeHover.text}</text>
					</g>
				)}
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
					{(['elects', 'appoints', 'confirms', 'oversees', 'ex_officio'] as const).map((type) => (
						<span key={type} className="legend-link">
							<svg viewBox="0 0 28 10" aria-hidden="true">
								<path d="M 2 5 L 14 5 L 26 5" className={`chain-link link-${type} tone-${type === 'elects' ? 'hub' : type === 'confirms' ? 'legislative' : 'executive'}`}
									markerMid={type === 'elects' ? 'url(#m-elects)' : `url(#m-${type}-${type === 'confirms' ? 'legislative' : 'executive'})`} />
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
	seatUnrecorded = false,
	seatSelected = false,
	onSelect,
	onHover,
}: {
	item: PlacedNode
	seatUnrecorded?: boolean
	seatSelected?: boolean
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
					r={seatSelected ? seat.r + 1.6 : seat.r}
					className={`${item.node.people.length ? 'seat seat-filled' : seatUnrecorded ? 'seat seat-unrecorded' : 'seat seat-vacant'}${seatSelected ? ' seat-selected' : ''}`}
				>
					<title>{item.node.people[0]?.name ?? (seatUnrecorded ? 'Officeholder not yet recorded' : 'Vacant seat')}</title>
				</circle>
			)}
		</g>
	)
}

/**
 * Turns the map so the selection sits at six o'clock, easing along the shorter way round.
 * The first render starts at the target, so a deep link does not spin on load.
 */
function useTurn(target: number) {
	const [angle, setAngle] = useState(target)
	const current = useRef(target)
	useEffect(() => {
		const from = current.current
		const turn = Math.PI * 2
		const delta = ((((target - from + Math.PI) % turn) + turn) % turn) - Math.PI
		if (Math.abs(delta) < 1e-4) return
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			current.current = from + delta
			setAngle(from + delta)
			return
		}
		const start = performance.now()
		let frame = 0
		const step = (now: number) => {
			const t = Math.min(1, (now - start) / 700)
			const eased = 1 - (1 - t) ** 3
			current.current = from + delta * eased
			setAngle(current.current)
			if (t < 1) frame = requestAnimationFrame(step)
		}
		frame = requestAnimationFrame(step)
		return () => cancelAnimationFrame(frame)
	}, [target])
	return angle
}

function turn(item: PlacedNode, angle: number): PlacedNode {
	const dx = item.x - MAP.cx
	const dy = item.y - MAP.cy
	const cos = Math.cos(angle)
	const sin = Math.sin(angle)
	return { ...item, x: MAP.cx + dx * cos - dy * sin, y: MAP.cy + dx * sin + dy * cos }
}

/**
 * The People of Nigeria at the centre of the map: the country's outline with its 36 states and the FCT,
 * always north-up. A state opens its page; Abuja is starred.
 */
function NigeriaCore({ x, y, names, selectedId, onSelect }: { x: number; y: number; names: Record<string, string>; selectedId?: string; onSelect: (id: string) => void }) {
	const [hoverState, setHoverState] = useState<string | null>(null)
	const scale = 1.08
	const top = y - 14
	const named = hoverState ? names[hoverState] : undefined
	return (
		<g className="nigeria-core">
			<g transform={`translate(${x} ${top}) scale(${scale})`}>
				{Object.entries(NIGERIA_MAP.states).map(([id, d]) => (
					<path
						key={id}
						d={d}
						role="link"
						tabIndex={-1}
						aria-label={names[id] ?? id}
						className={`core-state${id === selectedId ? ' is-selected' : ''}`}
						onClick={() => onSelect(id)}
						onMouseEnter={() => setHoverState(id)}
						onMouseLeave={() => setHoverState(null)}
					/>
				))}
				<path d={starPath(NIGERIA_MAP.abuja.x, NIGERIA_MAP.abuja.y, 3.2)} className="core-capital" pointerEvents="none">
					<title>Abuja, Federal Capital Territory</title>
				</path>
			</g>
			<text x={x} y={top + (NIGERIA_MAP.height * scale) / 2 + 17} className="hub-text" pointerEvents="none">
				{named ?? 'People of Nigeria'}
			</text>
		</g>
	)
}

function starPath(cx: number, cy: number, r: number) {
	return `M ${Array.from({ length: 10 }, (_, index) => {
		const angle = -Math.PI / 2 + (index * Math.PI) / 5
		const radius = index % 2 ? r * 0.45 : r
		return `${(cx + Math.cos(angle) * radius).toFixed(2)} ${(cy + Math.sin(angle) * radius).toFixed(2)}`
	}).join(' L ')} Z`
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
				<marker key={`a-${tone}`} id={`m-appoints-${tone}`} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="9" markerHeight="9" orient="auto" markerUnits="userSpaceOnUse">
					<path d="M 0 0 L 10 5 L 0 10 Z" className={`marker-fill tone-${tone}`} />
				</marker>,
				<marker key={`c-${tone}`} id={`m-confirms-${tone}`} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="9" markerHeight="9" orient="auto" markerUnits="userSpaceOnUse">
					<path d="M 1 1 L 9 5 L 1 9 Z" className={`marker-open tone-${tone}`} />
				</marker>,
				<marker key={`o-${tone}`} id={`m-oversees-${tone}`} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto" markerUnits="userSpaceOnUse">
					<path d="M 1 1 L 9 5 L 1 9" className={`marker-stroke tone-${tone}`} />
				</marker>,
				<marker key={`x-${tone}`} id={`m-ex_officio-${tone}`} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto" markerUnits="userSpaceOnUse">
					<circle cx="5" cy="5" r="3" className={`marker-fill tone-${tone}`} />
				</marker>,
				<marker key={`p-${tone}`} id={`m-contains-${tone}`} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto" markerUnits="userSpaceOnUse">
					<path d="M 1 1 L 9 5 L 1 9" className={`marker-stroke tone-${tone}`} />
				</marker>,
			])}
		</defs>
	)
}
