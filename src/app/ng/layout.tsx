import type { ReactNode } from 'react'
import { GovShell } from '@/components/gov-shell'
import { GraphDataProvider } from '@/components/graph-data'
import { LangProvider } from '@/components/lang'
import { QueryProvider } from '@/components/query'
import { loadGraphResource } from '@/lib/graph/resource'
import { PanelHistoryProvider } from '@/components/panel-history'

// Refresh-tag invalidation, with a 24-hour recovery backstop.
export const revalidate = 86400

export default async function NigeriaLayout({ children }: { children: ReactNode }) {
	const { url } = await loadGraphResource()
	return (
		<LangProvider>
			<link rel="preload" as="fetch" crossOrigin="anonymous" href={url} />
			<QueryProvider>
				<PanelHistoryProvider>
					<GraphDataProvider url={url}>
						<GovShell gov="ng">
							{children}
						</GovShell>
					</GraphDataProvider>
				</PanelHistoryProvider>
			</QueryProvider>
		</LangProvider>
	)
}
