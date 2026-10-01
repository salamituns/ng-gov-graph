'use client'

import { useSyncExternalStore, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/** Matches the bottom-sheet layout in globals.css and panel-sheet.tsx. */
const SHEET_LAYOUT = '(max-width: 820px) and (orientation: portrait)'

function subscribe(onChange: () => void) {
	const query = window.matchMedia(SHEET_LAYOUT)
	query.addEventListener('change', onChange)
	return () => query.removeEventListener('change', onChange)
}

/**
 * On portrait phones the panel is a bottom sheet that clips and scrolls its content. iOS Safari clips a
 * position:fixed child of such a sheet to the sheet itself, so a brand bar pinned to the top of the screen
 * from inside it disappears. Rendering it into <body> instead puts nothing between it and the viewport.
 * Elsewhere it stays in place, at the top of the panel.
 */
export function PhoneFloat({ children }: { children: ReactNode }) {
	const floating = useSyncExternalStore(subscribe, () => window.matchMedia(SHEET_LAYOUT).matches, () => false)
	return floating ? createPortal(<div className="phone-float">{children}</div>, document.body) : children
}
