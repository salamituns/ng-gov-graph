import type { ReactNode } from 'react'
import { GovShell } from '@/components/gov-shell'
import { loadNigeriaGraph } from '@/lib/graph/nigeria'
import { powerPeople } from '@/lib/graph/power'
import { LangProvider } from '@/components/lang'
import { getLang } from '@/lib/i18n-server'
import { MINISTRY_BUDGETS } from '@/data/nigeria/budget-2026'

export const dynamic = 'force-dynamic'

/** Each ministry's and office's own 2026 allocation, for the map's Budget view. Only totals reach the browser. */
const BUDGET_TOTALS = Object.fromEntries(Object.entries(MINISTRY_BUDGETS).map(([id, budget]) => [id, budget.total]))

export default async function NigeriaLayout({ children }: { children: ReactNode }) {
	const [data, lang] = await Promise.all([loadNigeriaGraph(), getLang()])
	const now = new Date()
	const power = powerPeople(data.graph, data.news, 90, now)
	return (
		<LangProvider lang={lang}>
			<GovShell gov={data.gov} graph={data.graph} power={power} budgets={BUDGET_TOTALS} asOf={now.toISOString().slice(0, 10)}>
				{children}
			</GovShell>
		</LangProvider>
	)
}
