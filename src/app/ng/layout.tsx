import type { ReactNode } from 'react'
import { GovShell } from '@/components/gov-shell'
import { loadNigeriaGraph } from '@/lib/graph/nigeria'
import { budgetFlow, budgetTotals } from '@/lib/graph/budget-flow'
import { powerPeople } from '@/lib/graph/power'
import { LangProvider } from '@/components/lang'
import { QueryProvider } from '@/components/query'

// Pages are cached and rebuilt at most every six hours, and at once when the daily refresh revalidates the data.
export const revalidate = 21600

export default async function NigeriaLayout({ children }: { children: ReactNode }) {
	const data = await loadNigeriaGraph()
	const now = new Date()
	const power = powerPeople(data.graph, data.news, 90, now)
	return (
		<LangProvider>
			<QueryProvider>
				<GovShell gov={data.gov} graph={data.graph} power={power} budget={budgetFlow(data.graph)} budgets={budgetTotals(data.graph)} asOf={now.toISOString().slice(0, 10)}>
					{children}
				</GovShell>
			</QueryProvider>
		</LangProvider>
	)
}
