import { PagePanel } from '@/components/page-panel'
import { formatNewsDate } from '@/lib/dates'
import { trendingTopics } from '@/lib/graph/trending'
import { CIVIC_TOPICS } from '@/data/nigeria/topics'
import { powerPeople } from '@/lib/graph/power'
import Link from 'next/link'
import { loadNigeriaGraph } from '@/lib/graph/nigeria'
import { filterGraph } from '@/lib/graph/filter'
import { summarizeOverview } from '@/lib/graph/overview'
import { mentionLabels } from '@/lib/graph/mentions'
import { newsLead, newsSegments } from '@/lib/graph/news-text'
import { nodePath } from '@/lib/graph/paths'
import { toneOf } from '@/lib/graph/layout'
import { federalCharacter } from '@/lib/graph/federal-character'
import { BUDGET_2026, naira } from '@/data/nigeria/budget'
import { MINISTRY_BUDGETS } from '@/data/nigeria/budget-2026'
import type { CompiledGraph } from '@/lib/graph/types'
import { T } from '@/components/lang'
import { HomeContent } from '@/components/home-content'

/** Only homepage content crosses this boundary; map/search data has its own shared JSON resource. */
export default async function NigeriaHome() {
	const data = await loadNigeriaGraph()
	const now = new Date()
	const trending = trendingTopics(data.news, CIVIC_TOPICS, now)
	const inNews = powerPeople(data.graph, data.news, 90, now).people.slice(0, 5)
	const labels = mentionLabels(data.graph)
	const stories = data.news.filter((item) => item.entityIds?.length && hostOf(item.url)).sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
	const prose = stories.slice(0, 12).map((item) => ({
		id: item.id, url: item.url, source: hostOf(item.url),
		// An absolute publication date remains true however long this page is cached.
		when: formatNewsDate(item.publishedAt),
		segments: newsSegments(newsLead(item), labels).map((segment) => {
			const node = segment.id ? data.graph.nodes[segment.id] : undefined
			return node ? { text: segment.text, href: nodePath(data.gov, node), tone: toneOf(node), type: node.type } : { text: segment.text }
		}),
	}))
	return <PagePanel><HomeContent data={{
		gov: data.gov,
		inecHref: data.graph.nodes['ng-inec'] ? nodePath(data.gov, data.graph.nodes['ng-inec']) : '/ng',
		states: Object.values(data.graph.nodes).filter((node) => node.type === 'state').map((node) => ({ id: node.id, name: node.name })),
		overviews: { federal: summarizeOverview(filterGraph(data.graph, 'federal')), state: summarizeOverview(filterGraph(data.graph, 'state')) },
		prose,
		trending,
		inNews,
		changes: data.changes.map((change) => ({ ...change, href: data.graph.nodes[change.groupId] ? nodePath(data.gov, data.graph.nodes[change.groupId]) : undefined })),
	}} federalCards={<><FederalCharacterCard gov={data.gov} graph={data.graph} /><BudgetHomeCard gov={data.gov} graph={data.graph} /></>} /></PagePanel>
}

function hostOf(url: string) {
	try {
		const parsed = new URL(url)
		return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.hostname.replace(/^www\./, '') : ''
	} catch { return '' }
}

/** The cabinet's spread across the states, measured against section 147(3). */
function FederalCharacterCard({ gov, graph }: { gov: string; graph: CompiledGraph }) {
	const report = federalCharacter(graph)
	const covered = report.states.length - report.uncovered.length
	return (
		<Link href={`/${gov}/federal-character`} className="panel-card fc-card">
			<div>
				<h2><T k="federalCharacter" /></h2>
				<p className="muted-copy">
					<T k="federalCharacterCard" values={{ covered, states: report.states.length, members: report.members.length }} />
				</p>
			</div>
			<span aria-hidden="true" className="fc-card-arrow">→</span>
		</Link>
	)
}

/** The 2026 budget at a glance: the total and the three largest ministries, linking to the full ranking. */
function BudgetHomeCard({ gov, graph }: { gov: string; graph: CompiledGraph }) {
	const top = Object.entries(MINISTRY_BUDGETS)
		.filter(([id]) => id.startsWith('ng-ministry-of-') && graph.nodes[id])
		.sort((a, b) => b[1].total - a[1].total)
		.slice(0, 3)
	const largest = top[0]?.[1].total ?? 1
	return (
		<Link href={`/${gov}/budget`} className="panel-card fc-card budget-home">
			<div>
				<h2><T k="budgetTitle" /></h2>
				<p className="muted-copy"><T k="budgetCard" values={{ total: naira(BUDGET_2026.total) }} /></p>
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
