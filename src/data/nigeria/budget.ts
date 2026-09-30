/**
 * The 2026 federal budget, as appropriated by the National Assembly and signed on 17 April 2026.
 * Ministry and agency figures are generated from the Act into budget-2026.ts.
 */
export interface BudgetLine {
	name: string
	code: string
	total: number
	/** The graph node this line funds, when it has one. */
	nodeId?: string
	/** Page of the published Act where the line appears. */
	page: number
}

export interface MinistryBudget {
	personnel: number
	overhead: number
	capital: number
	total: number
	/** Lines (agencies and offices) the Act lists under it. */
	lines: number
	/** First page of its summary in the published Act. */
	page: number
	/** "summary": the Act's own total for the ministry; "lines": the sum of its lines, where the Act prints none. */
	basis: 'summary' | 'lines'
	largest: BudgetLine[]
	/** Money routed through the ministry for all of government, shown apart from its own spending. */
	passThrough?: { label: string; total: number }[]
}

export interface AgencyBudget {
	name: string
	code: string
	personnel: number
	overhead: number
	capital: number
	total: number
	page: number
	/** Set when the line is money routed through the body for all of government. */
	passThrough?: string
}

/** The Act's headline figures, from the President's assent. */
export const BUDGET_2026 = {
	title: '2026 Appropriation Act',
	signed: '2026-04-17',
	total: 68_320_000_000_000,
	parts: [
		{ label: 'Capital (Development Fund)', total: 32_200_000_000_000 },
		{ label: 'Debt service', total: 15_800_000_000_000 },
		{ label: 'Recurrent, non-debt', total: 15_400_000_000_000 },
		{ label: 'Statutory transfers', total: 4_799_000_000_000 },
	],
	sourceUrl: 'https://gazettengr.com/president-tinubu-signs-n68-32-trillion-2026-appropriation-bill-extends-2025-budget-implementation/',
}

/** "₦3.16 trillion", "₦88.6 billion", "₦950 million". */
export function naira(amount: number) {
	const units: [number, string][] = [[1e12, 'trillion'], [1e9, 'billion'], [1e6, 'million']]
	for (const [size, word] of units) {
		if (Math.abs(amount) >= size) {
			const value = amount / size
			// Trillions keep two decimals, as the budget is reported (₦68.32 trillion); smaller units three figures.
			const digits = word === 'trillion' ? 2 : value >= 100 ? 0 : value >= 10 ? 1 : 2
			return `₦${value.toFixed(digits)} ${word}`
		}
	}
	return `₦${Math.round(amount).toLocaleString('en-NG')}`
}
