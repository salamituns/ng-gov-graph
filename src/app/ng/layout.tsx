import type { ReactNode } from 'react'
import { GovShell } from '@/components/gov-shell'
import { GraphDataProvider } from '@/components/graph-data'
import { LangProvider } from '@/components/lang'
import { QueryProvider } from '@/components/query'

// No clock-driven regeneration. Pages reading stored data follow its refresh tag.
export const revalidate = false

export default function NigeriaLayout({ children }: { children: ReactNode }) {
	return (
		<LangProvider>
			<QueryProvider>
				<GraphDataProvider>
					<GovShell gov="ng">
						{children}
					</GovShell>
				</GraphDataProvider>
			</QueryProvider>
		</LangProvider>
	)
}
