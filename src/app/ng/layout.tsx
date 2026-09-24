import { Suspense, type ReactNode } from 'react'
import { GovShell } from '@/components/gov-shell'
import { loadNigeriaGraph } from '@/lib/graph/nigeria'
import { powerPeople } from '@/lib/graph/power'

export const dynamic = 'force-dynamic'

export default async function NigeriaLayout({ children }: { children: ReactNode }) {
	const data = await loadNigeriaGraph()
	const now = new Date()
	const power = powerPeople(data.graph, data.news, 90, now)
	return (
		<Suspense>
			<GovShell gov={data.gov} graph={data.graph} power={power} asOf={now.toISOString().slice(0, 10)}>
				{children}
			</GovShell>
		</Suspense>
	)
}
