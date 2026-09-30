import { Suspense, type ReactNode } from 'react'
import { GovShell } from '@/components/gov-shell'
import { loadNigeriaGraph } from '@/lib/graph/nigeria'
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
		<Suspense>
			<GovShell gov={data.gov} graph={data.graph} power={power} asOf={now.toISOString().slice(0, 10)}>
				{children}
			</GovShell>
		</Suspense>
		</LangProvider>
	)
}
