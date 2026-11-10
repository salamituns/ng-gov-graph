'use client'

import type { ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { PanelSheet } from '@/components/panel-sheet'
import { useQuery } from '@/components/query'
import { useT } from '@/components/lang'

/** The server page supplies its own title, so even the cached, pre-hydration header is complete. */
export function PagePanel({ children, title, titleKey }: { children: ReactNode; title?: string; titleKey?: 'budgetTitle' | 'federalCharacter' }) {
	const router = useRouter()
	const pathname = usePathname()
	const asked = useQuery().get('view')
	const view = asked === 'newsmakers' || asked === 'power' ? 'power' : asked === 'budget' || (!asked && pathname === '/ng/budget') ? 'budget' : 'graph'
	const { t } = useT()
	return <PanelSheet title={titleKey ? t(titleKey) : title} onBack={() => router.back()} onClose={() => router.push(`/ng${view === 'power' ? '?view=newsmakers' : view === 'budget' ? '?view=budget' : ''}`, { scroll: false })}>
		{children}
	</PanelSheet>
}
