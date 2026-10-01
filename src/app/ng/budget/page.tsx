import { BrandBar } from '@/components/brand-bar'
import { actPage } from '@/components/budget-card'
import { BudgetExplorer, type ExplorerBudget } from '@/components/budget-explorer'
import { BUDGET_2026, naira, perNigerian, POPULATION_2026 } from '@/data/nigeria/budget'
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
	// The explorer gets only what it shows: the graph and the Act's data stay on the server.
	const rows: ExplorerBudget[] = ranked.map(({ id, budget, node }) => {
		const seat = node.head ? graph.nodes[node.head] : undefined
		const person = seat?.people[0]
		return {
			id,
			label: LABELS[id] ?? node.name,
			href: nodePath(gov, node),
			personnel: budget.personnel,
			overhead: budget.overhead,
			capital: budget.capital,
			total: budget.total,
			actHref: actPage(budget.page),
			page: budget.page,
			lines: budget.lines,
			largest: budget.largest.map((line) => {
				const lineNode = line.nodeId ? graph.nodes[line.nodeId] : undefined
				return { name: line.name, total: line.total, href: lineNode ? nodePath(gov, lineNode) : undefined }
			}),
			head: seat && person ? { name: person.name, role: seat.name, href: nodePath(gov, seat) } : undefined,
		}
	})
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
				<p className="budget-per-person">
					That is about <strong>{perNigerian(BUDGET_2026.total)}</strong> for every Nigerian.
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
					Headline figures: <a className="entity-link" href={BUDGET_2026.sourceUrl} target="_blank" rel="noreferrer">report of the assent</a>. Line figures: <a className="entity-link" href={ACT_URL} target="_blank" rel="noreferrer">the Act, Budget Office of the Federation</a>. Per person: {POPULATION_2026.total.toLocaleString('en-NG')} people, from <a className="entity-link" href={POPULATION_2026.sourceUrl} target="_blank" rel="noreferrer">{POPULATION_2026.source}</a> (1 July 2026).
				</p>
			</article>

			<section className="detail-roster">
				<div className="detail-roster-heading">
					<h2>By ministry and office</h2>
					<span>own spending, largest first · tap one to open it</span>
				</div>
				<BudgetExplorer rows={rows} />
				<p className="muted-copy">
					Not counted against any ministry: {passThrough.map((item) => `${naira(item.total)} (${item.label})`).join('; ')}. The National Assembly, the judiciary and INEC are funded by statutory transfers, outside these lines. Where the Act prints no total for a ministry, the figure is the sum of its lines.
				</p>
			</section>
		</>
	)
}
