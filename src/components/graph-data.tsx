'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { CompiledGraph } from '@/lib/graph/types'
import type { NewsItem } from '@/data/nigeria/news'
import type { BudgetFlow } from '@/lib/graph/budget-flow'

export interface GraphData {
	graph: CompiledGraph
	news: NewsItem[]
	budget: BudgetFlow
	budgets: Record<string, number>
}

const Context = createContext<{ data: GraphData | null; error: boolean; retry: () => void }>({ data: null, error: false, retry: () => {} })
let pending: Promise<GraphData> | null = null

function readGraph() {
	// Strict Mode and consumers share one request; the HTTP cache handles later visits.
	if (!pending) {
		pending = fetch('/api/graph').then(async (response) => {
			if (!response.ok) throw new Error('Graph unavailable')
			return response.json() as Promise<GraphData>
		}).finally(() => { pending = null })
	}
	return pending
}

/** Shared by the map, search and newsmakers. No graph is serialized into a page's HTML. */
export function GraphDataProvider({ children }: { children: ReactNode }) {
	const [data, setData] = useState<GraphData | null>(null)
	const [error, setError] = useState(false)
	const [attempt, setAttempt] = useState(0)
	const retry = useCallback(() => setAttempt((last) => last + 1), [])
	useEffect(() => {
		let active = true
		const load = () => {
			readGraph().then((value) => {
				if (active) { setData(value); setError(false) }
			}).catch(() => { if (active) setError(true) })
		}
		const resume = () => { if (document.visibilityState === 'visible') load() }
		load()
		document.addEventListener('visibilitychange', resume)
		return () => { active = false; document.removeEventListener('visibilitychange', resume) }
	}, [attempt])
	const value = useMemo(() => ({ data, error, retry }), [data, error, retry])
	return <Context.Provider value={value}>{children}</Context.Provider>
}

export function useGraphData() {
	return useContext(Context)
}
