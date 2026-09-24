'use client'

import type { PowerLink, PowerPerson } from '@/lib/graph/power'

interface PowerMapProps {
	people: PowerPerson[]
	links: PowerLink[]
	articles: number
	sources: string[]
	days: number
	asOf: string
	onSelect: (id: string) => void
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
export function PowerMap({ people, links, articles, sources, days, asOf, onSelect }: PowerMapProps) {
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
	return (
		<div className="power-map">
			<header className="power-heading">
				<h2>Power map: who is in the news</h2>
				<p>
					{people.length
						? `The ${people.length} ${people.length === 1 ? 'person' : 'people'} named most across ${articles} ${articles === 1 ? 'article' : 'articles'} from ${sources.length} ${sources.length === 1 ? 'source' : 'sources'} in the last ${days} days`
						: `No officeholders are named in sourced news from the last ${days} days.`}
				</p>
			</header>
			<svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="power-svg" role="group" aria-label="People named most in the news">
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
					return <line key={`${link.fromId}-${link.toId}`} x1={from.x} y1={from.y + from.r} x2={to.x} y2={to.y - to.r} className="power-link" />
				})}
				{placed.map((person) => {
					const recent = person.latest && daysBetween(person.latest.date, asOf) <= 2
					return (
						<g
							key={person.nodeId}
							role="link"
							tabIndex={0}
							aria-label={`${person.name}, ${person.job}, ${person.total} articles`}
							className={`power-person tone-${toneOf(person.sector)} ${recent ? 'is-recent' : ''}`}
							onClick={() => onSelect(person.nodeId)}
							onKeyDown={(event) => {
								if (event.key === 'Enter') onSelect(person.nodeId)
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
