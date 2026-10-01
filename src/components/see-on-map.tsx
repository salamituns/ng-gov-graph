'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'

type MapView = 'graph' | 'budget'

const PHONE = '(max-width: 820px) and (orientation: portrait)'
const lowerSheet = () => window.dispatchEvent(new CustomEvent('govgraph:open-panel', { detail: 'peek' }))

/**
 * Which view the map area shows, and a way to switch it from the panel. A page's pick (a state, a ministry)
 * is lit in either view (lib/spotlight); on phones the sheet covers the map, so a switch also lowers it.
 * The sheet re-snaps on every route change, so the lowering waits until the new view has rendered.
 */
export function useMapView() {
	const router = useRouter()
	const params = useSearchParams()
	const section = usePathname().split('/').filter(Boolean)[1]
	const asked = params.get('view')
	// The same rule as GovShell: the budget page shows the flow unless asked for the map.
	const view: MapView | 'other' = asked === 'budget' || (!asked && section === 'budget') ? 'budget' : !asked || asked === 'government' ? 'graph' : 'other'
	// The view a switch is waiting for. Next keeps a page's tree alive for Back and re-runs its effects when
	// it returns, so the lowering is tied to its target: arriving anywhere else (Back) drops it.
	const pending = useRef<MapView | null>(null)
	useEffect(() => {
		const target = pending.current
		pending.current = null
		if (target === view) requestAnimationFrame(lowerSheet)
	}, [view])

	const show = (target: MapView) => {
		const phone = window.matchMedia(PHONE).matches
		if (view === target) {
			if (phone) lowerSheet()
			return
		}
		// From the live URL: a pick written with history.replaceState (?state=, ?ministry=) must survive.
		const url = new URL(window.location.href)
		url.searchParams.delete('view')
		if (target === 'budget') {
			url.searchParams.set('view', 'budget')
			url.searchParams.delete('layer')
		} else if (section === 'budget') url.searchParams.set('view', 'government')
		pending.current = phone ? target : null
		router.push(`${url.pathname}${url.search}`, { scroll: false })
	}
	return { view, show }
}

const LABEL: Record<MapView, string> = { graph: 'Government map', budget: 'Budget flow' }

/** "See it on: Government map | Budget flow", the first option being where the page's question is answered. */
export function SeeOn({ first = 'graph' }: { first?: MapView }) {
	const { view, show } = useMapView()
	const order: MapView[] = first === 'graph' ? ['graph', 'budget'] : ['budget', 'graph']
	return (
		<div className="see-on" role="group" aria-label="See it on">
			<span>See it on</span>
			{order.map((target) => (
				<button key={target} type="button" aria-pressed={view === target} onClick={() => show(target)}>
					{LABEL[target]}
				</button>
			))}
		</div>
	)
}
