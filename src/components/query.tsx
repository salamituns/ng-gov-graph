'use client'

import { useSearchParams } from 'next/navigation'
import { createContext, Suspense, useContext, useLayoutEffect, useState, type ReactNode } from 'react'

const QueryContext = createContext<URLSearchParams>(new URLSearchParams())

/**
 * The URL's query string, for components that must not hold up the page's HTML.
 * Pages are cached and served to everyone, so the server renders them without a query. useSearchParams
 * in a cached page client-renders everything up to the nearest Suspense boundary, which here was the whole
 * map and panel. So only the empty QuerySync below reads it, inside its own boundary, and hands the value
 * to the rest before the browser paints.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
	const [query, setQuery] = useState(() => new URLSearchParams())
	return (
		<QueryContext.Provider value={query}>
			<Suspense fallback={null}>
				<QuerySync onChange={setQuery} />
			</Suspense>
			{children}
		</QueryContext.Provider>
	)
}

function QuerySync({ onChange }: { onChange: (update: (last: URLSearchParams) => URLSearchParams) => void }) {
	const key = useSearchParams().toString()
	// A layout effect, so a navigation's new query lands before the frame that shows the new page.
	useLayoutEffect(() => {
		onChange((last) => (last.toString() === key ? last : new URLSearchParams(key)))
	}, [key, onChange])
	return null
}

/** The current query string: empty on the server and during hydration, the URL's from then on. */
export function useQuery() {
	return useContext(QueryContext)
}
