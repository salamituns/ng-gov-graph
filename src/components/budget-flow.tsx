'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useT } from '@/components/lang'
import { useZoom } from '@/components/use-zoom'
import { naira } from '@/data/nigeria/budget'
import type { BudgetFlow as Flow, FlowMinistry } from '@/lib/graph/budget-flow'

const W = 1120
const H = 660
const TOP = 70
const BOTTOM = 24
const NODE = 12
const X = [36, 300, 640, 930]

const PART_TONE: Record<string, string> = {
	ministries: 'own',
	debt: 'debt',
	'service-wide': 'swv',
	statutory: 'statutory',
	rest: 'rest',
}

const TYPES = [
	{ key: 'personnel', label: 'Salaries', tone: 'pay' },
	{ key: 'overhead', label: 'Running costs', tone: 'run' },
	{ key: 'capital', label: 'Projects', tone: 'build' },
] as const

interface Box {
	id: string
	x: number
	y: number
	h: number
}

interface Band {
	key: string
	from: string
	to: string
	tone: string
	value: number
	d: string
}

function short(value: number) {
	return naira(value).replace(' trillion', 'T').replace(' billion', 'B').replace(' million', 'M')
}

function band(x0: number, y0: number, x1: number, y1: number, width: number) {
	const xm = (x0 + x1) / 2
	return `M${x0},${y0} C${xm},${y0} ${xm},${y1} ${x1},${y1} L${x1},${y1 + width} C${xm},${y1 + width} ${xm},${y0 + width} ${x0},${y0 + width} Z`
}

/** Stacks values top to bottom with gaps, centred in the drawing area. */
function stack(ids: string[], values: number[], x: number, k: number, gap: number): Box[] {
	const height = values.reduce((sum, v) => sum + v * k, 0) + gap * (values.length - 1)
	let y = TOP + (H - TOP - BOTTOM - height) / 2
	return ids.map((id, i) => {
		const box = { id, x, y, h: Math.max(1, values[i] * k) }
		y += values[i] * k + gap
		return box
	})
}

function layout(flow: Flow) {
	const bodies: FlowMinistry[] = [...flow.ministries, flow.others]
	const k = (H - TOP - BOTTOM - 4 * 14) / flow.total
	const c0 = stack(['total'], [flow.total], X[0], k, 0)
	const c1 = stack(flow.parts.map((p) => p.id), flow.parts.map((p) => p.value), X[1], k, 14)
	const c2 = stack(bodies.map((b) => b.id), bodies.map((b) => b.total), X[2], k, 7)
	const typeTotals = TYPES.map((t) => bodies.reduce((sum, b) => sum + b[t.key], 0))
	const c3 = stack(TYPES.map((t) => t.key), typeTotals, X[3], k, 26)
	const bands: Band[] = []

	let cursor = c0[0].y
	flow.parts.forEach((part, i) => {
		const w = part.value * k
		bands.push({ key: `total-${part.id}`, from: 'total', to: part.id, tone: PART_TONE[part.id], value: part.value, d: band(X[0] + NODE, cursor, X[1], c1[i].y, w) })
		cursor += w
	})

	const own = c1[flow.parts.findIndex((p) => p.id === 'ministries')]
	cursor = own.y
	bodies.forEach((body, i) => {
		const w = body.total * k
		bands.push({ key: `ministries-${body.id}`, from: 'ministries', to: body.id, tone: 'own', value: body.total, d: band(X[1] + NODE, cursor, X[2], c2[i].y, w) })
		cursor += w
	})

	const into = c3.map((box) => box.y)
	bodies.forEach((body, i) => {
		let out = c2[i].y
		TYPES.forEach((type, t) => {
			const w = body[type.key] * k
			if (w <= 0) return
			bands.push({ key: `${body.id}-${type.key}`, from: body.id, to: type.key, tone: type.tone, value: body[type.key], d: band(X[2] + NODE, out, X[3], into[t], w) })
			out += w
			into[t] += w
		})
	})
	return { c0, c1, c2, c3, bands, bodies, typeTotals }
}

