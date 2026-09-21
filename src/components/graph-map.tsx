'use client'

import { useMemo, useState } from 'react'
import { layoutGraph } from '@/lib/graph/layout'
import { nodePath } from '@/lib/graph/paths'
import type { CompiledGraph, GraphNode, Sector } from '@/lib/graph/types'

const SECTOR_COLOR: Record<Sector, string> = {
	executive: '#3dba6e',
	legislative: '#e8d48b',
	judicial: '#8ec5ff',
	independent: '#c4b5fd',
}

interface GraphMapProps {
	gov: string
	graph: CompiledGraph
	selectedId?: string
	mode?: 'orgs' | 'people' | 'chamber'
}

export function GraphMap({ gov, graph, selectedId, mode = 'orgs' }: GraphMapProps) {
	const width = 920
	const height = 720
	const [hoverId, setHoverId] = useState<string | null>(null)
	const placed = useMemo(
		() => layoutGraph(graph, width, height, { mode }),
		[graph, mode],
	)
	const activeId = hoverId ?? selectedId
	const connected = new Set(
		activeId ? graph.nodes[activeId]?.connectedNodes ?? [] : [],
	)

	return (
		<div className="relative h-full min-h-[520px] overflow-hidden rounded-xl border bg-card">
			<svg
				viewBox={`0 0 ${width} ${height}`}
				className="h-full w-full"
				role="img"
				aria-label="Nigeria federal government graph"
			>
				<rect width={width} height={height} fill="transparent" />
				{Object.values(graph.edges)
					.filter((edge) => graph.nodes[edge.fromId] && graph.nodes[edge.toId])
					.slice(0, 220)
					.map((edge) => {
						const from = placed.find((item) => item.id === edge.fromId)
						const to = placed.find((item) => item.id === edge.toId)
						if (!from || !to) {
							return null
						}
						const lit =
							!activeId ||
							edge.fromId === activeId ||
							edge.toId === activeId
						return (
							<line
								key={edge.id}
								x1={from.x}
								y1={from.y}
								x2={to.x}
								y2={to.y}
								stroke={lit ? 'rgba(61,186,110,0.45)' : 'rgba(61,186,110,0.08)'}
								strokeWidth={lit ? 1.4 : 0.6}
							/>
						)
					})}
				{mode === 'people'
					? placed
							.filter((item) => item.id.startsWith('holder:'))
							.map((item) => {
								const parent = placed.find(
									(placedNode) => placedNode.id === item.id.slice('holder:'.length),
								)
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
										stroke="rgba(244,231,195,0.28)"
										strokeWidth={1}
									/>
								)
							})
					: null}
				{placed.map((item) => {
					const isHub = item.node.type === 'constituency'
					const isSel = item.id === selectedId
					const isLit =
						!activeId || item.id === activeId || connected.has(item.id)
					const fill = isHub
						? '#f4e7c3'
						: SECTOR_COLOR[item.node.sector ?? 'independent']
					const parent = item.node.parentId
						? graph.nodes[item.node.parentId]
						: undefined
					const href =
						item.id.startsWith('holder:') && parent
							? nodePath(gov, parent)
							: nodePath(gov, item.node)
					const isHolder = item.id.startsWith('holder:')
					const portrait = isHolder ? item.node.people[0]?.imageUrl : undefined
					const radius = isHub ? 18 : portrait ? 14 : isHolder ? 8 : isSel ? 9 : 6
					const clipId = `clip-${item.id.replace(/[^a-zA-Z0-9_-]/g, '')}`
					return (
						<a key={item.id} href={href}>
							<g
								onMouseEnter={() => setHoverId(item.id)}
								onMouseLeave={() => setHoverId(null)}
								opacity={isLit ? 1 : 0.22}
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
								) : (
									<circle
										cx={item.x}
										cy={item.y}
										r={radius}
										fill={fill}
										stroke={isSel ? '#fff' : 'rgba(0,0,0,0.35)'}
										strokeWidth={isSel ? 2 : 0.6}
									/>
								)}
								{(isHub || isSel || hoverId === item.id || isHolder) && (
									<text
										x={item.x}
										y={item.y + (isHub ? 32 : radius + 12)}
										textAnchor="middle"
										fill="#f4e7c3"
										fontSize={isHub ? 13 : 10}
									>
										{shortLabel(item.node)}
									</text>
								)}
							</g>
						</a>
					)
				})}
			</svg>
			<div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
				{(Object.keys(SECTOR_COLOR) as Sector[]).map((sector) => (
					<span key={sector} className="inline-flex items-center gap-1.5">
						<span
							className="size-2 rounded-full"
							style={{ background: SECTOR_COLOR[sector] }}
						/>
						{sector}
					</span>
				))}
			</div>
		</div>
	)
}

function shortLabel(node: GraphNode) {
	if (node.aliases[0]) {
		return node.aliases[0]
	}
	return node.name.replace('Federal Ministry of ', '').replace('Ministry of ', '')
}
