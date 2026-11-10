import type { ReactNode } from 'react'
import { GovShell } from '@/components/gov-shell'
import { GraphDataProvider } from '@/components/graph-data'
import { LangProvider } from '@/components/lang'
import { QueryProvider } from '@/components/query'
import { loadGraphResource } from '@/lib/graph/resource'

// No clock-driven regeneration. Pages reading stored data follow its refresh tag.
export const revalidate = false

export default async function NigeriaLayout({ children }: { children: ReactNode }) {
	const { url } = await loadGraphResource()
	return (
		<LangProvider>
			<QueryProvider>
				<GraphDataProvider url={url}>
					<GovShell gov="ng">
						{children}
					</GovShell>
				</GraphDataProvider>
			</QueryProvider>
		</LangProvider>
	)
}
