'use client'

import Image from 'next/image'
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

const ROWS = [1, 3, 5, 5, 6]
const WIDTH = 800
const HEIGHT = 760

function toneOf(sector: string) {
	return sector === 'legislative' || sector === 'judicial' ? sector : 'executive'
}

function initials(name: string) {
	return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('')
}

/** People named most in the news, ranked top to bottom and sized by how often they appear. */
export function PowerMap({ people, links, articles, sources, days, asOf, selectedId, onSelect, onSeeOnGraph, onClear }: PowerMapProps) {
	const max = Math.max(1, ...people.map((person) => person.total))
	const placed: Array<PowerPerson & { x: number; y: number; r: number }> = []
	let index = 0
	ROWS.forEach((count, row) => {
		const slice = people.slice(index, index + count)
		index += count
		slice.forEach((person, column) => {
			const x = ((column + 1) * WIDTH) / (slice.length + 1) + (row % 2 ? 18 : -18) * (slice.length > 1 ? 1 : 0)
			const y = 90 + row * 145 + (column % 2) * 22
			placed.push({ ...person, x, y, r: 22 + 22 * Math.sqrt(person.total / max) })
		})
	})
	const at = new Map(placed.map((person) => [person.nodeId, person]))
	const selected = placed.find((person) => person.nodeId === selectedId || person.seatId === selectedId)
	const related = new Set(
		selected ? links.filter((link) => link.fromId === selected.nodeId || link.toId === selected.nodeId).flatMap((link) => [link.fromId, link.toId]) : [],
	)
	return (
		<div className="power-map">
			<header className="power-heading">
				<h2>Power map: who is in the news</h2>
				<p>
					{people.length
						? `The ${people.length} ${people.length === 1 ? 'person' : 'people'} named most across ${articles.toLocaleString('en')} ${articles === 1 ? 'article' : 'articles'} from ${sources.length} ${sources.length === 1 ? 'source' : 'sources'} in the last ${days} days`
						: `No officeholders are named in sourced news from the last ${days} days.`}
				</p>
			</header>
			<svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="power-svg" role="group" aria-label="People named most in the news" onClick={(event) => event.target === event.currentTarget && onClear()}>
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
					return (
						<g key={`${link.fromId}-${link.toId}`} className={`power-link-group ${active ? 'is-active' : selected ? 'is-dim' : ''}`}>
							<line x1={from.x} y1={from.y + from.r} x2={to.x} y2={to.y - to.r} className="power-link" />
							{active ? (
								<text x={(from.x + to.x) / 2 + 8} y={(from.y + from.r + to.y - to.r) / 2} className="power-link-label">appoints</text>
							) : null}
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
								{[person.party, person.job.length > 34 ? `${person.job.slice(0, 32)}…` : person.job].filter(Boolean).join(' · ')}
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
			</svg>
			{selected ? <PersonCard person={selected} asOf={asOf} days={days} onSeeOnGraph={() => onSeeOnGraph(selected)} onClose={onClear} style={{ left: `${(selected.x / WIDTH) * 100}%`, top: `${((selected.y + selected.r) / HEIGHT) * 100}%` }} /> : null}
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

function daysBetween(from: string, to: string) {
	return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000)
}

function relative(date: string, asOf: string) {
	const days = daysBetween(date, asOf)
	return days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days}d ago`
}