/** The 2026 budget as a flow: the whole, where it splits, which ministries get it, and what they spend it on. */
export function BudgetFlow({ flow, selectedId, onSelect }: { flow: Flow; selectedId?: string; onSelect: (id: string) => void }) {
	const { t } = useT()
	const [hover, setHover] = useState<string | null>(null)
	const { c0, c1, c2, c3, bands, bodies, typeTotals } = layout(flow)
	// Small ministries sit close together: push each label down until it clears the one above.
	const labelYs = c2.reduce<number[]>((ys, box) => [...ys, Math.max(box.y + box.h / 2 + 4, (ys.at(-1) ?? -Infinity) + 15)], [])
	const focus = hover ?? (selectedId && bodies.some((b) => b.id === selectedId) ? selectedId : null)
	const bodyIds = new Set(bodies.map((b) => b.id))
	const typeKeys = new Set<string>(TYPES.map((ty) => ty.key))
	// Light the whole route through the focus: back to the total, and on to where the money is spent.
	const lit = (b: Band) => {
		if (!focus || focus === 'total') return true
		if (b.from === focus || b.to === focus) return true
		if (bodyIds.has(focus)) return b.key === 'total-ministries'
		if (focus === 'ministries') return bodyIds.has(b.from)
		if (typeKeys.has(focus)) return b.key === 'total-ministries' || (b.from === 'ministries' && bands.some((x) => x.from === b.to && x.to === focus))
		return false
	}

	const detail = (() => {
		if (!focus) return null
		const part = flow.parts.find((p) => p.id === focus)
		if (part) return { title: part.label, value: part.value, share: part.value / flow.total, note: part.note }
		const body = bodies.find((b) => b.id === focus)
		if (body)
			return {
				title: body.label,
				value: body.total,
				share: body.total / flow.total,
				note: `Salaries ${short(body.personnel)} · Running costs ${short(body.overhead)} · Projects ${short(body.capital)}`,
			}
		const type = TYPES.findIndex((ty) => ty.key === focus)
		if (type >= 0) return { title: TYPES[type].label, value: typeTotals[type], share: typeTotals[type] / flow.total, note: 'Across all ministries and offices' }
		if (focus === 'total') return { title: '2026 budget', value: flow.total, share: 1, note: 'Signed into law on 17 April 2026' }
		return null
	})()

	// The selected ministry's page is in the sheet below the map: the caption names it, the card invites deeper.
	const selectedBody = bodies.find((b) => b.id === selectedId && b.id !== 'others')
	const focusedBody = bodies.find((b) => b.id === focus && b.id !== 'others')

	// The snippet answers "how much?", then gets out of the way: an × hides it until the reader taps
	// something else, and any new focus is a new question the card answers again.
	const [dismissedKey, setDismissedKey] = useState<string | null>(null)
	const [prevFocus, setPrevFocus] = useState(focus)
	if (prevFocus !== focus) {
		setPrevFocus(focus)
		setDismissedKey(null)
	}

	const hoverProps = (id: string) => ({ onMouseEnter: () => setHover(id), onMouseLeave: () => setHover(null), onFocus: () => setHover(id), onBlur: () => setHover(null) })

	// Pinch, drag and double-tap zoom, after the graph map: the viewBox moves, so labels stay sharp.
	// The flow opens as a whole fitted to the width; once zoomed, one finger pans the diagram.
	const svgRef = useRef<SVGSVGElement>(null)
	const zoom = useZoom(svgRef, `0 0 ${W} ${H}`)

	return (
		<div className="budget-flow">
			<BudgetFlowList flow={flow} selectedId={selectedId} onSelect={onSelect} />
			<div className="budget-flow-wide">
			<div className="budget-flow-scroll">
				<svg
					ref={svgRef}
					viewBox={zoom.viewBox}
					role="img"
					aria-label={`${t('budgetTitle')}: ${naira(flow.total)} in 2026`}
					className={zoom.zoomed ? 'is-zoomed' : undefined}
					{...zoom.handlers}
				>
					<text x={X[0]} y={26} className="flow-title">{t('budgetTitle')}</text>
					{['Budget', 'First split', 'Ministries and offices', 'Spent on'].map((label, i) => (
						<text key={label} x={X[i]} y={52} className="flow-column">{label}</text>
					))}

					<g className="flow-bands">
						{bands.map((b) => (
							<path key={b.key} d={b.d} className={`flow-band tone-${b.tone}${lit(b) ? '' : ' is-faded'}`}>
								<title>{`${b.from === 'total' ? '2026 budget' : b.from} → ${b.to}: ${naira(b.value)}`}</title>
							</path>
						))}
					</g>

					<g {...hoverProps('total')}>
						<rect x={c0[0].x} y={c0[0].y} width={NODE} height={c0[0].h} className="flow-node tone-total" />
						<text x={c0[0].x} y={c0[0].y - 8} className="flow-label is-strong">{short(flow.total)}</text>
					</g>

					{flow.parts.map((part, i) => (
						<g key={part.id} {...hoverProps(part.id)} tabIndex={0}>
							<rect x={c1[i].x} y={c1[i].y} width={NODE} height={c1[i].h} className={`flow-node tone-${PART_TONE[part.id]}`} />
							<text x={c1[i].x + NODE + 6} y={c1[i].y + Math.min(c1[i].h / 2, 14) + 4} className="flow-label">
								{part.label} <tspan className="flow-amount">{short(part.value)}</tspan>
							</text>
						</g>
					))}

					{bodies.map((body, i) => {
						const clickable = body.id !== 'others'
						const labelY = labelYs[i]
						return (
							<g
								key={body.id}
								{...hoverProps(body.id)}
								tabIndex={clickable ? 0 : -1}
								role={clickable ? 'link' : undefined}
								className={clickable ? 'flow-clickable' : undefined}
								// A pan or pinch that ends over a bar walked the flow, it did not choose the bar.
								onClick={clickable ? () => { if (!zoom.wasDrag()) onSelect(body.id) } : undefined}
								onKeyDown={clickable ? (e) => { if (e.key === 'Enter') onSelect(body.id) } : undefined}
							>
								<rect x={c2[i].x} y={c2[i].y} width={NODE} height={c2[i].h} className={`flow-node tone-own${body.id === selectedId ? ' is-selected' : ''}`} />
								<text x={c2[i].x + NODE + 6} y={labelY} className="flow-label">
									{body.label} <tspan className="flow-amount">{short(body.total)}</tspan>
								</text>
							</g>
						)
					})}

					{TYPES.map((type, i) => (
						<g key={type.key} {...hoverProps(type.key)} tabIndex={0}>
							<rect x={c3[i].x} y={c3[i].y} width={NODE} height={c3[i].h} className={`flow-node tone-${type.tone}`} />
							<text x={c3[i].x + NODE + 6} y={c3[i].y + c3[i].h / 2 + 4} className="flow-label">
								{type.label} <tspan className="flow-amount">{short(typeTotals[i])}</tspan>
							</text>
						</g>
					))}
				</svg>
			</div>
			{detail && dismissedKey !== focus ? (
				<div className="flow-detail" aria-live="polite">
					<button type="button" className="flow-detail-x" aria-label="Hide these details" onClick={() => setDismissedKey(focus)}>×</button>
					<strong>{detail.title}</strong>
					<span>{naira(detail.value)} · {(detail.share * 100).toFixed(1)}% of the budget</span>
					<small>{detail.note}</small>
					{focusedBody ? (
						// Only ministries have a page waiting in the sheet; parts and types are read right here.
						<button type="button" className="flow-detail-open" onClick={() => window.dispatchEvent(new Event('govgraph:open-panel'))}>Details ↑</button>
					) : null}
				</div>
			) : (
				<p className="flow-detail flow-hint">
					<span className="flow-hint-hover">Hover a band to see the amount.</span>
					<span className="flow-hint-touch">Tap a bar to see the amount.</span>
					{' '}Select a ministry to open it.
				</p>
			)}
			<div className="flow-zoom" role="group" aria-label="Zoom the budget flow">
				<button type="button" aria-label="Zoom in" onClick={zoom.zoomIn}>+</button>
				<button type="button" aria-label="Zoom out" onClick={zoom.zoomOut} disabled={!zoom.zoomed}>−</button>
				{zoom.zoomed ? <button type="button" aria-label="Show the whole flow" onClick={zoom.reset}>⤢</button> : null}
			</div>
			{/* The flow opens as an overview; the chip teaches the pinch that brings it to reading size. */}
			<p className="flow-swipe" aria-hidden="true">Pinch to zoom into the money →</p>
			{/* After the map's caption: names the ministry whose page is in the sheet, nudges on each new
			    pick, then fades — a pointer, not a button, so it never blocks the flow beneath it. */}
			{selectedBody ? (
				<p key={selectedBody.id} className="flow-caption tone-own" aria-hidden="true">
					{selectedBody.label}
					<span className="map-caption-cta"> · Details ↑</span>
				</p>
			) : null}
			</div>
		</div>
	)
}

