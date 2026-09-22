'use client'

import { useMemo, useState } from 'react'
import { layoutGraph, sectorBands } from '@/lib/graph/layout'
import { nodePath } from '@/lib/graph/paths'
import type {
	CompiledGraph,
	GraphEdge,
	GraphNode,
	Sector,
} from '@/lib/graph/types'

const SECTOR_COLOR: Record<Sector, string> = {
	executive: '#9a8cbb',
	legislative: '#bd9b81',
	judicial: '#b8a765',
	independent: '#998db6',
}

const SPOKE: Array<GraphEdge['type']> = [
	'appoints',
	'confirms',
	'oversees',
	'elects',
]

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
	const placed = useMemo(
		() => layoutGraph(graph, width, height, { mode }),
		[graph, mode],
	)
	const at = useMemo(
		() => new Map(placed.map((item) => [item.id, item])),
		[placed],
	)
	const bands = useMemo(() => sectorBands(width, height), [])
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
				aria-label="Nigeria federal government graph"
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
				{Object.values(graph.edges)
					.filter(
						(edge) =>
							SPOKE.includes(edge.type) &&
							at.has(edge.fromId) &&
							at.has(edge.toId),
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
							/>
						)
					})}
				{mode === 'people'
					? placed
							.filter((item) => item.id.startsWith('holder:'))
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
				{placed.map((item) => {
					const isHub = item.node.type === 'constituency'
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
								: item.node.parentId
									? 4.5
									: 7.5
					const clipId = `clip-${item.id.replace(/[^a-zA-Z0-9_-]/g, '')}`
					const showLabel =
						isHub ||
						isSel ||
						hoverId === item.id ||
						(!isHolder &&
							!item.node.parentId &&
							placed.filter(
								(other) =>
									other.node.sector === item.node.sector &&
									!other.node.parentId &&
									other.node.type !== 'constituency',
							).length <= 8)
					return (
						<a key={item.id} href={href}>
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
										<rect
											x={item.x - radius}
											y={item.y - radius}
											width={radius * 2}
											height={radius * 2}
											rx={radius * 0.4}
											fill={fill}
											fillOpacity={
												weights ? 0.35 + Math.min(0.65, weight / 5) : 0.28
											}
											stroke={fill}
											strokeWidth={isSel || hoverId === item.id ? 1.8 : 0.8}
											transform={`rotate(15 ${item.x} ${item.y})`}
										/>
									</>
								)}
								{showLabel && !isHub ? (
									<text
										x={item.x}
										y={item.y + radius + 12}
										textAnchor="middle"
										fill="#d5c9bb"
										fontSize={isHub ? 13 : 9}
									>
										{shortLabel(item.node)}
									</text>
								) : null}
							</g>
						</a>
					)
				})}
			</svg>
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
	const label =
		node.aliases[0] && node.aliases[0].length <= 18
			? node.aliases[0]
			: node.name
					.replace('Federal Ministry of ', '')
					.replace('Ministry of ', '')
					.replace('National Agency for ', '')
	return label.length > 22 ? `${label.slice(0, 20)}…` : label
}
