'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { CompiledGraph } from '@/lib/graph/types'
import type { NewsItem } from '@/data/nigeria/news'
import type { BudgetFlow } from '@/lib/graph/budget-flow'
import { powerPeople } from '@/lib/graph/power'
import { useLagosDay } from '@/components/clock'
import { useQuery } from '@/components/query'

export interface GraphData {
	graph: CompiledGraph
	news: NewsItem[]
	budget: BudgetFlow
	budgets: Record<string, number>
}

const Context = createContext<{ data: GraphData | null; error: boolean; retry: () => void; power: ReturnType<typeof powerPeople> | null; asOf: string }>({ data: null, error: false, retry: () => {}, power: null, asOf: '' })
const pending = new Map<string, Promise<GraphData>>()

function readGraph(url: string) {
	// Strict Mode and consumers share one request; the HTTP cache handles later visits.
	let request = pending.get(url)
	if (!request) {
		request = fetch(url).then(async (response) => {
			if (!response.ok) throw new Error('Graph unavailable')
			return response.json() as Promise<GraphData>
		}).finally(() => { pending.delete(url) })
		pending.set(url, request)
	}
	return request
}

/** Shared by the map, search and newsmakers. No graph is serialized into a page's HTML. */
export function GraphDataProvider({ url, children }: { url: string; children: ReactNode }) {
	const [data, setData] = useState<GraphData | null>(null)
	const [error, setError] = useState(false)
	const [attempt, setAttempt] = useState(0)
	const retry = useCallback(() => setAttempt((last) => last + 1), [])
	const day = useLagosDay()
	const view = useQuery().get('view')
	const powerForDay = useMemo(() => {
		let result: ReturnType<typeof powerPeople> | null = null
		return () => {
			if (!data || !day) return null
			return result ??= powerPeople(data.graph, data.news, 90, new Date(`${day}T23:59:59+01:00`))
		}
	}, [data, day])
	// Lazy once per data/day, shared by consumers and retained across view toggles.
	const power = view === 'newsmakers' || view === 'power' ? powerForDay() : null
	useEffect(() => {
		let active = true
		readGraph(url).then((value) => {
			if (active) { setData(value); setError(false) }
		}).catch(() => { if (active) setError(true) })
		return () => { active = false }
	}, [url, attempt])
	const value = useMemo(() => ({ data, error, retry, power, asOf: day ?? '' }), [data, error, retry, power, day])
	return <Context.Provider value={value}>{children}</Context.Provider>
}

export function useGraphData() {
	return useContext(Context)
}