function pct(value: number, total: number) {
	const share = (value / total) * 100
	return share >= 10 ? `${share.toFixed(0)}%` : `${share.toFixed(1)}%`
}

/** Phones: the same flow read top to bottom, as stacked bars and rows that expand on tap. */
function BudgetFlowList({ flow, selectedId, onSelect }: { flow: Flow; selectedId?: string; onSelect: (id: string) => void }) {
	const { t } = useT()
	const bodies: FlowMinistry[] = [...flow.ministries, flow.others]
	const [open, setOpen] = useState<string | null>(selectedId && bodies.some((b) => b.id === selectedId) ? selectedId : null)
	const own = flow.parts.find((p) => p.id === 'ministries')?.value ?? 1
	const largest = Math.max(...bodies.map((b) => b.total), 1)
	const typeTotals = TYPES.map((type) => bodies.reduce((sum, b) => sum + b[type.key], 0))
	const toggle = (id: string) => setOpen((current) => (current === id ? null : id))
	const selectedRow = useRef<HTMLLIElement>(null)
	// A ministry chosen elsewhere (its page, or the Sankey) opens scrolled into view, details showing.
	useEffect(() => {
		selectedRow.current?.scrollIntoView({ block: 'nearest' })
	}, [selectedId])

	return (
		<div className="flow-list">
			<header className="flow-list-head">
				<h2>{t('budgetTitle')}</h2>
				<p><strong>{naira(flow.total)}</strong> in the 2026 budget</p>
			</header>

			<section aria-label="First split">
				<h3>Where it splits first</h3>
				<div className="flow-stack" aria-hidden="true">
					{flow.parts.map((part) => (
						<span key={part.id} className={`tone-${PART_TONE[part.id]}`} style={{ width: `${(part.value / flow.total) * 100}%` }} />
					))}
				</div>
				<ul className="flow-rows">
					{flow.parts.map((part) => (
						<li key={part.id}>
							<button type="button" aria-expanded={open === part.id} onClick={() => toggle(part.id)}>
								<i className={`tone-${PART_TONE[part.id]}`} />
								<span className="flow-row-name">{part.label}</span>
								<span className="flow-row-value">{short(part.value)} <small>{pct(part.value, flow.total)}</small></span>
							</button>
							{open === part.id ? <p className="flow-row-note">{part.note}</p> : null}
						</li>
					))}
				</ul>
			</section>

			<section aria-label="Ministries and offices">
				<h3>Ministries and offices <small>{short(own)}</small></h3>
				<ul className="flow-rows">
					{bodies.map((body) => {
						const isOpen = open === body.id
						return (
							<li key={body.id} ref={body.id === selectedId ? selectedRow : undefined} className={body.id === selectedId ? 'is-selected' : undefined}>
								<button type="button" aria-expanded={isOpen} onClick={() => toggle(body.id)}>
									<span className="flow-row-name">{body.label}</span>
									<span className="flow-row-value">{short(body.total)}</span>
									<span className="flow-mini" aria-hidden="true" style={{ width: `${Math.max(2, (body.total / largest) * 100)}%` }}>
										{TYPES.map((type) => (
											<span key={type.key} className={`tone-${type.tone}`} style={{ width: `${(body[type.key] / body.total) * 100}%` }} />
										))}
									</span>
								</button>
								{isOpen ? (
									<div className="flow-row-note">
										<p>
											Salaries {short(body.personnel)} · Running costs {short(body.overhead)} · Projects {short(body.capital)}
										</p>
										{body.id === 'others' ? (
											<Link href="/ng/budget" className="flow-open">See all {flow.others.count} on the budget page →</Link>
										) : (
											<button type="button" className="flow-open" onClick={() => onSelect(body.id)}>Open {body.label} →</button>
										)}
									</div>
								) : null}
							</li>
						)
					})}
				</ul>
			</section>

			<section aria-label="Spent on">
				<h3>What ministries spend it on</h3>
				<div className="flow-stack" aria-hidden="true">
					{TYPES.map((type, i) => (
						<span key={type.key} className={`tone-${type.tone}`} style={{ width: `${(typeTotals[i] / own) * 100}%` }} />
					))}
				</div>
				<ul className="flow-rows is-static">
					{TYPES.map((type, i) => (
						<li key={type.key}>
							<div>
								<i className={`tone-${type.tone}`} />
								<span className="flow-row-name">{type.label}</span>
								<span className="flow-row-value">{short(typeTotals[i])} <small>{pct(typeTotals[i], own)}</small></span>
							</div>
						</li>
					))}
				</ul>
			</section>
		</div>
	)
}
