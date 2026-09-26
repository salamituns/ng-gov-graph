'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import type { PowerLink, PowerPerson } from '@/lib/graph/power'

interface PowerMapProps {
	people: PowerPerson[]
	links: PowerLink[]
	articles: number
	sources: string[]
	days: number
	asOf: string
	/** The organization or seat in the URL; the matching person is selected. */
	selectedId?: string
	onSelect: (person: PowerPerson) => void
	onSeeOnGraph: (person: PowerPerson) => void
	onClear: () => void
}

/** Wide screens lay the twenty people out in five rows; phones use a narrow stage that scrolls. */
const LAYOUTS = {
	wide: { rows: [1, 3, 5, 5, 6], width: 800, rowHeight: 145, top: 90 },
	narrow: { rows: [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1], width: 420, rowHeight: 146, top: 86 },
} as const

function toneOf(sector: string) {
	return sector === 'legislative' || sector === 'judicial' ? sector : 'executive'
}

function initials(name: string) {
	return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('')
}

/** People named most in the news, ranked top to bottom and sized by how often they appear. */
export function PowerMap({ people, links, articles, sources, days, asOf, selectedId, onSelect, onSeeOnGraph, onClear }: PowerMapProps) {
	const [hover, setHover] = useState<{ text: string; x: number; y: number } | null>(null)
	const svgRef = useRef<SVGSVGElement>(null)
	const rootRef = useRef<HTMLDivElement>(null)
	const [narrow, setNarrow] = useState(false)
	useEffect(() => {
		const root = rootRef.current
		if (!root) return
		const observer = new ResizeObserver(([entry]) => setNarrow(entry.contentRect.width < 600))
		observer.observe(root)
		return () => observer.disconnect()
	}, [])
	const shape = narrow ? LAYOUTS.narrow : LAYOUTS.wide
	const WIDTH = shape.width
	const HEIGHT = shape.top + shape.rows.length * shape.rowHeight
	const point = (event: React.MouseEvent) => {
		const matrix = svgRef.current?.getScreenCTM()
		if (!matrix) return { x: 0, y: 0 }
		const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
		return { x: p.x, y: p.y }
	}
	const max = Math.max(1, ...people.map((person) => person.total))
	const placed: Array<PowerPerson & { x: number; y: number; r: number }> = []
	let index = 0
	shape.rows.forEach((count, row) => {
		const slice = people.slice(index, index + count)
		index += count
		slice.forEach((person, column) => {
			const x = ((column + 1) * WIDTH) / (slice.length + 1) + (narrow ? 0 : (row % 2 ? 18 : -18) * (slice.length > 1 ? 1 : 0))
			const y = shape.top + row * shape.rowHeight + (narrow ? 0 : (column % 2) * 22)
			placed.push({ ...person, x, y, r: (narrow ? 20 : 22) + (narrow ? 16 : 22) * Math.sqrt(person.total / max) })
		})
	})
	const at = new Map(placed.map((person) => [person.nodeId, person]))
	const selected = placed.find((person) => person.nodeId === selectedId || person.seatId === selectedId)
	const related = new Set(
		selected ? links.filter((link) => link.fromId === selected.nodeId || link.toId === selected.nodeId).flatMap((link) => [link.fromId, link.toId]) : [],
	)
	return (
		<div className={`power-map${narrow ? ' is-narrow' : ''}`} ref={rootRef}>
			<header className="power-heading">
				<h2>Power map: who is in the news</h2>
				<p>
					{people.length
						? `The ${people.length} ${people.length === 1 ? 'person' : 'people'} named most across ${articles.toLocaleString('en')} ${articles === 1 ? 'article' : 'articles'} from ${sources.length} ${sources.length === 1 ? 'source' : 'sources'} in the last ${days} days`
						: `No officeholders are named in sourced news from the last ${days} days.`}
				</p>
			</header>
			<div className="power-stage">
			<svg ref={svgRef} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="power-svg" role="group" aria-label="People named most in the news" onClick={(event) => event.target === event.currentTarget && onClear()}>
				<defs>
					{placed.map((person) => (
						<clipPath key={person.nodeId} id={`pm-${person.nodeId}`}>
							<circle cx={person.x} cy={person.y} r={person.r - 3} />
						</clipPath>
					))}
				</defs>
				{links.map((link) => {
					const from = at.get(link.fromId)
					const to = at.get(link.toId)
					if (!from || !to) return null
					const active = selected && (link.fromId === selected.nodeId || link.toId === selected.nodeId)
					const path = curve(from, to)
					return (
						<g key={`${link.fromId}-${link.toId}`} className={`power-link-group link-${link.type} ${active ? 'is-active' : selected ? 'is-dim' : ''}`}>
							<title>{`${from.name} ${link.verb} ${to.name}`}</title>
							<path d={path.d} className="power-link-hit" onMouseMove={(event) => setHover({ text: link.verb, ...point(event) })} onMouseLeave={() => setHover(null)} />
							<path d={path.d} className="power-link" />
							{active ? <text x={path.label.x} y={path.label.y} className="power-link-label" textAnchor="middle">{link.verb}</text> : null}
						</g>
					)
				})}
				{placed.map((person) => {
					const recent = person.latest && daysBetween(person.latest.date, asOf) <= 2
					const dim = selected && person !== selected && !related.has(person.nodeId)
					return (
						<g
							key={person.nodeId}
							role="button"
							tabIndex={0}
							aria-pressed={person === selected}
							aria-label={`${person.name}, ${person.job}, ${person.total} articles`}
							className={`power-person tone-${toneOf(person.sector)} ${recent ? 'is-recent' : ''} ${dim ? 'is-dim' : ''} ${person === selected ? 'is-selected' : ''}`}
							onClick={() => onSelect(person)}
							onKeyDown={(event) => {
								if (event.key === 'Enter' || event.key === ' ') {
									event.preventDefault()
									onSelect(person)
								}
							}}
						>
							<circle cx={person.x} cy={person.y} r={person.r} className="power-ring" />
							{person.imageUrl ? (
								<image href={person.imageUrl} x={person.x - person.r} y={person.y - person.r} width={person.r * 2} height={person.r * 2} preserveAspectRatio="xMidYMin slice" clipPath={`url(#pm-${person.nodeId})`} />
							) : (
								<text x={person.x} y={person.y + 5} className="power-initials">{initials(person.name)}</text>
							)}
							<text x={person.x} y={person.y + person.r + 15} className="power-name">{person.name}</text>
							<text x={person.x} y={person.y + person.r + 28} className="power-job">
								{jobLine(person, narrow ? 24 : 38)}
							</text>
							<text x={person.x} y={person.y + person.r + 40} className="power-count">
								{person.total} {person.total === 1 ? 'article' : 'articles'}
							</text>
							{recent && person.latest ? (
								<text x={person.x} y={person.y + person.r + 52} className="power-recent">In the news {relative(person.latest.date, asOf)}</text>
							) : null}
						</g>
					)
				})}
				{hover ? (
					<g className="power-hover" pointerEvents="none">
						<rect x={hover.x + 8} y={hover.y - 24} width={hover.text.length * 6.2 + 14} height={17} rx={4} />
						<text x={hover.x + 15} y={hover.y - 12}>{hover.text}</text>
					</g>
				) : null}
			</svg>
			{selected ? <PersonCard person={selected} asOf={asOf} days={days} onSeeOnGraph={() => onSeeOnGraph(selected)} onClose={onClear} style={{ left: `clamp(130px, ${(selected.x / WIDTH) * 100}%, calc(100% - 130px))`, top: `${((selected.y + selected.r) / HEIGHT) * 100}%` }} /> : null}
			</div>
		</div>
	)
}

