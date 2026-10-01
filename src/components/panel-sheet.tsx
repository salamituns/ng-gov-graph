'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * On portrait phones the panel is a bottom sheet, after Google Maps: the map is the page and the details
 * ride on top of it. The sheet snaps between a peek (the handle and the top of the first card) and open
 * (the brand bar, the map toolbar and a sliver of the graph stay reachable above it).
 *
 * The snap lives in the data-snap attribute, which globals.css turns into the sheet's height; the sheet is
 * anchored to the bottom, so it never extends past the viewport. Drags set the height inline and settle on
 * the nearest snap, with a flick beating distance. The height (not a transform) is animated on purpose: a
 * transformed sheet would become the containing block of the fixed brand bar inside it and drag the bar
 * along.
 */

/** These mirror --sheet-peek and --sheet-gap in globals.css (phone portrait). */
const PEEK = 128
const GAP = 112
/** Pointer travel before a touch on the peeking card becomes a drag, so taps still click through. */
const DRAG_START = 8
/** Vertical velocity (px/ms) that counts as a flick. */
const FLICK = 0.5
/** How far ahead (ms) a released sheet keeps drifting before its snap is chosen. */
const COAST = 120

export function PanelSheet({ children }: { children: ReactNode }) {
	const [snap, setSnap] = useState<'peek' | 'open'>('peek')
	const panel = useRef<HTMLElement>(null)
	// The handle always drags the sheet; the body drags it only while peeking (upward, to open it).
	// active marks a pressed pointer: without it, a hover crossing the handle would resume the last gesture.
	const handleDrag = useRef({ active: false, y: 0, height: 0, moved: false })
	const bodyDrag = useRef<{ y: number; started: boolean } | null>(null)
	const bodyMoved = useRef(false)
	const last = useRef({ y: 0, at: 0 })
	const velocity = useRef(0)

	const heights = useCallback(() => ({ peek: PEEK, open: Math.max(180, window.innerHeight - GAP) }), [])

	const clampHeight = useCallback(
		(height: number) => {
			const { peek, open } = heights()
			return Math.min(peek, Math.max(open, height))
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

	/** Let go: hand the sheet back to CSS at the snap it was heading for, and let the transition finish the move. */
	const settle = useCallback(() => {
		const el = panel.current
		if (!el) return
		delete el.dataset.dragging
		el.style.height = ''
		const { peek, open } = heights()
		const projected = el.getBoundingClientRect().height - velocity.current * COAST
		setSnap(
			velocity.current < -FLICK ? 'open' :
			velocity.current > FLICK ? 'peek' :
			Math.abs(projected - open) < Math.abs(projected - peek) ? 'open' : 'peek',
		)
	}, [heights])

	// ---- Handle: drag to move (both directions), tap to toggle. ----
	const onHandleDown = (event: React.PointerEvent) => {
		if (event.pointerType === 'mouse' && event.button !== 0) return
		const el = panel.current
		if (!el) return
		handleDrag.current = { active: true, y: event.clientY, height: el.getBoundingClientRect().height, moved: false }
		velocity.current = 0
		last.current = { y: event.clientY, at: event.timeStamp }
		capture(event)
	}
	const onHandleMove = (event: React.PointerEvent) => {
		const drag = handleDrag.current
		const el = panel.current
		if (!drag.active || !el) return
		if (!drag.moved && Math.abs(event.clientY - drag.y) < 3) return
		drag.moved = true
		el.dataset.dragging = ''
		track(event)
		el.style.height = `${clampHeight(drag.height - (event.clientY - drag.y))}px`
	}
	const onHandleUp = () => {
		if (handleDrag.current.moved) settle()
		handleDrag.current.active = false
	}
	const onHandleClick = () => {
		// A drag that just ended must not also toggle; the flag is reset by the next pointerdown.
		if (handleDrag.current.moved) return
		setSnap((current) => (current === 'open' ? 'peek' : 'open'))
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

	// The map's caption ("Details ↑") asks for the sheet; on desktop the same click scrolls the panel.
	useEffect(() => {
		const open = () => setSnap('open')
		window.addEventListener('govgraph:open-panel', open)
		return () => window.removeEventListener('govgraph:open-panel', open)
	}, [])

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
			<button
				type="button"
				className="sheet-handle"
				aria-expanded={snap === 'open'}
				aria-controls="gov-panel"
				aria-label={snap === 'open' ? 'Hide the details' : 'Show the details'}
				onClick={onHandleClick}
				onPointerDown={onHandleDown}
				onPointerMove={onHandleMove}
				onPointerUp={onHandleUp}
				onPointerCancel={onHandleUp}
			/>
			<div
				className="sheet-body"
				onPointerDown={onBodyDown}
				onPointerMove={onBodyMove}
				onPointerUp={onBodyUp}
				onPointerCancel={onBodyUp}
			>
				{children}
			</div>
		</aside>
	)
}
