import Image from 'next/image'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { BrandBar } from '@/components/brand-bar'
import { NewsProse, type ProseItem } from '@/components/panel-client'
import { changesInWindow } from '@/lib/graph/feed'
import { filterGraph, parseLayer } from '@/lib/graph/filter'
import { toneOf } from '@/lib/graph/layout'
import { mentionLabels } from '@/lib/graph/mentions'
import { newsLead, newsSegments } from '@/lib/graph/news-text'
import { loadNigeriaGraph } from '@/lib/graph/nigeria'
import { summarizeOverview } from '@/lib/graph/overview'
import { nodePath } from '@/lib/graph/paths'
import { powerPeople } from '@/lib/graph/power'
import type { CompiledGraph, PersonnelChange } from '@/lib/graph/types'

interface PageProps {
	searchParams: Promise<{ layer?: string; days?: string }>
}

const WINDOWS = [7, 30, 90] as const

function displayDate(date: string) {
	return new Date(`${date}T12:00:00Z`).toLocaleDateString('en', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

function ageInDays(date: string, today: string) {
	return Math.max(0, Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / 86400000))
}

export default async function NigeriaHome({ searchParams }: PageProps) {
	const params = await searchParams
	const layer = parseLayer(params.layer) === 'state' ? 'state' : 'federal'
	const days = WINDOWS.find((value) => String(value) === params.days) ?? 30
	const data = await loadNigeriaGraph()
	const now = new Date()
	const today = now.toISOString().slice(0, 10)
	const graph = filterGraph(data.graph, layer)
	const overview = summarizeOverview(graph)
	const labels = mentionLabels(data.graph)

	const stories = data.news.filter((item) => item.entityIds?.length).sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
	const prose: ProseItem[] = stories.slice(0, 12).map((item) => ({
		id: item.id,
		url: item.url,
		segments: newsSegments(newsLead(item), labels).map((segment) => {
			const node = segment.id ? data.graph.nodes[segment.id] : undefined
			return node
				? { text: segment.text, href: nodePath(data.gov, node), tone: toneOf(node), type: node.type }
				: { text: segment.text }
		}),
	}))
	const inNews = powerPeople(data.graph, data.news, 90, now).people.slice(0, 5)

	const changes = [...data.changes].sort((a, b) => b.date.localeCompare(a.date))
	const windowed = changesInWindow(changes, days, now)
	const latest = changes[0]
	const month = today.slice(0, 7)
	const groups: Array<{ label: string; items: PersonnelChange[] }> = windowed.length
		? [
				{ label: 'This month', items: windowed.filter((change) => change.date.startsWith(month)) },
				{ label: 'Earlier in window', items: windowed.filter((change) => !change.date.startsWith(month)) },
			]
		: [{ label: 'Earlier', items: changes.slice(0, 8) }]
	const byDate = new Map<string, number>()
	for (const change of windowed) byDate.set(change.date, (byDate.get(change.date) ?? 0) + 1)

	return (
		<>
			<BrandBar layer={layer} />
			<section className="panel-card">
				<h1 className="sr-only">Nigeria government graph</h1>
				<h2>Latest News</h2>
				{prose.length ? <NewsProse items={prose} /> : <p className="muted-copy">No sourced news is available yet.</p>}
				<Link href="/ng?view=power" className="news-people" scroll={false}>
					<span className="avatar-stack">
						{inNews.map((person) =>
							person.imageUrl ? (
								<Image key={person.nodeId} src={person.imageUrl} alt="" width={26} height={26} unoptimized />
							) : (
								<span key={person.nodeId}>{person.name.charAt(0)}</span>
							),
						)}
					</span>
					<span>Who’s in the news</span>
					<small>Power map <ChevronRight size={14} /></small>
				</Link>
			</section>

			<section className="panel-card">
				<div className="section-heading">
					<h2>Latest Changes</h2>
					<nav className="segmented" aria-label="Change window">
						{WINDOWS.map((value) => (
							<Link key={value} href={`/ng?${new URLSearchParams({ ...(layer === 'state' ? { layer: 'states' } : {}), days: String(value) })}`} aria-current={days === value ? 'page' : undefined} scroll={false}>
								{value}D
							</Link>
						))}
					</nav>
				</div>
				<p className="section-intro">
					Govgraph tracks appointments, departures and structural changes from official sources: the State House, the National Assembly and ministry notices.
				</p>
				<div className="stats">
					<Stat label="Seats vacant" value={overview.vacantSeats} note="no current officeholder" />
					<Stat label="Acting officials" value={overview.actingOfficials} note="serving unconfirmed" />
					<Stat
						label="Last change"
						value={latest ? `${ageInDays(latest.date, today)}d` : '—'}
						note={latest ? `ago, on ${displayDate(latest.date)}` : 'none recorded'}
					/>
				</div>
				<div className="timeline-heading">
					<span>Timeline</span>
					<span>{windowed.length} {windowed.length === 1 ? 'change' : 'changes'} in window</span>
				</div>
				<div className="timeline" aria-label={`${windowed.length} changes over the last ${days} days`}>
					{[...byDate.entries()].map(([date, count]) => (
						<span key={date} className="timeline-point" style={{ left: `${100 - (ageInDays(date, today) / days) * 100}%` }} title={`${count} on ${displayDate(date)}`}>
							{count}
						</span>
					))}
				</div>
				<div className="timeline-scale">
					<span>{days}d ago</span>
					<span>{Math.round((days * 2) / 3)}d</span>
					<span>{Math.round(days / 3)}d</span>
					<span>today</span>
				</div>
				{groups.filter((group) => group.items.length).map((group) => (
					<div key={group.label}>
						<div className="change-group-label">
							<span>{group.label}</span>
							<span>{group.items.length}</span>
						</div>
						<ol className="change-list">
							{group.items.map((change) => <ChangeCard key={change.id} change={change} graph={data.graph} gov={data.gov} />)}
						</ol>
					</div>
				))}
			</section>

			<section className="panel-card">
				<h2>Overview</h2>
				<p className="muted-copy">Top-level counts for the {layer === 'state' ? 'state governments' : 'Federal Government of Nigeria'}.</p>
				<div className="overview-columns">
					<CountList title="By type" items={overview.byType} />
					<CountList title="By branch" items={Object.fromEntries(Object.entries(overview.byBranch).filter(([, value]) => value > 0))} />
				</div>
				<p className="overview-total">
					<strong>{overview.organizationCount}</strong> organizations in total, <strong>{overview.subAgencyCount}</strong> of them sub-agencies.
				</p>
			</section>
			<footer className="panel-footer">
				Govgraph maps Nigeria’s institutions, the offices inside them, and the constitutional and statutory links between them. Every entity links to its legal source.
			</footer>
		</>
	)
}

function ChangeCard({ change, graph, gov }: { change: PersonnelChange; graph: CompiledGraph; gov: string }) {
	const group = graph.nodes[change.groupId]
	const verb = change.departure ? 'Departed' : change.entryMode === 'elected' ? 'Elected' : change.entryMode === 'sworn' ? 'Sworn in' : change.entryMode === 'reappointed' ? 'Reappointed' : 'Appointed'
	return (
		<li className="change-card">
			<div className="change-meta">
				<span className={change.departure ? 'badge departure' : 'badge appointed'}>{verb}</span>
				<span>
					{displayDate(change.date)}
					{change.sourceUrl ? (
						<a href={change.sourceUrl} target="_blank" rel="noreferrer" aria-label={`Source for ${change.personName}`}> ↗</a>
					) : null}
				</span>
			</div>
			<h3>{group ? <Link href={nodePath(gov, group)}>{change.positionName}</Link> : change.positionName}</h3>
			<dl className="change-people">
				<div>
					<dt>Out</dt>
					<dd className={change.departure || change.predecessorName ? '' : 'is-empty'}>
						{change.departure
							? change.personName
							: change.predecessorName ?? (change.entryMode === 'reappointed' ? 'Same officeholder · tenure renewed' : 'Predecessor not on record')}
					</dd>
				</div>
				<div>
					<dt>In</dt>
					<dd className={change.departure ? 'is-empty' : ''}>{change.departure ? 'Successor not yet named' : change.personName}</dd>
				</div>
			</dl>
		</li>
	)
}

function Stat({ label, value, note }: { label: string; value: number | string; note: string }) {
	return (
		<div className="stat">
			<span>{label}</span>
			<strong>{value}</strong>
			<small>{note}</small>
		</div>
	)
}

function CountList({ title, items }: { title: string; items: Record<string, number> }) {
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
