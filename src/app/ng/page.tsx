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
import { filterGraph, parseLayer } from '@/lib/graph/filter'
import { toneOf } from '@/lib/graph/layout'
import { mentionLabels } from '@/lib/graph/mentions'
import { newsLead, newsSegments } from '@/lib/graph/news-text'
import { loadNigeriaGraph } from '@/lib/graph/nigeria'
import { summarizeOverview } from '@/lib/graph/overview'
import { nodePath } from '@/lib/graph/paths'
import { powerPeople } from '@/lib/graph/power'
import type { CompiledGraph, PersonnelChange } from '@/lib/graph/types'
import { federalCharacter } from '@/lib/graph/federal-character'
import { BUDGET_2026, naira } from '@/data/nigeria/budget'
import { MINISTRY_BUDGETS } from '@/data/nigeria/budget-2026'
import { t, type Lang } from '@/lib/i18n'
import { getLang } from '@/lib/i18n-server'
import { Fold } from '@/components/fold'

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
	const [data, lang] = await Promise.all([loadNigeriaGraph(), getLang()])
	const now = new Date()
	const today = now.toISOString().slice(0, 10)
	const graph = filterGraph(data.graph, layer)
	const overview = summarizeOverview(graph)
	const labels = mentionLabels(data.graph)

	// Only http(s) links reach the page: a malformed or javascript: URL from a feed is dropped, not rendered.
	const stories = data.news.filter((item) => item.entityIds?.length && hostOf(item.url)).sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
	const prose: ProseItem[] = stories.slice(0, 12).map((item) => ({
		id: item.id,
		url: item.url,
		source: hostOf(item.url),
		when: item.publishedAt ? storyTime(item.publishedAt, now) : undefined,
		segments: newsSegments(newsLead(item), labels).map((segment) => {
			const node = segment.id ? data.graph.nodes[segment.id] : undefined
			return node
				? { text: segment.text, href: nodePath(data.gov, node), tone: toneOf(node), type: node.type }
				: { text: segment.text }
		}),
	}))
	const inNews = powerPeople(data.graph, data.news, 90, now).people.slice(0, 5)
	const trending = trendingTopics(data.news, CIVIC_TOPICS, now)

	const changes = [...data.changes].sort((a, b) => b.date.localeCompare(a.date))
	const windowed = changesInWindow(changes, days, now)
	const latest = changes[0]
	const month = today.slice(0, 7)
	const groups: Array<{ label: string; items: PersonnelChange[] }> = windowed.length
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
			{layer === 'federal' ? <TrendingTopics gov={data.gov} trending={trending} heading={t(lang, trending.hasHistory ? 'trendingThisWeek' : 'mostCoveredThisWeek')} /> : null}
			<ElectionCountdown serverNow={now.toISOString()} inecHref={data.graph.nodes['ng-inec'] ? nodePath(data.gov, data.graph.nodes['ng-inec']) : '/ng'} guideHref={`/${data.gov}/elections`} />
			<RepresentPicker
				gov={data.gov}
				states={Object.values(data.graph.nodes).filter((node) => node.type === 'state').map((node) => ({ id: node.id, name: node.name }))}
			/>
			{layer === 'federal' ? <FederalCharacterCard gov={data.gov} graph={data.graph} lang={lang} /> : null}
			{layer === 'federal' ? <BudgetHomeCard gov={data.gov} graph={data.graph} lang={lang} /> : null}
			<section className="panel-card">
				<h1 className="sr-only">Who Runs Naija: Nigeria’s government, mapped and sourced</h1>
				<h2>{t(lang, 'newsHeading')}</h2>
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
					<h2>{t(lang, 'appointmentsHeading')}</h2>
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
						value={latest ? `${ageInDays(latest.date, today)}d` : '—'}
						note={latest ? `ago, on ${displayDate(latest.date)}` : 'none recorded'}
					/>
				</div>
				<div className="timeline-heading">
					<span>Activity</span>
					<span>{windowed.length ? `${windowed.length} in the last ${days} days` : `none in the last ${days} days`}</span>
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
							{group.items.map((change) => <ChangeCard key={change.id} change={change} graph={data.graph} gov={data.gov} />)}
						</Fold>
					</div>
				))}
			</section>

			<section className="panel-card">
				<h2>{t(lang, 'numbersHeading')}</h2>
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

/** The cabinet's spread across the states, measured against section 147(3). */
function FederalCharacterCard({ gov, graph, lang }: { gov: string; graph: CompiledGraph; lang: Lang }) {
	const report = federalCharacter(graph)
	const covered = report.states.length - report.uncovered.length
	return (
		<Link href={`/${gov}/federal-character`} className="panel-card fc-card">
			<div>
				<h2>{t(lang, 'federalCharacter')}</h2>
				<p className="muted-copy">
					{t(lang, 'federalCharacterCard', { covered, states: report.states.length, members: report.members.length })}
				</p>
			</div>
			<span aria-hidden="true" className="fc-card-arrow">→</span>
		</Link>
	)
}

/** "Today", "Yesterday" or "30 Sep": the feeds give a publication date, not a time. */
function storyTime(published: string, now: Date) {
	const lagos = (value: Date) => value.toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' })
	const day = /^\d{4}-\d{2}-\d{2}$/.test(published) ? published : lagos(new Date(published))
	if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return undefined
	if (day === lagos(now)) return 'Today'
	if (day === lagos(new Date(now.getTime() - 86_400_000))) return 'Yesterday'
	return new Date(`${day}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
}

/** "punchng.com" for an http(s) link; empty for anything malformed or with another scheme. */
function hostOf(url: string) {
	try {
		const parsed = new URL(url)
		return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.hostname.replace(/^www\./, '') : ''
	} catch {
		return ''
	}
}

/** The 2026 budget at a glance: the total and the three largest ministries, linking to the full ranking. */
function BudgetHomeCard({ gov, graph, lang }: { gov: string; graph: CompiledGraph; lang: Lang }) {
	const top = Object.entries(MINISTRY_BUDGETS)
		.filter(([id]) => id.startsWith('ng-ministry-of-') && graph.nodes[id])
		.sort((a, b) => b[1].total - a[1].total)
		.slice(0, 3)
	const largest = top[0]?.[1].total ?? 1
	return (
		<Link href={`/${gov}/budget`} className="panel-card fc-card budget-home">
			<div>
				<h2>{t(lang, 'budgetTitle')}</h2>
				<p className="muted-copy">{t(lang, 'budgetCard', { total: naira(BUDGET_2026.total) })}</p>
				<ul className="budget-home-bars">
					{top.map(([id, budget]) => (
						<li key={id}>
							<span>{graph.nodes[id].name.replace(/^(Federal )?Ministry of /, '')}</span>
							<span className="fc-bar" aria-hidden="true"><span style={{ width: `${(budget.total / largest) * 100}%` }} /></span>
							<strong>{naira(budget.total).replace(' trillion', 'T').replace(' billion', 'B')}</strong>
						</li>
					))}
				</ul>
			</div>
			<span aria-hidden="true" className="fc-card-arrow">→</span>
		</Link>
	)
}
