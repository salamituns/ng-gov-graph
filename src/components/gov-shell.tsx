'use client'

import { ChevronLeft, ChevronRight, Moon, Sun } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useMemo, useSyncExternalStore, type ReactNode } from 'react'
import { GraphMap } from '@/components/graph-map'
import { GraphSearch } from '@/components/graph-search'
import { PowerMap } from '@/components/power-map'
import { filterGraph } from '@/lib/graph/filter'
import { nodePath, stateIdFromSlug } from '@/lib/graph/paths'
import type { PowerLink, PowerPerson } from '@/lib/graph/power'
import type { CompiledGraph } from '@/lib/graph/types'
import { DraftNotice, LangSelect, useT } from '@/components/lang'

interface GovShellProps {
	gov: string
	graph: CompiledGraph
	power: { people: PowerPerson[]; links: PowerLink[]; articles: number; sources: string[]; days: number }
	asOf: string
	children: ReactNode
}

/**
 * The map lives in the /ng layout, so it stays mounted while the left panel changes.
 * The URL is the only selection state: /ng/<collection>/<id> selects, ?view=newsmakers swaps the map.
 */
export function GovShell({ gov, graph, power, asOf, children }: GovShellProps) {
	const { t } = useT()
	const router = useRouter()
	const pathname = usePathname()
	const params = useSearchParams()
	const [, section, slug] = pathname.split('/').filter(Boolean)
	// /ng/represent/lagos selects Lagos State; every other section's third segment is a node id.
	const selectedId = section === 'represent' && slug ? stateIdFromSlug(slug) : slug
	const selected = selectedId ? graph.nodes[selectedId] : undefined
	const selectedLayer = selected?.layer ?? (selected?.parentId ? graph.nodes[selected.parentId]?.layer : undefined)
	const layer = params.get('layer') === 'states' || params.get('layer') === 'state' || selectedLayer === 'state' ? 'state' : 'federal'
	// ?view=newsmakers; the older ?view=power links still open the same view.
	const view = params.get('view') === 'newsmakers' || params.get('view') === 'power' ? 'power' : 'graph'
	const visible = useMemo(() => filterGraph(graph, layer), [graph, layer])
	const stateNames = useMemo(
		() => Object.fromEntries(Object.values(graph.nodes).filter((node) => node.type === 'state').map((node) => [node.id, node.name])),
		[graph],
	)

	const href = (next: { id?: string; view?: 'graph' | 'power' }) => {
		const query = new URLSearchParams(params.toString())
		query.delete('view')
		if ((next.view ?? view) === 'power') query.set('view', 'newsmakers')
		const node = next.id ? graph.nodes[next.id] : selected
		const base = node ? nodePath(gov, node) : pathname
		return `${base}${query.size ? `?${query}` : ''}`
	}
	const select = (id: string) => {
		const node = graph.nodes[id]
		if (!node) return
		router.push(href({ id }), { scroll: false })
	}

	return (
		<main className="shell">
			<aside className="shell-panel">
				<DraftNotice />
				{children}
			</aside>
			<section className="shell-map" aria-label="Government map">
				<div className="map-toolbar">
					<GraphSearch gov={gov} graph={graph} />
					<div className="map-toolbar-right">
						<LangSelect />
						<ThemeToggle />
						<div className="history-buttons">
							<button type="button" aria-label="Back" onClick={() => router.back()}><ChevronLeft size={17} /></button>
							<button type="button" aria-label="Forward" onClick={() => router.forward()}><ChevronRight size={17} /></button>
						</div>
					</div>
				</div>
				<div className="map-canvas">
					{view === 'power' ? (
						<PowerMap
							{...power}
							asOf={asOf}
							selectedId={selectedId}
							onSelect={(person) => router.push(href({ id: person.seatId ?? person.nodeId, view: 'power' }), { scroll: false })}
							onSeeOnGraph={(person) => router.push(href({ id: person.seatId ?? person.nodeId, view: 'graph' }), { scroll: false })}
							onClear={() => router.push(`/${gov}?view=newsmakers`, { scroll: false })}
						/>
					) : (
						<GraphMap graph={visible} layer={layer} selectedId={selectedId} onSelect={select} stateNames={stateNames} />
					)}
				</div>
				<nav className="map-views" aria-label="Map view">
					<button type="button" aria-pressed={view === 'graph'} onClick={() => router.push(href({ view: 'graph' }), { scroll: false })}>{t('viewGovernment')}</button>
					<button type="button" aria-pressed={view === 'power'} onClick={() => router.push(href({ view: 'power' }), { scroll: false })}>{t('viewNewsmakers')}</button>
				</nav>
			</section>
		</main>
	)
}

const THEME_EVENT = 'govgraph-theme'

function subscribeTheme(callback: () => void) {
	window.addEventListener(THEME_EVENT, callback)
	return () => window.removeEventListener(THEME_EVENT, callback)
}

function ThemeToggle() {
	const dark = useSyncExternalStore(
		subscribeTheme,
		() => document.documentElement.classList.contains('dark'),
		() => false,
	)
	const flip = () => {
		const next = !dark
		document.documentElement.classList.toggle('dark', next)
		try {
			localStorage.setItem('theme', next ? 'dark' : 'light')
		} catch {}
		window.dispatchEvent(new Event(THEME_EVENT))
	}
	return (
		<button type="button" className="icon-button" aria-label={dark ? 'Use light theme' : 'Use dark theme'} onClick={flip}>
			{dark ? <Sun size={17} /> : <Moon size={17} />}
		</button>
	)
}
