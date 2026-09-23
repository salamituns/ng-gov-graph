'use client'

import { useMemo, useState } from 'react'
import { glyphPath } from '@/lib/graph/glyph'
import { layoutGraph, organizationBands, sectorBands } from '@/lib/graph/layout'
import { nodePath } from '@/lib/graph/paths'
import type {
	CompiledGraph,
	GraphEdge,
	GraphNode,
	NodeType,
	Sector,
} from '@/lib/graph/types'

const SECTOR_COLOR: Record<Sector, string> = {
	executive: '#9a8cbb',
	legislative: '#bd9b81',
	judicial: '#b8a765',
	independent: '#998db6',
}

const EXECUTIVE_LANDMARKS: Record<string, string> = {
	'ng-office-of-sgf': 'OSGF',
	'ng-ministry-of-defence': 'Defence',
	'ng-ministry-of-health': 'Health',
	'ng-ministry-of-education': 'Education',
	'ng-ministry-of-interior': 'Interior',
	'ng-ministry-of-finance': 'Finance',
	'ng-ministry-of-petroleum': 'Petroleum',
}

const ENTITY_LABEL: Partial<Record<NodeType, string>> = {
	elected: 'Elected offices',
	department: 'Departments & agencies',
	commission: 'Commissions',
	advisory: 'Advisory bodies',
	court: 'Courts',
	corporation: 'Corporations',
	state: 'States',
	dept_head: 'Officeholders',
}

const EDGE_LABEL: Record<GraphEdge['type'], string> = {
	appoints: 'Appoints',
	confirms: 'Confirms',
	elects: 'Elects',
	oversees: 'Oversees',
	dept_head: 'Heads',
	advises: 'Advises',
	ex_officio: 'Ex officio',
	office: 'Offices',
	administers: 'Administers',
}

interface GraphMapProps {
	gov: string
	graph: CompiledGraph
	selectedId?: string
	mode?: 'orgs' | 'people' | 'chamber'
	weights?: Record<string, number>
}

