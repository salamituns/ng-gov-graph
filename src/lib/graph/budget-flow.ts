import { BUDGET_2026 } from '@/data/nigeria/budget'
import { AGENCY_BUDGETS, MINISTRY_BUDGETS } from '@/data/nigeria/budget-2026'
import type { CompiledGraph } from './types'

export interface FlowMinistry {
	id: string
	label: string
	personnel: number
	overhead: number
	capital: number
	total: number
}

/** How the 2026 budget divides, as four columns that each add up: the whole, its parts, ministries, spending type. */
export interface BudgetFlow {
	total: number
	parts: { id: string; label: string; value: number; note: string }[]
	ministries: FlowMinistry[]
	others: FlowMinistry & { count: number }
}

const SHOWN = 12

export function shortName(name: string) {
	return name.replace(/^(The )?(Federal )?Ministry of /, '').replace(/^Office of the /, '')
}

export function budgetFlow(graph: CompiledGraph): BudgetFlow {
	const bodies = Object.entries(MINISTRY_BUDGETS)
		.filter(([id]) => graph.nodes[id])
		.map(([id, b]) => {
			// One line in the Act prints a total ₦4 billion short of its own parts (Police Academy, Wudil). The
			// printed total is what the body gets, so its parts are scaled to it and the flow's bands meet.
			const parts = b.personnel + b.overhead + b.capital
			const scale = parts > 0 ? b.total / parts : 1
			return {
				id,
				label: id === 'ng-president' ? 'The Presidency' : id === 'ng-fct' ? 'FCT Administration' : shortName(graph.nodes[id].name),
				personnel: Math.round(b.personnel * scale),
				overhead: Math.round(b.overhead * scale),
				capital: b.total - Math.round(b.personnel * scale) - Math.round(b.overhead * scale),
				total: b.total,
			}
		})
		.sort((a, b) => b.total - a.total)
	const own = bodies.reduce((sum, b) => sum + b.total, 0)
	const passThrough = Object.values(MINISTRY_BUDGETS).flatMap((b) => b.passThrough ?? [])
	const debt = passThrough.find((p) => /debt/i.test(p.label))?.total ?? 0
	const serviceWide = passThrough.find((p) => /service-wide/i.test(p.label))?.total ?? 0
	const statutory = BUDGET_2026.parts.find((p) => /statutory/i.test(p.label))?.total ?? 0
	const rest = Math.max(0, BUDGET_2026.total - own - debt - serviceWide - statutory)
	const shown = bodies.slice(0, SHOWN)
	const tail = bodies.slice(SHOWN)
	const sum = (key: keyof Omit<FlowMinistry, 'id' | 'label'>) => tail.reduce((s, b) => s + b[key], 0)
	return {
		total: BUDGET_2026.total,
		parts: [
			{ id: 'ministries', label: 'Ministries and offices', value: own, note: 'What each ministry and office was given to spend' },
			{ id: 'debt', label: 'Debt service', value: debt, note: 'Interest and repayments, paid through the Debt Management Office' },
			{ id: 'service-wide', label: 'Service-Wide Vote', value: serviceWide, note: 'Held centrally and spent across all of government' },
			{ id: 'statutory', label: 'Statutory transfers', value: statutory, note: 'The National Assembly, the judiciary, INEC and other bodies funded first' },
			{ id: 'rest', label: 'Other, not tied to a ministry', value: rest, note: 'The rest of the ₦68.32 trillion, which the Act does not list under any ministry' },
		],
		ministries: shown,
		others: { id: 'others', label: `${tail.length} other bodies`, count: tail.length, personnel: sum('personnel'), overhead: sum('overhead'), capital: sum('capital'), total: sum('total') },
	}
}

/**
 * Each funded body's own 2026 total, by graph node, for places that only need the headline (search results).
 * Lines that are money routed through a body for all of government are left out: they are not its spending.
 */
export function budgetTotals(graph: CompiledGraph): Record<string, number> {
	const totals: Record<string, number> = {}
	for (const [id, agency] of Object.entries(AGENCY_BUDGETS)) if (graph.nodes[id] && !agency.passThrough) totals[id] = agency.total
	for (const [id, ministry] of Object.entries(MINISTRY_BUDGETS)) if (graph.nodes[id]) totals[id] = ministry.total
	return totals
}
