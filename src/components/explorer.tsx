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

interface ExplorerProps {
	gov: string
	title: string
	graph: CompiledGraph
	searchIndex: CompiledGraph
	layer: LayerFilter
	overview: OverviewCounts
	changes: PersonnelChange[]
	news: NewsItem[]
	source: 'neon' | 'catalog'
}

const LAYER_LINKS: Array<{ id: LayerFilter; href: string; label: string }> = [
	{ id: 'federal', href: '/ng', label: 'Federal' },
	{ id: 'state', href: '/ng?layer=states', label: 'States' },
	{ id: 'all', href: '/ng?layer=all', label: 'All' },
]

export function Explorer({
	gov,
	title,
	graph,
	searchIndex,
	layer,
	overview,
	changes,
	news,
	source,
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
					<nav className="mt-3 flex gap-1">
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

				<section>
					<h2 className="mb-2 font-[family-name:var(--font-heading)] text-lg text-accent">
						Latest news
					</h2>
					<ul className="space-y-3">
						{news.map((item) => (
							<li key={item.id} className="rounded-lg border bg-card p-3">
								<p className="text-sm leading-relaxed">
									{item.summary.replace(/<[^>]+>/g, '')}
								</p>
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
						Appointments and departures from the civic feed in Postgres.
						A nightly cron recompiles occupancy from nass.gov.ng when
						DATABASE_URL is set.
					</p>
					<div className="mb-4 grid grid-cols-2 gap-2">
						<Stat label="Seats vacant" value={overview.vacantSeats} />
						<Stat label="Acting officials" value={overview.actingOfficials} />
					</div>
					<ol className="space-y-2">
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
			<section className="order-1 p-4 lg:order-2 lg:p-5">
				<GraphMap gov={gov} graph={graph} />
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
