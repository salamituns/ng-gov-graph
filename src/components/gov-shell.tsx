'use client'

import { ChevronLeft, ChevronRight, Moon, Sun } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react'
import { GraphMap } from '@/components/graph-map'
import { GraphSearch } from '@/components/graph-search'
import { PowerMap } from '@/components/power-map'
import { filterGraph } from '@/lib/graph/filter'
import { nodePath, stateIdFromSlug } from '@/lib/graph/paths'
import type { PowerLink, PowerPerson } from '@/lib/graph/power'
import { seatTitle } from '@/lib/graph/seat-title'
import type { CompiledGraph } from '@/lib/graph/types'
import { LangSelect, useT } from '@/components/lang'
import { PanelSheet } from '@/components/panel-sheet'
import { BudgetFlow } from '@/components/budget-flow'
import type { BudgetFlow as BudgetFlowData } from '@/lib/graph/budget-flow'

interface GovShellProps {
	gov: string
	graph: CompiledGraph
	power: { people: PowerPerson[]; links: PowerLink[]; articles: number; sources: string[]; days: number }
	/** The 2026 budget as a flow, for the Budget view. */
	budget: BudgetFlowData
	/** Each funded body's 2026 total, for search results. */
	budgets: Record<string, number>
	asOf: string
	children: ReactNode
}

/**
 * The map lives in the /ng layout, so it stays mounted while the left panel changes.
 * The URL is the only selection state: /ng/<collection>/<id> selects, ?view=newsmakers swaps the map.
 */
export function GovShell({ gov, graph, power, budget, budgets, asOf, children }: GovShellProps) {
	const { t } = useT()
	const router = useRouter()
	const pathname = usePathname()
	const params = useSearchParams()
	const [, section, slug] = pathname.split('/').filter(Boolean)
	// /ng/represent/lagos selects Lagos State; every other section's third segment is a node id.
	const selectedId = section === 'represent' && slug ? stateIdFromSlug(slug) : slug
	const selected = selectedId ? graph.nodes[selectedId] : undefined
	const selectedLayer = selected?.layer ?? (selected?.parentId ? graph.nodes[selected.parentId]?.layer : undefined)
	const layer = (params.get('layer') === 'states' || params.get('layer') === 'state' || selectedLayer === 'state') && params.get('view') !== 'budget' ? 'state' : 'federal'
	// ?view=newsmakers (the older ?view=power still works) or ?view=budget.
	// The budget page reads best beside the budget flow, so there the flow is the default (?view=government
	// asks for the map).
	const asked = params.get('view')
	const view = asked === 'newsmakers' || asked === 'power' ? 'power' : asked === 'budget' || (!asked && section === 'budget') ? 'budget' : 'graph'
	const visible = useMemo(() => filterGraph(graph, layer), [graph, layer])
	const stateNames = useMemo(
		() => Object.fromEntries(Object.values(graph.nodes).filter((node) => node.type === 'state').map((node) => [node.id, node.name])),
		[graph],
	)

	const href = (next: { id?: string; view?: 'graph' | 'power' | 'budget' }) => {
		const query = new URLSearchParams(params.toString())
		query.delete('view')
		const target = next.view ?? view
		if (target === 'power') query.set('view', 'newsmakers')
		if (target === 'graph' && section === 'budget' && !next.id) query.set('view', 'government')
		// The budget is federal: the Budget view always shows the federal map.
		if (target === 'budget') {
			query.set('view', 'budget')
			query.delete('layer')
		}
		const node = next.id ? graph.nodes[next.id] : selected
		const base = node ? nodePath(gov, node) : pathname
		return `${base}${query.size ? `?${query}` : ''}`
	}
	// The phone sheet's header names the page it holds; home has no header.
	const sheetTitle =
		section === 'represent' ? (selected ? `Who represents ${selected.name}` : t('whoRepresents'))
		: section === 'elections' ? 'Nigeria Decides 2027'
		: section === 'budget' ? t('budgetTitle')
		: section === 'federal-character' ? t('federalCharacter')
		: section ? (selected ? seatTitle(graph, selected) : 'Not found')
		: undefined
	const select = (id: string) => {
		const node = graph.nodes[id]
		if (!node) return
		router.push(href({ id }), { scroll: false })
	}

	return (
		<main className="shell">
			<PanelSheet
				title={sheetTitle}
				onBack={() => router.back()}
				onClose={() => router.push(`/${gov}${view === 'power' ? '?view=newsmakers' : view === 'budget' ? '?view=budget' : ''}`, { scroll: false })}
			>
				{children}
			</PanelSheet>
			<section className="shell-map" aria-label="Government map">
				<div className="map-toolbar">
					<GraphSearch gov={gov} graph={graph} budgets={budgets} />
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
					{view === 'budget' ? (
						<BudgetFlow flow={budget} selectedId={selectedId} onSelect={(id) => router.push(href({ id, view: 'budget' }), { scroll: false })} />
					) : view === 'power' ? (
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
					<button type="button" aria-pressed={view === 'budget'} onClick={() => router.push(href({ view: 'budget' }), { scroll: false })}>{t('viewBudget')}</button>
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

/**
 * The inline script in the root layout sets the theme before first paint. When React renders <html> on
 * the client instead of hydrating it (a 404 does), that class is lost, so the shell puts it back.
 */
function useThemeRestore() {
	useEffect(() => {
		let dark = matchMedia('(prefers-color-scheme: dark)').matches
		try {
			const saved = localStorage.getItem('theme')
			if (saved) dark = saved === 'dark'
		} catch {}
		if (document.documentElement.classList.contains('dark') !== dark) {
			document.documentElement.classList.toggle('dark', dark)
			window.dispatchEvent(new Event(THEME_EVENT))
		}
	}, [])
}

function ThemeToggle() {
	useThemeRestore()
	const dark = useSyncExternalStore(
		subscribeTheme,
		() => document.documentElement.classList.contains('dark'),
		() => false,
	)
	// The theme-color meta tags ship with the system scheme; follow the reader's in-app choice too.
	useEffect(() => {
		document
			.querySelectorAll('meta[name="theme-color"]')
			.forEach((meta) => meta.setAttribute('content', dark ? '#151916' : '#e9ebe6'))
	}, [dark])
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
