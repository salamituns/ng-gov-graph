'use client'

/**
 * Phones only (see .see-on-map in globals.css): a reading page opens the sheet fully, which covers the
 * government map, so this lowers the sheet to show what the page has lit on it.
 */
export function SeeOnMap() {
	return (
		<button type="button" className="see-on-map" onClick={() => window.dispatchEvent(new CustomEvent('govgraph:open-panel', { detail: 'peek' }))}>
			See on the government map ↓
		</button>
	)
}
