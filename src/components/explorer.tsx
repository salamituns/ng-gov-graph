'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { GraphMap } from '@/components/graph-map'
import { GraphSearch } from '@/components/graph-search'
import { nodePath } from '@/lib/graph/paths'
import type {
	CompiledGraph,
	GraphNode,
	OverviewCounts,
	PersonnelChange,
} from '@/lib/graph/types'
import type { LayerFilter } from '@/lib/graph/filter'
import type { NewsItem } from '@/data/nigeria/news'
import type { PowerMention, PowerWindow } from '@/lib/graph/power'

interface ExplorerProps {
	gov: string
	title: string
	graph: CompiledGraph
	searchIndex: CompiledGraph
	layer: LayerFilter
	view?: 'orgs' | 'people' | 'power'
	overview: OverviewCounts
	changes: PersonnelChange[]
	news: NewsItem[]
	newsSource?: 'neon' | 'catalog'
	changesSource?: 'neon' | 'catalog'
	source: 'neon' | 'catalog'
	powerDays?: PowerWindow
	powerMentions?: PowerMention[]
	newsPeople?: Array<{
		id: string
		name: string
		imageUrl?: string
		mentions: number
	}>
	latestChange?: { date: string; personName: string; positionName: string }
	earlierChanges?: PersonnelChange[]
	asOf: string
}
const layers: Array<{ id: LayerFilter; href: string; label: string }> = [
	{ id: 'federal', href: '/ng', label: 'Federal' },
	{ id: 'state', href: '/ng?layer=states', label: 'States' },
	{ id: 'all', href: '/ng?layer=all', label: 'All' },
]
function hrefFor(
	layer: LayerFilter,
	view: 'orgs' | 'people' | 'power',
	days?: number,
) {
	const params = new URLSearchParams()
	if (layer !== 'federal')
		params.set('layer', layer === 'state' ? 'states' : 'all')
	if (view !== 'orgs') params.set('view', view)
	if (days) params.set('days', String(days))
	return `/ng${params.size ? `?${params}` : ''}`
}
function displayDate(date: string) {
	return new Date(`${date}T12:00:00Z`).toLocaleDateString('en', {
		month: 'short',
		day: 'numeric',
	})
}
function cleanSummary(summary: string) {
	return summary
		.replace(/<[^>]+>/g, '')
		.replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
		.replace(/&quot;/g, '"')
		.replace(/&amp;/g, '&')
}
export function Explorer({
	gov,
	title,
	graph,
	searchIndex,
	layer,
	view = 'orgs',
	overview,
	changes,
	news,
	powerDays = 30,
	powerMentions = [],
	newsPeople = [],
	latestChange,
	earlierChanges = [],
	asOf,
}: ExplorerProps) {
	const [moreNews, setMoreNews] = useState(false)
	const [moreChanges, setMoreChanges] = useState(false)
	const shownNews = moreNews ? news : news.slice(0, 3)
	const shownChanges = moreChanges
		? [...changes, ...earlierChanges]
		: changes.length
			? changes.slice(0, 4)
			: earlierChanges.slice(0, 4)
	const counts = Array.from({ length: 7 }, () => 0)
	for (const change of changes) {
		const age = Math.floor(
			(new Date(`${asOf}T12:00:00Z`).getTime() -
				new Date(`${change.date}T12:00:00Z`).getTime()) /
				86400000,
		)
		counts[Math.min(6, Math.max(0, 6 - Math.floor((age * 7) / powerDays)))]++
	}
	return (
		<main className="explorer">
			<aside className="explorer-panel">
				<header className="brand-bar">
					<div className="brand-name">
						<span className="brand-mark">✳</span>
						<strong>Govgraph</strong>
						<span className="brand-slash">/</span>
						<span>Nigeria</span>
					</div>
					<details className="layer-menu">
						<summary aria-label="Choose graph layer">
							<ChevronDown size={15} />
						</summary>
						<nav aria-label="Government layer">
							{layers.map((item) => (
								<Link
									key={item.id}
									href={item.href}
									aria-current={layer === item.id ? 'page' : undefined}
								>
									{item.label}
								</Link>
							))}
						</nav>
					</details>
				</header>
				<section className="panel-section news-section">
					<h1 className="sr-only">{title}</h1>
					<h2>Latest News</h2>
					{news.length ? (
						<ul className={`news-list ${moreNews ? 'expanded' : ''}`}>
							{shownNews.map((item) => (
								<li key={item.id} className="news-item">
									<a
										href={item.url}
										target="_blank"
										rel="noreferrer"
									>
										<span className="news-dot" />{cleanSummary(item.summary)} <span aria-hidden="true">↗</span>
									</a>
									<small>{item.publication}{item.publishedAt ? ` · ${displayDate(item.publishedAt.slice(0, 10))}` : ''}</small>
								</li>
							))}
						</ul>
					) : (
						<p className="muted-copy">No sourced news is available yet.</p>
					)}
					{news.length > 3 && (
						<button
							className="text-action"
							onClick={() => setMoreNews(!moreNews)}
						>
							{moreNews ? 'Show less' : 'Read more'}
						</button>
					)}
					{newsPeople.length > 0 && (
						<Link
							className="news-people"
							href={hrefFor(layer, 'power', powerDays)}
						>
							<span className="avatar-stack">
								{newsPeople.slice(0, 5).map((person) =>
									person.imageUrl ? (
										<Image
											key={person.id}
											src={person.imageUrl}
											alt={person.name}
											width={23}
											height={23}
											unoptimized
										/>
									) : (
										<span key={person.id} title={person.name}>
											{person.name.charAt(0)}
										</span>
									),
								)}
							</span>
							<span>Who’s in the news</span>
							<small>
								Power map <ChevronRight size={14} />
							</small>
						</Link>
					)}
				</section>
				{view === 'power' && (
					<section className="panel-section power-section">
						<div className="section-heading">
							<h2>Power map</h2>
							<span className="power-window">Past {powerDays} days</span>
						</div>
						<p className="muted-copy">
							Entities named in the sourced news feed.
						</p>
						{powerMentions.length ? (
							<ol className="power-list">
								{powerMentions.slice(0, 12).map((mention) => {
									const node = searchIndex.nodes[mention.id]
									return node ? (
										<li key={mention.id}>
											<Link href={nodePath(gov, node)}>{node.name}</Link>
											<span>{mention.mentions}</span>
										</li>
									) : null
								})}
							</ol>
						) : (
							<p className="muted-copy">No dated mentions in this window.</p>
						)}
					</section>
				)}
				<section className="panel-section changes-section">
					<div className="section-heading">
						<h2>Latest Changes</h2>
						<nav className="segmented" aria-label="Change window">
							{([7, 30, 90] as const).map((days) => (
								<Link
									key={days}
									href={hrefFor(layer, view, days)}
									aria-current={powerDays === days ? 'page' : undefined}
								>
									{days}D
								</Link>
							))}
						</nav>
					</div>
					<p className="section-intro">
						Track appointments, departures, and changes in the government graph
						from official sources.
					</p>
					<div className="stats">
						<Stat
							label="Seats vacant"
							value={overview.vacantSeats}
							note="no current officeholder"
						/>
						<Stat
							label="Acting officials"
							value={overview.actingOfficials}
							note="serving unconfirmed"
						/>
						<Stat
							label="Last change"
							value={latestChange ? displayDate(latestChange.date) : '—'}
							note={latestChange?.personName ?? 'none recorded'}
						/>
					</div>
					<div className="timeline-heading">
						<span>Timeline</span>
						<span>
							{changes.length} {changes.length === 1 ? 'change' : 'changes'} in
							window
						</span>
					</div>
					<div
						className="timeline"
						aria-label={`${changes.length} changes over ${powerDays} days`}
					>
						{counts.map((count, i) => (
							<span
								className={count ? 'timeline-point active' : 'timeline-point'}
								key={i}
							>
								{count || ''}
							</span>
						))}
					</div>
					<div className="timeline-scale">
						<span>{powerDays}d ago</span>
						<span>today</span>
					</div>
					<div className="change-group-label">
						<span>{changes.length ? 'In this window' : 'Earlier'}</span>
						<span>{changes.length || earlierChanges.length}</span>
					</div>
					{shownChanges.length ? (
						<ol className="change-list">
							{shownChanges.map((change) => (
								<li key={change.id} className="change-card">
									<div className="change-meta">
										<span
											className={change.departure ? 'departure' : 'appointed'}
										>
											{change.departure ? 'Departure' : 'Appointed'}
										</span>
										<span>
											{displayDate(change.date)}{' '}
											{change.sourceUrl && (
												<a
													href={change.sourceUrl}
													target="_blank"
													rel="noreferrer"
													aria-label={`Source for ${change.personName}`}
												>
													↗
												</a>
											)}
										</span>
									</div>
									<h3>{change.positionName}</h3>
									<div className="change-people">
										<span>
											Out{' '}
											<strong>
												{change.predecessorName ??
													(change.departure
														? change.personName
														: 'Not on record')}
											</strong>
										</span>
										<span>
											In{' '}
											<strong>
												{change.departure
													? 'See appointments'
													: change.personName}
											</strong>
										</span>
									</div>
								</li>
							))}
						</ol>
					) : (
						<p className="muted-copy">
							No personnel changes recorded in this window.
						</p>
					)}
					{earlierChanges.length + changes.length > 4 && (
						<button
							className="text-action more-changes"
							onClick={() => setMoreChanges(!moreChanges)}
						>
							{moreChanges
								? 'Show fewer changes'
								: `Show all ${changes.length + earlierChanges.length} changes`}{' '}
							<ChevronRight size={14} />
						</button>
					)}
				</section>
				<section className="panel-section overview-section">
					<h2>Overview</h2>
					<p className="muted-copy">
						Top level counts for the Nigerian government.
					</p>
					<div className="overview-columns">
						<CountList title="By type" items={overview.byType} />
						<CountList title="By branch" items={overview.byBranch} />
					</div>
					<p className="overview-total">
						<strong>{overview.organizationCount}</strong> organizations in
						total, <strong>{overview.subAgencyCount}</strong> of them
						sub-agencies.
					</p>
				</section>
				<footer className="panel-footer">
					Govgraph maps institutions, offices, people, and their relationships.{' '}
					<span>Sources are linked throughout the graph.</span>
				</footer>
			</aside>
			<section className="map-panel" aria-label="Nigeria government graph">
				<div className="map-toolbar">
					<GraphSearch gov={gov} graph={searchIndex} />
					<nav className="map-views" aria-label="Graph view">
						<Link
							href={hrefFor(layer, 'orgs')}
							aria-current={view === 'orgs' ? 'page' : undefined}
						>
							Graph
						</Link>
						<Link
							href={hrefFor(layer, 'people')}
							aria-current={view === 'people' ? 'page' : undefined}
						>
							People
						</Link>
						<Link
							href={hrefFor(layer, 'power', powerDays)}
							aria-current={view === 'power' ? 'page' : undefined}
						>
							Power map
						</Link>
					</nav>
				</div>
				<div className="map-canvas">
					<GraphMap
						gov={gov}
						graph={graph}
						mode={view === 'people' ? 'people' : 'orgs'}
						weights={
							view === 'power'
								? Object.fromEntries(
										powerMentions.map((item) => [item.id, item.mentions]),
									)
								: undefined
						}
					/>
				</div>
				<div className="map-footer">
					<span className="map-footnote">
						Select a node to explore its sources and relationships
					</span>
				</div>
			</section>
		</main>
	)
}
function Stat({
	label,
	value,
	note,
}: {
	label: string
	value: number | string
	note: string
}) {
	return (
		<div className="stat">
			<span>{label}</span>
			<strong>{value}</strong>
			<small>{note}</small>
		</div>
	)
}
function CountList({
	title,
	items,
}: {
	title: string
	items: Record<string, number>
}) {
	return (
		<div>
			<h3>{title}</h3>
			<ul>
				{Object.entries(items).map(([key, value]) => (
					<li key={key}>
						<span>{key.replaceAll('_', ' ')}</span>
						<strong>{value}</strong>
					</li>
				))}
			</ul>
		</div>
	)
}
export function NodeList({ gov, nodes }: { gov: string; nodes: GraphNode[] }) {
	if (!nodes.length)
		return (
			<p className="text-sm text-muted-foreground">
				No connected entities on record.
			</p>
		)
	return (
		<ul className="divide-y rounded-lg border bg-card">
			{nodes.map((node) => (
				<li key={node.id}>
					<Link
						href={nodePath(gov, node)}
						className="block px-3 py-2 hover:bg-secondary"
					>
						<p className="text-sm">{node.name}</p>
						<p className="text-xs text-muted-foreground">
							{node.people[0]?.name ?? node.type.replace('_', ' ')}
						</p>
					</Link>
				</li>
			))}
		</ul>
	)
}
