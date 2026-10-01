/**
 * A spotlight on the government map, sent from the panel: the federal character map picks a state (or
 * zone), and the big map lights up where that state's ministers sit and dims the rest. The two live in
 * different parts of the shell, so they talk through a window event, like govgraph:open-panel.
 */
export const SPOTLIGHT_EVENT = 'govgraph:spotlight'

export interface Spotlight {
	/** What the spotlight is on, for the map's caption, e.g. "Lagos State". */
	label: string
	/** Graph nodes to light: seats or the bodies they sit in (the map resolves a seat to its body). */
	nodeIds: string[]
	/** States to light on the Nigeria map at the core. */
	stateIds: string[]
	/** The map's caption, when a count of ministries is not the point, e.g. "Works · ₦3.59 trillion". */
	caption?: string
	/** What the lit ministries were given, for the budget flow's card, counting each ministry once. */
	amount?: number
}

// The last spotlight sent: a small external store, so a map that mounts after the panel (a direct load of
// ?state=lagos) still sees it. Read it with useSyncExternalStore(subscribeSpotlight, currentSpotlight, noSpotlight).
let current: Spotlight | null = null
export const currentSpotlight = () => current
export const noSpotlight = () => null
export function subscribeSpotlight(onChange: () => void) {
	window.addEventListener(SPOTLIGHT_EVENT, onChange)
	return () => window.removeEventListener(SPOTLIGHT_EVENT, onChange)
}

/** Send a spotlight, or null to clear it. */
export function spotlight(detail: Spotlight | null) {
	current = detail
	window.dispatchEvent(new CustomEvent<Spotlight | null>(SPOTLIGHT_EVENT, { detail }))
}
