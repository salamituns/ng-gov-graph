'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { SNAPS, snapFor, type Snap } from '@/lib/sheet'

/**
 * On portrait phones the panel is a bottom sheet, after Google Maps: the map is the page and the details
 * ride on top of it. The sheet has three heights — a peek (the handle and its header), half (the map stays
 * in view) and full (the brand bar and map toolbar stay reachable above it) — and it answers navigation:
 * wherever the reader goes, the sheet moves to show it (see snapFor), so nothing changes out of sight.
 *
 * The snap lives in the data-snap attribute, which globals.css turns into the sheet's height; the sheet is
 * anchored to the bottom, so it never extends past the viewport. Drags set the height inline and settle on
 * the nearest snap, with a flick moving one step. The height (not a transform) is animated on purpose: a
 * transformed sheet would become the containing block of anything fixed inside it.
 */

/** These mirror --sheet-peek, --sheet-half and --sheet-gap in globals.css (phone portrait). */
const PEEK = 128
const HALF = 0.52
const GAP = 112
/** Pointer travel before a touch on the peeking card becomes a drag, so taps still click through. */
const DRAG_START = 8
/** Vertical velocity (px/ms) that counts as a flick. */
const FLICK = 0.5
/** How far ahead (ms) a released sheet keeps drifting before its snap is chosen. */
const COAST = 120

