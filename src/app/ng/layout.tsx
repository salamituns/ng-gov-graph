import type { ReactNode } from 'react'
import { GovShell } from '@/components/gov-shell'
import { loadNigeriaGraph } from '@/lib/graph/nigeria'
import { budgetFlow } from '@/lib/graph/budget-flow'
import { powerPeople } from '@/lib/graph/power'
import { LangProvider } from '@/components/lang'
import { getLang } from '@/lib/i18n-server'

export const dynamic = 'force-dynamic'

export default async function NigeriaLayout({ children }: { children: ReactNode }) {
	const [data, lang] = await Promise.all([loadNigeriaGraph(), getLang()])
	const now = new Date()
	const power = powerPeople(data.graph, data.news, 90, now)
	return (
		<LangProvider lang={lang}>
			<GovShell gov={data.gov} graph={data.graph} power={power} budget={budgetFlow(data.graph)} asOf={now.toISOString().slice(0, 10)}>
				{children}
			</GovShell>
		</LangProvider>
	)
}
