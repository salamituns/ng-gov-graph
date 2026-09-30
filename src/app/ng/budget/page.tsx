import Link from 'next/link'
import { BrandBar } from '@/components/brand-bar'
import { actPage } from '@/components/budget-card'
import { BUDGET_2026, naira } from '@/data/nigeria/budget'
import { ACT_URL, MINISTRY_BUDGETS } from '@/data/nigeria/budget-2026'
import { loadNigeriaGraph } from '@/lib/graph/nigeria'
import { nodePath } from '@/lib/graph/paths'

export const metadata = { title: 'Where the money goes · Who Runs Naija' }

/** The Act's own names where the map's node names read oddly in a list of budgets. */
const LABELS: Record<string, string> = { 'ng-president': 'The Presidency', 'ng-fct': 'FCT Administration' }

export default async function BudgetPage() {
	const { gov, graph } = await loadNigeriaGraph()
	const ranked = Object.entries(MINISTRY_BUDGETS)
		.map(([id, budget]) => ({ id, budget, node: graph.nodes[id] }))
		.filter((item) => item.node)
		.sort((a, b) => b.budget.total - a.budget.total)
	const top = ranked[0]?.budget.total ?? 1
	const passThrough = ranked.flatMap((item) => item.budget.passThrough ?? [])

	return (
		<>
			<BrandBar crumbs={[{ label: 'Where the money goes' }]} />
			<article className="panel-card entity-card">
				<p className="represent-zone">{BUDGET_2026.title}</p>
				<h1>Where the money goes</h1>
				<p className="entity-description">
					The National Assembly appropriated {naira(BUDGET_2026.total)} for 2026, and the President signed it on 17 April 2026. Here is what each ministry and office was given, from the Act itself.
				</p>
				<ul className="budget-parts">
					{BUDGET_2026.parts.map((part) => (
						<li key={part.label}>
							<strong>{naira(part.total)}</strong>
							<span>{part.label}</span>
						</li>
					))}
				</ul>
				<p className="muted-copy">
					Headline figures: <a className="entity-link" href={BUDGET_2026.sourceUrl} target="_blank" rel="noreferrer">report of the assent</a>. Line figures: <a className="entity-link" href={ACT_URL} target="_blank" rel="noreferrer">the Act, Budget Office of the Federation</a>.
				</p>
			</article>

			<section className="detail-roster">
				<div className="detail-roster-heading">
					<h2>By ministry and office</h2>
					<span>own spending, largest first</span>
				</div>
				<ol className="budget-ranking">
					{ranked.map(({ id, budget, node }) => (
						<li key={id}>
							<Link href={nodePath(gov, node)} className="budget-rank-name">{LABELS[id] ?? node.name}</Link>
							<span className="fc-bar" aria-hidden="true"><span style={{ width: `${(budget.total / top) * 100}%` }} /></span>
							<span className="budget-rank-total">
								{naira(budget.total)} <a href={actPage(budget.page)} target="_blank" rel="noreferrer" aria-label={`Act, page ${budget.page}`}>p.{budget.page}</a>
							</span>
						</li>
					))}
				</ol>
				<p className="muted-copy">
					Not counted against any ministry: {passThrough.map((item) => `${naira(item.total)} (${item.label})`).join('; ')}. The National Assembly, the judiciary and INEC are funded by statutory transfers, outside these lines. Where the Act prints no total for a ministry, the figure is the sum of its lines.
				</p>
			</section>
		</>
	)
}
