'use client'

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

type Box = [number, number, number, number]

const MAX_ZOOM = 5
const DRAG_THRESHOLD = 6

function parseBox(viewBox: string): Box {
	const [x, y, w, h] = viewBox.split(/\s+/).map(Number)
	return [x, y, w, h]
}

/**
 * Pinch, drag, wheel and double-tap zoom for an SVG, done by moving its viewBox so text and strokes stay
 * sharp. Until the map is zoomed, one finger scrolls the page as usual; once zoomed, one finger pans.
 */
export function useZoom(svgRef: RefObject<SVGSVGElement | null>, viewBox: string, resetKey = '') {
	const base = parseBox(viewBox)
	// The zoom belongs to one layout and selection; when either changes, the whole map shows again.
	const key = `${viewBox}|${resetKey}`
	const [state, setState] = useState<{ key: string; box: Box }>({ key, box: base })
	const view = state.key === key ? state.box : base
	const viewRef = useRef(view)
	useEffect(() => {
		viewRef.current = view
	})
	const setView = useCallback(
		(next: Box | ((box: Box) => Box)) =>
			setState((current) => {
				const from = current.key === key ? current.box : parseBox(viewBox)
				return { key, box: typeof next === 'function' ? next(from) : next }
			}),
		[key, viewBox],
	)
	const pointers = useRef(new Map<number, { x: number; y: number }>())
	const gesture = useRef<{ view: Box; x: number; y: number; distance?: number; mid?: { x: number; y: number } } | null>(null)
	const dragged = useRef(false)
	const baseKey = viewBox

	const clamp = useCallback(
		(box: Box): Box => {
			const [bx, by, bw, bh] = parseBox(baseKey)
			const w = Math.min(bw, Math.max(bw / MAX_ZOOM, box[2]))
			const h = (w * bh) / bw
			const x = Math.min(bx + bw - w, Math.max(bx, box[0]))
			const y = Math.min(by + bh - h, Math.max(by, box[1]))
			return [x, y, w, h]
		},
		[baseKey],
	)

	/** Client pixels to SVG units for a given viewBox, honouring preserveAspectRatio="xMidYMid meet". */
	const toSvg = useCallback(
		(clientX: number, clientY: number, box: Box) => {
			const rect = svgRef.current?.getBoundingClientRect()
			if (!rect) return { x: box[0], y: box[1], scale: 1 }
			const scale = Math.min(rect.width / box[2], rect.height / box[3])
			const offsetX = rect.left + (rect.width - box[2] * scale) / 2
			const offsetY = rect.top + (rect.height - box[3] * scale) / 2
			return { x: box[0] + (clientX - offsetX) / scale, y: box[1] + (clientY - offsetY) / scale, scale }
		},
		[svgRef],
	)

	const zoomAt = useCallback(
		(point: { x: number; y: number }, factor: number, from: Box) => {
			const w = from[2] / factor
			const h = from[3] / factor
			return clamp([point.x - ((point.x - from[0]) * w) / from[2], point.y - ((point.y - from[1]) * h) / from[3], w, h])
		},
		[clamp],
	)

	// Trackpad pinch and ctrl/⌘ + wheel zoom; a plain wheel still scrolls the page.
	useEffect(() => {
		const svg = svgRef.current
		if (!svg) return
		const onWheel = (event: WheelEvent) => {
			if (!event.ctrlKey && !event.metaKey) return
			event.preventDefault()
			const box = viewRef.current
			setView(zoomAt(toSvg(event.clientX, event.clientY, box), Math.exp(-event.deltaY * 0.01), box))
		}
		svg.addEventListener('wheel', onWheel, { passive: false })
		return () => svg.removeEventListener('wheel', onWheel)
	}, [svgRef, toSvg, zoomAt, setView])

	const zoomed = view[2] < base[2] - 0.5

	const handlers = {
		onPointerDown: (event: React.PointerEvent) => {
			pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
			dragged.current = false
			const box = viewRef.current
			if (pointers.current.size === 2) {
				const [a, b] = [...pointers.current.values()]
				gesture.current = {
					view: box,
					x: 0,
					y: 0,
					distance: Math.hypot(a.x - b.x, a.y - b.y),
					mid: toSvg((a.x + b.x) / 2, (a.y + b.y) / 2, box),
				}
			} else {
				gesture.current = { view: box, x: event.clientX, y: event.clientY }
			}
		},
		onPointerMove: (event: React.PointerEvent) => {
			if (!pointers.current.has(event.pointerId) || !gesture.current) return
			pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
			const start = gesture.current
			if (pointers.current.size >= 2 && start.distance && start.mid) {
				const [a, b] = [...pointers.current.values()]
				dragged.current = true
				setView(zoomAt(start.mid, Math.hypot(a.x - b.x, a.y - b.y) / start.distance, start.view))
				return
			}
			const dx = event.clientX - start.x
			const dy = event.clientY - start.y
			if (Math.hypot(dx, dy) > DRAG_THRESHOLD) dragged.current = true
			if (!dragged.current || start.view[2] >= base[2] - 0.5) return
			const { scale } = toSvg(event.clientX, event.clientY, start.view)
			setView(clamp([start.view[0] - dx / scale, start.view[1] - dy / scale, start.view[2], start.view[3]]))
		},
		onPointerUp: (event: React.PointerEvent) => {
			pointers.current.delete(event.pointerId)
			const [rest] = [...pointers.current.values()]
			// Lifting one finger of a pinch continues as a pan from the remaining finger.
			gesture.current = rest ? { view: viewRef.current, x: rest.x, y: rest.y } : null
		},
		onPointerCancel: (event: React.PointerEvent) => {
			pointers.current.delete(event.pointerId)
			gesture.current = null
		},
		onDoubleClick: (event: React.MouseEvent) => {
			const box = viewRef.current
			setView(zoomed ? parseBox(baseKey) : zoomAt(toSvg(event.clientX, event.clientY, box), 2.4, box))
		},
	}

	return {
		viewBox: view.join(' '),
		zoomed,
		handlers,
		/** True when the pointer that just lifted was dragging or pinching, so its click is not a selection. */
		wasDrag: () => dragged.current,
		zoomIn: () => setView((box) => zoomAt({ x: box[0] + box[2] / 2, y: box[1] + box[3] / 2 }, 1.6, box)),
		zoomOut: () => setView((box) => zoomAt({ x: box[0] + box[2] / 2, y: box[1] + box[3] / 2 }, 1 / 1.6, box)),
		reset: () => setView(parseBox(baseKey)),
	}
}
