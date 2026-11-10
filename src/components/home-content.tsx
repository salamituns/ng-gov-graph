'use client'

import Image from 'next/image'
import Link from 'next/link'
import { FeedbackButton } from '@/components/feedback'
import { ChevronRight } from 'lucide-react'
import { BrandBar } from '@/components/brand-bar'
import { ElectionCountdown } from '@/components/election-countdown'
import { QuickActions } from '@/components/quick-actions'
import { RepresentPicker } from '@/components/represent-picker'
import { TrendingTopics } from '@/components/trending-topics'
import { CIVIC_TOPICS } from '@/data/nigeria/topics'
import { trendingTopics } from '@/lib/graph/trending'
import { NewsProse, type ProseItem } from '@/components/panel-client'
import { changesInWindow } from '@/lib/graph/feed'
import { parseLayer } from '@/lib/graph/filter'
import { powerPeople } from '@/lib/graph/power'
import type { OverviewCounts, PersonnelChange } from '@/lib/graph/types'
import { T } from '@/components/lang'
import { Fold } from '@/components/fold'

import { useMemo, type ReactNode } from 'react'
import { useQuery } from '@/components/query'
import { useGraphData } from '@/components/graph-data'
import { useClock } from '@/components/clock'

interface HomeData {
	gov: string
	inecHref: string
	states: { id: string; name: string }[]
	overviews: Record<'federal' | 'state', OverviewCounts>
	prose: ProseItem[]
	changes: Array<PersonnelChange & { href?: string }>
}

const WINDOWS = [7, 30, 90] as const