export function PanelSheet({
	children,
	title,
	onBack,
	onClose,
}: {
	children: ReactNode
	/** The page in the sheet, named in its sticky header. Home has none. */
	title?: string
	onBack: () => void
	onClose: () => void
}) {
	const pathname = usePathname()
	const params = useSearchParams()
	const view = params.get('view')
	const routeKey = `${pathname}?${view ?? ''}`
	// The first render ignores the #hash: the server never sees it, and a snap that differs from the server's
	// would not be patched up on hydration. A jump to a section is raised by the scroll effect below.
	const [snap, setSnap] = useState<Snap>(() => snapFor(pathname, view))
	// The sheet answers navigation: each new place sets the sheet where that place reads best.
	const [lastRoute, setLastRoute] = useState(routeKey)
	const [moves, setMoves] = useState(0)
	if (lastRoute !== routeKey) {
		setLastRoute(routeKey)
		setMoves((n) => n + 1)
		setSnap(snapFor(pathname, view, typeof window === 'undefined' ? '' : window.location.hash))
	}

	const panel = useRef<HTMLElement>(null)
	const body = useRef<HTMLDivElement>(null)
	// The grip (handle and header) always drags the sheet; the body drags it only while peeking.
	// active marks a pressed pointer: without it, a hover crossing the grip would resume the last gesture.
	const gripDrag = useRef({ active: false, y: 0, height: 0, moved: false })
	const bodyDrag = useRef<{ y: number; started: boolean } | null>(null)
	const bodyMoved = useRef(false)
	const last = useRef({ y: 0, at: 0 })
	const velocity = useRef(0)

	const heights = useCallback((): Record<Snap, number> => {
		const full = Math.max(180, window.innerHeight - GAP)
		return { peek: PEEK, half: Math.min(full, Math.max(PEEK + 120, Math.round(window.innerHeight * HALF))), full }
	}, [])

	const clampHeight = useCallback(
		(height: number) => {
			const { peek, full } = heights()
			return Math.min(full, Math.max(peek, height))
		},
		[heights],
	)

	const track = useCallback((event: React.PointerEvent) => {
		if (event.timeStamp > last.current.at) {
			velocity.current = (event.clientY - last.current.y) / (event.timeStamp - last.current.at)
			last.current = { y: event.clientY, at: event.timeStamp }
		}
	}, [])

	/** Capture so a drag keeps its moves even once the pointer leaves the element; harmless if it is refused. */
	const capture = useCallback((event: React.PointerEvent) => {
		try {
			event.currentTarget.setPointerCapture(event.pointerId)
		} catch {}
	}, [])

	/** Let go: hand the sheet back to CSS at the snap it was heading for; a flick moves one step. */
	const settle = useCallback(() => {
		const el = panel.current
		if (!el) return
		delete el.dataset.dragging
		const now = el.getBoundingClientRect().height
		el.style.height = ''
		const h = heights()
		// The snap the sheet was at (or passing) when let go.
		const nearest = (height: number) => SNAPS.reduce((best, s) => (Math.abs(h[s] - height) < Math.abs(h[best] - height) ? s : best), SNAPS[0])
		const from = nearest(now)
		const index = SNAPS.indexOf(from)
		if (velocity.current < -FLICK) {
			// Flick up: the next snap above the sheet's height.
			setSnap(SNAPS.find((s) => h[s] > now + 1) ?? 'full')
		} else if (velocity.current > FLICK) {
			setSnap([...SNAPS].reverse().find((s) => h[s] < now - 1) ?? 'peek')
		} else {
			setSnap(nearest(now - velocity.current * COAST) ?? SNAPS[index])
		}
	}, [heights])

	// ---- Grip: drag to move (both directions), tap the handle to step up, or from full back to peek. ----
	const onGripDown = (event: React.PointerEvent) => {
		if (event.pointerType === 'mouse' && event.button !== 0) return
		const el = panel.current
		if (!el) return
		gripDrag.current = { active: true, y: event.clientY, height: el.getBoundingClientRect().height, moved: false }
		velocity.current = 0
		last.current = { y: event.clientY, at: event.timeStamp }
	}
	const onGripMove = (event: React.PointerEvent) => {
		const drag = gripDrag.current
		const el = panel.current
		if (!drag.active || !el) return
		if (!drag.moved && Math.abs(event.clientY - drag.y) < 4) return
		if (!drag.moved) capture(event)
		drag.moved = true
		el.dataset.dragging = ''
		track(event)
		el.style.height = `${clampHeight(drag.height - (event.clientY - drag.y))}px`
	}
	const onGripUp = () => {
		if (gripDrag.current.moved) settle()
		gripDrag.current.active = false
	}
	const onGripClickCapture = (event: React.MouseEvent) => {
		// A drag that just ended must not also press the header's buttons.
		if (!gripDrag.current.moved) return
		event.preventDefault()
		event.stopPropagation()
		gripDrag.current.moved = false
	}
	const onHandleClick = () => {
		if (gripDrag.current.moved) return
		setSnap((current) => (current === 'peek' ? 'half' : current === 'half' ? 'full' : 'peek'))
	}

	// ---- Body: while peeking, an upward drag opens the sheet; taps fall through to their links. ----
	const onBodyDown = (event: React.PointerEvent) => {
		if (snap !== 'peek') return
		bodyDrag.current = { y: event.clientY, started: false }
		bodyMoved.current = false
		velocity.current = 0
		last.current = { y: event.clientY, at: event.timeStamp }
	}
	const onBodyMove = (event: React.PointerEvent) => {
		const drag = bodyDrag.current
		const el = panel.current
		if (!drag || snap !== 'peek' || !el) return
		if (!drag.started) {
			if (event.clientY - drag.y > -DRAG_START) return
			drag.started = true
			bodyMoved.current = true
			el.dataset.dragging = ''
			capture(event)
			velocity.current = 0
			last.current = { y: event.clientY, at: event.timeStamp }
			return
		}
		track(event)
		el.style.height = `${clampHeight(PEEK - (event.clientY - drag.y))}px`
	}
	const onBodyUp = () => {
		const drag = bodyDrag.current
		bodyDrag.current = null
		if (drag?.started) settle()
	}
	const onPanelClickCapture = (event: React.MouseEvent) => {
		// The drag that just ended must not also click whatever it started on.
		if (!bodyMoved.current) return
		event.preventDefault()
		event.stopPropagation()
		bodyMoved.current = false
	}

	// "Details ↑" on the map or the budget flow asks for the whole page; a link to a home section (which
	// changes only the URL's #hash, so the route does not change) asks for half.
	useEffect(() => {
		const open = (event: Event) => setSnap((event as CustomEvent<Snap | undefined>).detail ?? 'full')
		window.addEventListener('govgraph:open-panel', open)
		return () => window.removeEventListener('govgraph:open-panel', open)
	}, [])

	// A new page starts at its top (or at the section it was linked to), not where the last one was left.
	useEffect(() => {
		const el = body.current
		if (!el) return
		const hash = window.location.hash.slice(1)
		const target = hash ? document.getElementById(hash) : null
		if (target && el.contains(target)) {
			target.scrollIntoView({ block: 'start' })
			// The URL's #section can land after the render that chose the snap, so a jump to a section
			// is raised here too: the section must be in view, not scrolled to inside a lowered sheet.
			requestAnimationFrame(() => setSnap((current) => (current === 'peek' ? 'half' : current)))
		} else el.scrollTop = 0
	}, [routeKey])

	// The map re-centres in the space the sheet leaves above it (globals.css reads this attribute), so a
	// selection the map turns to the bottom of its circle is not hidden behind a half-open sheet.
	useEffect(() => {
		document.documentElement.dataset.sheet = snap
		return () => {
			delete document.documentElement.dataset.sheet
		}
	}, [snap])

	// Only portrait phones do the sheeting; leaving portrait must clear whatever a drag left inline.
	useEffect(() => {
		const mq = window.matchMedia('(max-width: 820px) and (orientation: portrait)')
		const clear = () => {
			const el = panel.current
			if (!el) return
			delete el.dataset.dragging
			el.style.height = ''
		}
		mq.addEventListener('change', clear)
		return () => mq.removeEventListener('change', clear)
	}, [])

	return (
		<aside ref={panel} id="gov-panel" className="shell-panel" data-snap={snap} onClickCapture={onPanelClickCapture}>
			<div
				className="sheet-grip"
				onPointerDown={onGripDown}
				onPointerMove={onGripMove}
				onPointerUp={onGripUp}
				onPointerCancel={onGripUp}
				onClickCapture={onGripClickCapture}
			>
				<button
					type="button"
					className="sheet-handle"
					aria-expanded={snap !== 'peek'}
					aria-controls="gov-panel"
					aria-label={snap === 'full' ? 'Lower the details' : 'Raise the details'}
					onClick={onHandleClick}
				/>
				{title ? (
					<div className="sheet-header">
						{moves > 0 ? (
							<button type="button" className="sheet-header-button" aria-label="Back" onClick={onBack}>
								<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
							</button>
						) : null}
						<p className="sheet-title">{title}</p>
						<button type="button" className="sheet-header-button" aria-label="Close" onClick={onClose}>
							<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
						</button>
					</div>
				) : null}
			</div>
			<div
				ref={body}
				className="sheet-body"
				onPointerDown={onBodyDown}
				onPointerMove={onBodyMove}
				onPointerUp={onBodyUp}
				onPointerCancel={onBodyUp}
			>
				{/* Keyed to the page: each new page plays a short entrance, so the change registers. */}
				<div key={pathname} className="sheet-page">
					{children}
				</div>
			</div>
		</aside>
	)
}
