'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { GraphMap } from '@/components/graph-map'
import { Input } from '@/components/ui/input'
import { nodePath } from '@/lib/graph/paths'
import { searchGraph } from '@/lib/graph/search'
import type { CompiledGraph, GraphNode, OverviewCounts, PersonnelChange } from '@/lib/graph/types'
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
}

const LAYER_LINKS: Array<{ id: LayerFilter; href: string; label: string }> = [
	{ id: 'federal', href: '/ng', label: 'Federal' },
	{ id: 'state', href: '/ng?layer=states', label: 'States' },
	{ id: 'all', href: '/ng?layer=all', label: 'All' },
]

const VIEW_LINKS: Array<{ id: 'orgs' | 'people' | 'power'; label: string }> = [
	{ id: 'orgs', label: 'Institutions' },
	{ id: 'people', label: 'People' },
	{ id: 'power', label: 'Power' },
]

function viewHref(layer: LayerFilter, nextView: 'orgs' | 'people' | 'power') {
	const params = new URLSearchParams()
	if (layer === 'state') {
		params.set('layer', 'states')
	}
	if (layer === 'all') {
		params.set('layer', 'all')
	}
	if (nextView !== 'orgs') {
		params.set('view', nextView)
	}
	const query = params.toString()
	return query ? `/ng?${query}` : '/ng'
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
	newsSource = 'catalog',
	changesSource = 'catalog',
	source,
	powerDays = 30,
	powerMentions = [],
	newsPeople = [],
	latestChange,
	earlierChanges = [],
}: ExplorerProps) {
	const [query, setQuery] = useState('')
	const hits = useMemo(
		() => searchGraph(searchIndex, query).slice(0, 12),
		[searchIndex, query],
	)

	return (
		<div className="grid min-h-screen grid-cols-1 lg:grid-cols-[minmax(360px,40%)_1fr]">
			<aside className="order-2 space-y-8 p-5 lg:order-1 lg:p-6">
				<header className="rounded-xl border bg-card px-4 py-3">
					<p className="text-xs tracking-[0.2em] text-primary uppercase">Govgraph</p>
					<h1
						className="font-[family-name:var(--font-heading)] text-2xl text-accent"
					>
						{title}
					</h1>
					<p className="mt-1 text-xs text-muted-foreground">
						{source === 'neon'
							? 'Serving the compiled graph from Neon Postgres.'
							: 'Serving a catalog compile. Neon snapshot unavailable.'}
					</p>
					<nav className="mt-3 flex flex-wrap gap-1">
						{LAYER_LINKS.map((item) => (
							<Link
								key={item.id}
								href={item.href}
								className={`rounded-md px-2.5 py-1 text-xs ${
									layer === item.id
										? 'bg-primary text-primary-foreground'
										: 'text-muted-foreground hover:bg-secondary'
								}`}
							>
								{item.label}
							</Link>
						))}
					</nav>
					<nav className="mt-3 flex flex-wrap gap-1" aria-label="Graph view">
						{VIEW_LINKS.map((item) => (
							<Link
								key={item.id}
								href={viewHref(layer, item.id)}
								className={`rounded-md px-3 py-2 text-sm ${
									view === item.id
										? 'bg-secondary text-foreground'
										: 'text-muted-foreground hover:bg-secondary'
								}`}
							>
								{item.label}
							</Link>
						))}
					</nav>
				</header>

				<div>
					<label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">
						Search
					</label>
					<Input
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder="Try INEC, Lagos, Sanwo-Olu…"
					/>
					{query.trim() ? (
						<ul className="mt-2 overflow-hidden rounded-lg border bg-card">
							{hits.length === 0 ? (
								<li className="px-3 py-2 text-sm text-muted-foreground">
									No results. Try an agency alias (EFCC, NASS, FCT).
								</li>
							) : (
								hits.map((node) => (
									<li key={node.id} className="border-b last:border-0">
										<Link
											href={nodePath(gov, node)}
											className="block px-3 py-2 text-sm hover:bg-secondary"
										>
											<p>{node.name}</p>
											<p className="text-xs text-muted-foreground">
												{node.type.replace('_', ' ')}
												{node.people[0] ? ` · ${node.people[0].name}` : ''}
											</p>
										</Link>
									</li>
								))
							)}
						</ul>
					) : null}
				</div>

				{view === 'power' ? (
					<section>
						<h2 className="mb-2 font-[family-name:var(--font-heading)] text-lg text-accent">
							Power map
						</h2>
						<p className="mb-3 text-sm text-muted-foreground">
							Entities named in the Postgres news feed over the last {powerDays} days.
						</p>
						<nav className="mb-3 flex gap-1">
							{([7, 30, 90] as const).map((days) => (
								<Link
									key={days}
									href={`/ng?view=power&days=${days}`}
									className={`rounded-md px-2.5 py-1 text-xs ${
										powerDays === days
											? 'bg-secondary text-foreground'
											: 'text-muted-foreground hover:bg-secondary'
									}`}
								>
									{days}d
								</Link>
							))}
						</nav>
						{powerMentions.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								No dated mentions in this window.
							</p>
						) : (
							<ol className="space-y-2">
								{powerMentions.map((mention) => {
									const node = searchIndex.nodes[mention.id]
									return (
										<li key={mention.id} className="rounded-lg border bg-card p-3 text-sm">
											{node ? (
												<Link href={nodePath(gov, node)} className="hover:underline">
													{node.name}
												</Link>
											) : (
												mention.id
											)}
											<p className="text-xs text-muted-foreground">
												{mention.mentions} {mention.mentions === 1 ? 'mention' : 'mentions'}
											</p>
										</li>
									)
								})}
							</ol>
						)}
					</section>
				) : null}

				<section>
					<h2 className="mb-2 font-[family-name:var(--font-heading)] text-lg text-accent">
						Latest news
					</h2>
					{newsPeople.length > 0 ? (
						<div className="mb-3">
							<p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
								Who is in the news
							</p>
							<ul className="flex gap-3 overflow-x-auto pb-1">
								{newsPeople.map((person) => {
									const named = searchIndex.nodes[person.id]
									const body = (
										<>
											{person.imageUrl ? (
												<img
													src={person.imageUrl}
													alt=""
													className="size-12 rounded-full object-cover"
												/>
											) : (
												<span className="flex size-12 items-center justify-center rounded-full bg-secondary text-xs">
													{person.name.slice(0, 1)}
												</span>
											)}
											<span className="mt-1 block max-w-16 text-center text-[11px] leading-tight">
												{person.name.split(' ').slice(-1)}
											</span>
										</>
									)
									return (
										<li key={person.id}>
											{named ? (
												<Link href={nodePath(gov, named)} className="block">
													{body}
												</Link>
											) : (
												body
											)}
										</li>
									)
								})}
							</ul>
						</div>
					) : null}
					<p className="mb-3 text-sm text-muted-foreground">
						{newsSource === 'neon'
							? 'Civic feed in Postgres. The nightly monitor replaces this list when it extracts sourced items.'
							: 'Catalog copy. The nightly monitor writes the Postgres feed when a source RSS item is extracted.'}
					</p>
					<ul className="space-y-3">
						{news.map((item) => (
							<li key={item.id} className="rounded-lg border bg-card p-3">
								<p className="text-xs text-muted-foreground">
									{item.publishedAt ? `${item.publishedAt} · ` : ''}
									{item.publication}
								</p>
								<p className="mt-1 text-sm leading-relaxed">
									{item.summary.replace(/<[^>]+>/g, '')}
								</p>
								{item.entityIds && item.entityIds.length > 0 ? (
									<p className="mt-2 flex flex-wrap gap-2">
										{item.entityIds.map((id) => {
											const named = searchIndex.nodes[id]
											if (!named) {
												return null
											}
											return (
												<Link
													key={id}
													href={nodePath(gov, named)}
													className="text-xs text-primary underline-offset-2 hover:underline"
												>
													{named.name}
												</Link>
											)
										})}
									</p>
								) : null}
								<a
									href={item.url}
									className="mt-1 inline-block text-xs text-primary underline-offset-2 hover:underline"
								>
									{item.publication}
								</a>
							</li>
						))}
					</ul>
				</section>

				<section>
					<h2 className="mb-2 font-[family-name:var(--font-heading)] text-lg text-accent">
						Latest changes
					</h2>
					<p className="mb-3 text-sm text-muted-foreground">
						Appointments and departures in the last {powerDays} days.
						{changesSource === 'neon'
							? ' Stored in Postgres.'
							: ' Catalog copy until the monitor writes a personnel row.'}
					</p>
					<nav className="mb-3 flex gap-1" aria-label="Change window">
						{([7, 30, 90] as const).map((days) => {
							const base = viewHref(layer, view)
							const href = base.includes('?')
								? `${base}&days=${days}`
								: `/ng?days=${days}`
							return (
								<Link
									key={days}
									href={href}
									className={`rounded-md px-2.5 py-1 text-xs ${
										powerDays === days
											? 'bg-secondary text-foreground'
											: 'text-muted-foreground hover:bg-secondary'
									}`}
								>
									{days}d
								</Link>
							)
						})}
					</nav>
					<div className="mb-4 grid grid-cols-2 gap-2">
						<Stat label="Seats vacant" value={overview.vacantSeats} />
						<Stat label="Acting officials" value={overview.actingOfficials} />
					</div>
					{latestChange ? (
						<p className="mb-3 text-sm text-muted-foreground">
							Last change {latestChange.date}. {latestChange.personName},{' '}
							{latestChange.positionName}.
						</p>
					) : null}
					<ol className="space-y-2">
						{changes.length === 0 ? (
							<li className="text-sm text-muted-foreground">
								No personnel changes in this window.
							</li>
						) : null}
						{changes.map((change) => (
							<li key={change.id} className="rounded-lg border bg-card p-3 text-sm">
								<p className="text-xs text-muted-foreground">
									{change.date} · {change.departure ? 'Departure' : 'Appointed'}
								</p>
								<p>
									{change.personName} — {change.positionName}
								</p>
								{change.predecessorName ? (
									<p className="text-xs text-muted-foreground">
										Predecessor: {change.predecessorName}
									</p>
								) : null}
							</li>
						))}
					</ol>
					{earlierChanges.length > 0 ? (
						<div className="mt-4">
							<h3 className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
								Earlier
							</h3>
							<ol className="space-y-2">
								{earlierChanges.map((change) => (
									<li key={change.id} className="rounded-lg border bg-card p-3 text-sm">
										<p className="text-xs text-muted-foreground">
											{change.date} · {change.departure ? 'Departure' : 'Appointed'}
										</p>
										<p>
											{change.personName} — {change.positionName}
										</p>
										{change.sourceUrl ? (
											<a
												href={change.sourceUrl}
												className="text-xs text-primary underline-offset-2 hover:underline"
											>
												Source
											</a>
										) : null}
									</li>
								))}
							</ol>
						</div>
					) : null}
				</section>

				<section>
					<h2 className="mb-2 font-[family-name:var(--font-heading)] text-lg text-accent">
						Overview
					</h2>
					<p className="mb-3 text-sm text-muted-foreground">
						{overview.organizationCount} organizations, {overview.subAgencyCount} of
						them sub-agencies.
					</p>
					<div className="grid grid-cols-2 gap-4 text-sm">
						<div>
							<p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
								By type
							</p>
							<CountList items={overview.byType} />
						</div>
						<div>
							<p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
								By branch
							</p>
							<CountList items={overview.byBranch} />
						</div>
					</div>
				</section>
			</aside>
			<section className="order-1 flex h-[70vh] flex-col p-4 lg:sticky lg:top-0 lg:order-2 lg:h-screen lg:p-5">
				<nav
					className="mb-3 flex flex-wrap gap-1"
					aria-label="Graph view"
				>
					{VIEW_LINKS.map((item) => (
						<Link
							key={item.id}
							href={viewHref(layer, item.id)}
							className={`rounded-md px-3 py-2 text-sm ${
								view === item.id
									? 'bg-secondary text-foreground'
									: 'bg-card text-muted-foreground hover:bg-secondary'
							}`}
						>
							{item.label}
						</Link>
					))}
				</nav>
				<div className="min-h-0 flex-1">
					<GraphMap
						gov={gov}
						graph={graph}
						mode={view === 'people' ? 'people' : 'orgs'}
						weights={
							view === 'power'
								? Object.fromEntries(powerMentions.map((item) => [item.id, item.mentions]))
								: undefined
						}
					/>
				</div>
			</section>
		</div>
	)
}

function Stat({ label, value }: { label: string; value: number }) {
	return (
		<div className="rounded-lg border bg-card p-3">
			<p className="text-2xl font-[family-name:var(--font-heading)] text-accent">
				{value}
			</p>
			<p className="text-xs text-muted-foreground">{label}</p>
		</div>
	)
}

function CountList({ items }: { items: Record<string, number> }) {
	return (
		<ul className="space-y-1">
			{Object.entries(items).map(([key, value]) => (
				<li key={key} className="flex justify-between gap-3">
					<span className="capitalize">{key.replace('_', ' ')}</span>
					<span className="text-muted-foreground">{value}</span>
				</li>
			))}
		</ul>
	)
}

export function NodeList({
	gov,
	nodes,
}: {
	gov: string
	nodes: GraphNode[]
}) {
	if (nodes.length === 0) {
		return <p className="text-sm text-muted-foreground">No connected entities on record.</p>
	}
	return (
		<ul className="divide-y rounded-lg border bg-card">
			{nodes.map((node) => (
				<li key={node.id}>
					<Link href={nodePath(gov, node)} className="block px-3 py-2 hover:bg-secondary">
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