function displayDate(date: string) {
	return new Date(`${date}T12:00:00Z`).toLocaleDateString('en', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

function ageInDays(date: string, today: string) {
	return Math.max(0, Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / 86400000))
}

export function HomeContent({ data, federalCards }: { data: HomeData; federalCards: ReactNode }) {
	const params = useQuery()
	const layer = parseLayer(params.get('layer') ?? undefined) === 'state' ? 'state' : 'federal'
	const days = WINDOWS.find((value) => String(value) === params.get('days')) ?? 30
	const clock = useClock()
	const now = clock ? new Date(clock) : null
	const today = now?.toISOString().slice(0, 10) ?? ''
	const overview = data.overviews[layer]
	const prose = data.prose
	const shared = useGraphData().data
	const inNews = useMemo(() => shared && clock ? powerPeople(shared.graph, shared.news, 90, new Date(clock)).people.slice(0, 5) : [], [shared, clock])
	const trending = useMemo(() => trendingTopics(shared?.news ?? [], CIVIC_TOPICS, new Date(clock)), [shared, clock])

	const changes = [...data.changes].sort((a, b) => b.date.localeCompare(a.date))
	const windowed = now ? changesInWindow(changes, days, now) : []
	const latest = changes[0]
	const month = today.slice(0, 7)
	const groups: Array<{ label: string; items: HomeData['changes'] }> = windowed.length
		? [
				{ label: new Date(`${today}T12:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }), items: windowed.filter((change) => change.date.startsWith(month)) },
				{ label: 'Before this month', items: windowed.filter((change) => !change.date.startsWith(month)) },
			]
		: [{ label: 'Most recent on record', items: changes.slice(0, 8) }]
	const byDate = new Map<string, number>()
	for (const change of windowed) byDate.set(change.date, (byDate.get(change.date) ?? 0) + 1)

	return (
		<>
			<BrandBar layer={layer} tagline />
			{layer === 'federal' ? <QuickActions gov={data.gov} /> : null}
			{layer === 'federal' ? <TrendingTopics gov={data.gov} trending={trending} heading={trending.hasHistory ? 'trendingThisWeek' : 'mostCoveredThisWeek'} /> : null}
			<ElectionCountdown inecHref={data.inecHref} guideHref={`/${data.gov}/elections`} />
			<RepresentPicker
				gov={data.gov}
				states={data.states}
			/>
			{layer === 'federal' ? federalCards : null}
			<section className="panel-card">
				<h1 className="sr-only">Who Runs Naija: Nigeria’s government, mapped and sourced</h1>
				<h2><T k="newsHeading" /></h2>
				{prose.length ? <NewsProse items={prose} /> : <p className="muted-copy">No sourced news is available yet.</p>}
				<Link href="/ng?view=newsmakers" className="news-people" scroll={false}>
					<span className="avatar-stack">
						{inNews.map((person) =>
							person.imageUrl ? (
								<Image key={person.nodeId} src={person.imageUrl} alt="" width={26} height={26} unoptimized />
							) : (
								<span key={person.nodeId}>{person.name.charAt(0)}</span>
							),
						)}
					</span>
					<span>The people behind the headlines</span>
					<small>Newsmakers <ChevronRight size={14} /></small>
				</Link>
			</section>

			<section className="panel-card">
				<div className="section-heading">
					<h2><T k="appointmentsHeading" /></h2>
					<nav className="segmented" aria-label="Change window">
						{WINDOWS.map((value) => (
							<Link key={value} href={`/ng?${new URLSearchParams({ ...(layer === 'state' ? { layer: 'states' } : {}), days: String(value) })}`} aria-current={days === value ? 'page' : undefined} scroll={false}>
								{value}D
							</Link>
						))}
					</nav>
				</div>
				<p className="section-intro">
					Every appointment, reappointment and exit we can source, read from State House releases, the National Assembly and agency notices, with a link to each.
				</p>
				<div className="stats">
					<Stat label="Empty seats" value={overview.vacantSeats} note="no one in post" />
					<Stat label="Acting" value={overview.actingOfficials} note="not yet substantive" />
					<Stat
						label="Most recent"
						value={latest ? now ? `${ageInDays(latest.date, today)}d` : displayDate(latest.date) : '—'}
						note={latest ? now ? `ago, on ${displayDate(latest.date)}` : 'most recent recorded' : 'none recorded'}
					/>
				</div>
				<div className="timeline-heading">
					<span>Activity</span>
					<span>{!now ? 'Loading activity…' : windowed.length ? `${windowed.length} in the last ${days} days` : `none in the last ${days} days`}</span>
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
						<Fold as="ol" className="change-list" limit={3} showAll={`Show all ${group.items.length}`}>
							{group.items.map((change) => <ChangeCard key={change.id} change={change} />)}
						</Fold>
					</div>
				))}
			</section>

			<section className="panel-card">
				<h2><T k="numbersHeading" /></h2>
				<p className="muted-copy">What the {layer === 'state' ? 'state governments' : 'Federal Government of Nigeria'} is made of, as mapped here.</p>
				<div className="overview-columns">
					<CountList title="By type" items={overview.byType} />
					<CountList title="By branch" items={Object.fromEntries(Object.entries(overview.byBranch).filter(([, value]) => value > 0))} />
				</div>
				{layer === 'federal' ? (
					<Link href={`/${data.gov}/budget`} className="overview-budget">Where the 2026 budget goes →</Link>
				) : null}
				<p className="overview-total">
					<strong>{overview.organizationCount}</strong> organizations in total, <strong>{overview.subAgencyCount}</strong> of them sub-agencies.
				</p>
			</section>
			<footer className="panel-footer">
				<div className="footer-feedback">
					<FeedbackButton kind="feature" label="Suggest a feature" />
					<FeedbackButton kind="error" label="Report an error" />
				</div>
				Who Runs Naija is an independent Nigerian civic project. It maps the country’s institutions, the offices inside them, and the constitutional and statutory links between them, and every entity links to its legal basis.
				<span>
					Inspired by <a href="https://graph.civlab.org/us" target="_blank" rel="noreferrer">CivLab’s US Gov Graph</a>, and built for Nigeria.
				</span>{' '}
				<span>
					Map of Nigeria: <a href="https://www.geoboundaries.org/" target="_blank" rel="noreferrer">geoBoundaries</a> (GRID3, 2022), CC BY 4.0.
				</span>
			</footer>
		</>
	)
}

function ChangeCard({ change }: { change: PersonnelChange & { href?: string } }) {
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
			<h3>{change.href ? <Link href={change.href}>{change.positionName}</Link> : change.positionName}</h3>
			<dl className="change-people">
				<div>
					<dt>Outgoing</dt>
					<dd className={change.departure || change.predecessorName ? '' : 'is-empty'}>
						{change.departure
							? change.personName
							: change.predecessorName ?? (change.entryMode === 'reappointed' ? 'Same officeholder · tenure renewed' : 'Previous holder not recorded')}
					</dd>
				</div>
				<div>
					<dt>Incoming</dt>
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