function PersonCard({ person, asOf, days, style, onSeeOnGraph, onClose }: { person: PowerPerson; asOf: string; days: number; style: React.CSSProperties; onSeeOnGraph: () => void; onClose: () => void }) {
	const peak = Math.max(1, ...person.weeks)
	const points = person.weeks.map((count, week) => `${(week / 11) * 118 + 1},${27 - (count / peak) * 25}`).join(' ')
	return (
		<div className={`person-card tone-${toneOf(person.sector)}`} style={style} role="dialog" aria-label={person.name}>
			<button type="button" className="person-card-close" aria-label="Close" onClick={onClose}>×</button>
			<header>
				{person.imageUrl ? <Image src={person.imageUrl} alt="" width={40} height={40} unoptimized /> : <span className="person-card-initials">{initials(person.name)}</span>}
				<span>
					<strong>{person.name}</strong>
					<small>{person.job}</small>
				</span>
			</header>
			<p className="person-card-stats">
				{person.total} {person.total === 1 ? 'article' : 'articles'} in {days} days · {person.thisWeek} this week · #{person.rank}
			</p>
			<svg viewBox="0 0 120 28" className="person-card-spark" aria-label={`Mentions per week over the last 12 weeks: ${person.weeks.join(', ')}`}>
				<polyline points={points} />
			</svg>
			<p className="person-card-caption">last 12 weeks</p>
			{person.latest ? (
				<a href={person.latest.url} target="_blank" rel="noreferrer" className="person-card-latest">
					<span>{person.latest.headline}</span>
					<small>{person.latest.source} · {relative(person.latest.date, asOf)}</small>
				</a>
			) : null}
			<button type="button" className="person-card-cta" onClick={onSeeOnGraph}>See on the graph</button>
		</div>
	)
}

/** "APC · President", trimmed to what fits under a portrait; the card has the full title. */
function jobLine(person: PowerPerson, max: number) {
	const line = [person.party, person.job.replace(/^Honourable\s+/i, '')].filter(Boolean).join(' · ')
	return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line
}

/** A gentle bow, so a line from the President to the bottom row skirts the people in between. */
function curve(from: { x: number; y: number; r: number }, to: { x: number; y: number; r: number }) {
	const [a, b] = from.y <= to.y ? [from, to] : [to, from]
	const start = { x: a.x, y: a.y + a.r }
	const end = { x: b.x, y: b.y - b.r }
	const bend = Math.max(-60, Math.min(60, (end.x - start.x) * 0.25))
	const control = { x: (start.x + end.x) / 2 + bend, y: (start.y + end.y) / 2 }
	// Labels sit near the far end of each link, so several links from one person spread out instead of stacking.
	const at = (t: number) => ({
		x: (1 - t) ** 2 * start.x + 2 * (1 - t) * t * control.x + t * t * end.x,
		y: (1 - t) ** 2 * start.y + 2 * (1 - t) * t * control.y + t * t * end.y,
	})
	const label = at(from.y <= to.y ? 0.8 : 0.2)
	return { d: `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`, label: { x: label.x, y: label.y - 4 } }
}

function daysBetween(from: string, to: string) {
	return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000)
}

function relative(date: string, asOf: string) {
	const days = daysBetween(date, asOf)
	return days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days}d ago`
}
