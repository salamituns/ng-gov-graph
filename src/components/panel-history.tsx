'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { useQuery } from '@/components/query'

const History = createContext(0)

/** Keep the header's navigation history across server page boundaries. */
export function PanelHistoryProvider({ children }: { children: ReactNode }) {
	const pathname = usePathname()
	const view = useQuery().get('view')
	const key = `${pathname}?${view ?? ''}`
	const [history, setHistory] = useState({ key, moves: 0 })
	if (history.key !== key) setHistory({ key, moves: history.moves + 1 })
	return <History.Provider value={history.moves}>{children}</History.Provider>
}

export function usePanelMoves() { return useContext(History) }
