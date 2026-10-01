import Link from 'next/link'
import { BUDGET_2026, naira, perNigerian, type AgencyBudget, type MinistryBudget } from '@/data/nigeria/budget'
import { ACT_PDF_URL, AGENCY_BUDGETS, MINISTRY_BUDGETS } from '@/data/nigeria/budget-2026'
import { nodePath } from '@/lib/graph/paths'
import { SpendBar } from '@/components/spend-bar'
import type { CompiledGraph } from '@/lib/graph/types'

export { SpendBar }

export function actPage(page: number) {
	return `${ACT_PDF_URL}#page=${page}`
}

export function budgetFor(id: string): { ministry?: MinistryBudget; agency?: AgencyBudget } | null {
	const ministry = MINISTRY_BUDGETS[id]
	const agency = AGENCY_BUDGETS[id]
	return ministry || agency ? { ministry, agency } : null
}

/** What the 2026 Appropriation Act gives this body, with the page to check it against. */
export function BudgetCard({ id, gov, graph }: { id: string; gov: string; graph: CompiledGraph }) {
	const found = budgetFor(id)
	if (!found) return null
	const { ministry, agency } = found
	const figures = ministry ?? agency!
	const share = (figures.total / BUDGET_2026.total) * 100
	return (
		<section className="panel-card budget-card">
			<header>
				<h2>2026 budget</h2>
				<Link href={`/${gov}/budget`}>All ministries</Link>
			</header>
			<p className="budget-total">
				<strong>{naira(figures.total)}</strong>
				<span>{share >= 0.1 ? `${share.toFixed(1)}%` : 'under 0.1%'} of the ₦68.32 trillion budget · about {perNigerian(figures.total)} for every Nigerian</span>
			</p>
			<SpendBar {...figures} />
			{ministry?.passThrough?.map((item) => (
				<p key={item.label} className="budget-note">
					Not counted above: {naira(item.total)} ({item.label}).
				</p>
			))}
			{agency?.passThrough ? <p className="budget-note">Almost all of this is money routed through the office for all of government ({agency.passThrough}), not its own spending.</p> : null}
			{ministry && ministry.lines > 1 ? (
				<>
					<h3>Largest lines, of {ministry.lines}</h3>
					<ol className="budget-lines">
						{ministry.largest.map((line) => {
							const node = line.nodeId ? graph.nodes[line.nodeId] : undefined
							return (
								<li key={line.code}>
									{node ? <Link href={nodePath(gov, node)} className="entity-link">{line.name}</Link> : <span>{line.name}</span>}
									<span>
										{naira(line.total)} · <a href={actPage(line.page)} target="_blank" rel="noreferrer">p.{line.page}</a>
									</span>
								</li>
							)
						})}
					</ol>
				</>
			) : null}
			{/* Ministries are rows of the budget flow: there their money can be followed from the total to what it buys. */}
			{ministry && graph.nodes[id] ? (
				<Link href={`${nodePath(gov, graph.nodes[id])}?view=budget`} className="fc-pick-link budget-flow-link">See it in the budget flow →</Link>
			) : null}
			<p className="budget-source">
				{ministry?.basis === 'lines' ? 'Sum of the lines the Act lists under it. ' : ''}
				Source: <a href={actPage(ministry?.page ?? agency!.page)} target="_blank" rel="noreferrer">2026 Appropriation Act, p.{ministry?.page ?? agency!.page}</a>
				{agency ? ` · line ${agency.code}` : ''}
			</p>
		</section>
	)
}