export function GraphMap({
	gov,
	graph,
	selectedId,
	mode = 'orgs',
	weights,
}: GraphMapProps) {
	const width = 920
	const height = 720
	const [hoverId, setHoverId] = useState<string | null>(null)
	const [hiddenEntities, setHiddenEntities] = useState<Set<NodeType>>(new Set())
	const [hiddenEdges, setHiddenEdges] = useState<Set<GraphEdge['type']>>(new Set())
	const placed = useMemo(
		() => layoutGraph(graph, width, height, { mode }),
		[graph, mode],
	)
	const at = useMemo(
		() => new Map(placed.map((item) => [item.id, item])),
		[placed],
	)
	const bands = useMemo(
		() => sectorBands(width, height).filter((band) => placed.some((item) => item.node.sector === band.sector)),
		[placed],
	)
	const organizations = useMemo(() => organizationBands(placed, width, height), [placed])
	const entityTypes = [...new Set(placed.map((item) => item.node.type))].filter(
		(type) => type !== 'constituency',
	)
	const visibleEdges = Object.values(graph.edges).filter(
		(edge) => at.has(edge.fromId) && at.has(edge.toId),
	)
	const edgeTypes = [...new Set(visibleEdges.map((edge) => edge.type))]
	const visible = (id: string) => {
		const item = at.get(id)
		return item && !hiddenEntities.has(item.node.type)
	}
	const activeId = hoverId ?? selectedId
	const connected = new Set(
		activeId
			? (graph.nodes[activeId.replace(/^holder:/, '')]?.connectedNodes ?? [])
			: [],
	)
	const hover = hoverId ? at.get(hoverId) : undefined

	return (
		<div className="relative h-full min-h-[420px] overflow-hidden bg-[#1c1a17]">
			<svg
				viewBox={`0 0 ${width} ${height}`}
				className="h-full w-full"
				role="img"
				aria-label="Nigeria government graph"
			>
				<rect width={width} height={height} fill="#1c1a17" />
				{bands.map((band) => (
					<g key={band.sector}>
						<path d={band.d} fill={SECTOR_COLOR[band.sector]} opacity={0.16} />
						<text
							x={band.labelX}
							y={band.labelY}
							textAnchor="middle"
							fill={SECTOR_COLOR[band.sector]}
							fontSize={11}
							letterSpacing="0.24em"
						>
							{band.sector.toUpperCase()}
						</text>
					</g>
				))}
				{organizations.filter((band) => visible(band.id)).map((band) => (
				<path
					key={band.id}
					d={band.d}
					fill={SECTOR_COLOR.executive}
					fillOpacity={0.14}
					stroke={SECTOR_COLOR.executive}
					strokeOpacity={0.34}
					strokeWidth={0.8}
				/>
				))}
				{visibleEdges
					.filter(
						(edge) =>
							!hiddenEdges.has(edge.type) &&
							visible(edge.fromId) &&
							visible(edge.toId),
					)
					.map((edge) => {
						const from = at.get(edge.fromId)
						const to = at.get(edge.toId)
						if (!from || !to) {
							return null
						}
						const lit =
							!activeId ||
							edge.fromId === activeId ||
							edge.toId === activeId ||
							edge.fromId === activeId?.replace(/^holder:/, '') ||
							edge.toId === activeId?.replace(/^holder:/, '')
						return (
							<line
								key={edge.id}
								x1={from.x}
								y1={from.y}
								x2={to.x}
								y2={to.y}
								stroke={
									lit && activeId
										? 'rgba(223,209,191,0.55)'
										: 'rgba(223,209,191,0.04)'
								}
								strokeWidth={lit && activeId ? 1.2 : 0.5}
								strokeDasharray={edge.type === 'elects' ? undefined : edge.type === 'oversees' ? '2 3' : '4 3'}
							/>
						)
					})}
				{mode === 'people'
					? placed
							.filter((item) => item.id.startsWith('holder:') && visible(item.id) && visible(item.id.slice('holder:'.length)))
							.map((item) => {
								const parent = at.get(item.id.slice('holder:'.length))
								if (!parent) {
									return null
								}
								return (
									<line
										key={`seat-${item.id}`}
										x1={parent.x}
										y1={parent.y}
										x2={item.x}
										y2={item.y}
										stroke="rgba(244,231,195,0.35)"
										strokeWidth={1}
									/>
								)
							})
					: null}
				{placed.filter((item) => !hiddenEntities.has(item.node.type)).map((item) => {
					const isHub = item.node.type === 'constituency'
					const isExecutiveOffice = item.node.type === 'elected' && item.node.sector === 'executive'
					const isSel = item.id === selectedId
					const isHolder = item.id.startsWith('holder:')
					const orgId = item.id.replace(/^holder:/, '')
					const isLit =
						!hoverId ||
						item.id === activeId ||
						orgId === activeId ||
						connected.has(orgId)
					const fill = isHub
						? '#b67c5b'
						: SECTOR_COLOR[item.node.sector ?? 'independent']
					const parent = item.node.parentId
						? graph.nodes[item.node.parentId]
						: undefined
					const href =
						isHolder && parent
							? nodePath(gov, parent)
							: nodePath(gov, item.node)
					const portrait = isHolder ? item.node.people[0]?.imageUrl : undefined
					const weight = weights?.[orgId] ?? 0
					const radius = isHub
						? 58
						: portrait
							? 16
							: weights
								? 5 + Math.min(14, Math.sqrt(weight) * 5)
								: isExecutiveOffice
									? 11
								: item.node.parentId
									? 4.5
									: 7.5
					const clipId = `clip-${item.id.replace(/[^a-zA-Z0-9_-]/g, '')}`
					const showLabel =
						isHub ||
						isSel ||
						hoverId === item.id ||
						isExecutiveOffice ||
						(mode === 'orgs' && Boolean(EXECUTIVE_LANDMARKS[item.id])) ||
						(!isHolder &&
							!item.node.parentId &&
							placed.filter(
								(other) =>
									other.node.sector === item.node.sector &&
									!other.node.parentId &&
									other.node.type !== 'constituency',
							).length <= 8)
					return (
						<a key={item.id} href={href} aria-label={item.node.name}>
							<g
								onMouseEnter={() => setHoverId(item.id)}
								onMouseLeave={() => setHoverId(null)}
								opacity={isLit ? 1 : 0.18}
								className="cursor-pointer"
							>
								{portrait ? (
									<>
										<clipPath id={clipId}>
											<circle cx={item.x} cy={item.y} r={radius} />
										</clipPath>
										<image
											href={portrait}
											x={item.x - radius}
											y={item.y - radius}
											width={radius * 2}
											height={radius * 2}
											clipPath={`url(#${clipId})`}
										/>
									</>
								) : isHub ? (
									<>
										<circle
											cx={item.x}
											cy={item.y}
											r={radius + 8}
											fill="#1c1a17"
										/>
										<circle
											cx={item.x}
											cy={item.y}
											r={radius}
											fill="#573b30"
											stroke={fill}
											strokeWidth={1.3}
											strokeDasharray="3 3"
										/>
										<text
											x={item.x}
											y={item.y - 5}
											textAnchor="middle"
											fill="#d99b78"
											fontSize={12}
										>
											People of
										</text>
										<text
											x={item.x}
											y={item.y + 12}
											textAnchor="middle"
											fill="#d99b78"
											fontSize={14}
										>
											Nigeria
										</text>
									</>
								) : (
									<>
										{isSel && (
											<circle
												cx={item.x}
												cy={item.y}
												r={radius + 7}
												fill="none"
												stroke={fill}
												strokeWidth={1.5}
											/>
										)}
										<path
											d={glyphPath(item.node.type, item.x, item.y, radius)}
											fill={fill}
											fillOpacity={
												weights ? 0.35 + Math.min(0.65, weight / 5) : 0.28
											}
											stroke={fill}
											strokeWidth={isSel || hoverId === item.id ? 1.8 : 0.8}
										/>
									</>
								)}
								{showLabel && !isHub ? (
									<text
										x={item.x}
										y={mode === 'people' && isExecutiveOffice ? item.y - radius - 10 : item.y + radius + 12}
										textAnchor="middle"
										fill="#d5c9bb"
										fontSize={isExecutiveOffice ? 11 : 9}
									>
										{(mode === 'orgs' && EXECUTIVE_LANDMARKS[item.id]) || shortLabel(item.node)}
									</text>
								) : null}
							</g>
						</a>
					)
				})}
			</svg>
			<details className="graph-legend">
				<summary>Legend</summary>
				<div className="graph-legend-content">
					<p>Entities</p>
					{entityTypes.map((type) => (
						<label key={type}>
							<input
								type="checkbox"
								aria-label={ENTITY_LABEL[type] ?? type}
								checked={!hiddenEntities.has(type)}
								onChange={() => {
									setHoverId(null)
									setHiddenEntities((current) => {
										const next = new Set(current)
										if (next.has(type)) next.delete(type)
										else next.add(type)
										return next
									})
								}}
							/>
							<svg viewBox="0 0 24 24" aria-hidden="true">
								<path d={glyphPath(type, 12, 12, 9)} />
							</svg>
							{ENTITY_LABEL[type] ?? type}
						</label>
					))}
					{edgeTypes.length > 0 && (
						<>
							<p>Relationships</p>
							{edgeTypes.map((type) => (
								<label key={type}>
									<input
										type="checkbox"
										aria-label={EDGE_LABEL[type]}
										checked={!hiddenEdges.has(type)}
										onChange={() => {
											setHiddenEdges((current) => {
												const next = new Set(current)
												if (next.has(type)) next.delete(type)
												else next.add(type)
												return next
											})
										}}
									/>
									<span className={`legend-edge ${type}`} aria-hidden="true" />
									{EDGE_LABEL[type]}
								</label>
							))}
						</>
					)}
				</div>
			</details>
			{hover ? (
				<div
					className="pointer-events-none absolute z-10 max-w-56 rounded-md border border-white/10 bg-[#302a25]/95 px-3 py-2 text-xs text-[#eee4d9] shadow-lg"
					style={{
						left: `${(hover.x / width) * 100}%`,
						top: `${(hover.y / height) * 100}%`,
						transform: 'translate(12px, 12px)',
					}}
				>
					<p className="font-medium">{hover.node.name}</p>
					<p className="mt-1 text-[11px] text-white/60">
						{hover.node.sector ?? hover.node.type.replace('_', ' ')}
						{weights?.[hover.id.replace(/^holder:/, '')]
							? ` · ${weights[hover.id.replace(/^holder:/, '')]} mentions`
							: ''}
					</p>
				</div>
			) : null}
		</div>
	)
}

function shortLabel(node: GraphNode) {
	if (node.type === 'elected' && node.sector === 'executive') {
		return node.name.replace(' of the Federal Republic of Nigeria', '')
	}
	const label =
		node.aliases[0] && node.aliases[0].length <= 18
			? node.aliases[0]
			: node.name
					.replace('Federal Ministry of ', '')
					.replace('Ministry of ', '')
					.replace('National Agency for ', '')
	return label.length > 22 ? `${label.slice(0, 20)}…` : label
}
