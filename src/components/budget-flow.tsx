'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { currentSpotlight, noSpotlight, subscribeSpotlight } from '@/lib/spotlight'
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
export function BudgetFlow({ flow, selectedId: routeId, onSelect }: { flow: Flow; selectedId?: string; onSelect: (id: string) => void }) {
	const { t } = useT()
	const [hover, setHover] = useState<string | null>(null)
	const { c0, c1, c2, c3, bands, bodies, typeTotals } = layout(flow)
	// A page beside the flow can light ministries in it (lib/spotlight): the budget page's open row, or a
	// state's ministers on the federal character page. A ministry folded into "others" lights that row.
	const spot = useSyncExternalStore(subscribeSpotlight, currentSpotlight, noSpotlight)
	const spotBodies = spotlitBodies(flow, spot?.nodeIds ?? [])
	const spotOne = spotBodies.size === 1 ? [...spotBodies][0] : undefined
	// One lit ministry reads as a selection; several light together, each with its route.
	const selectedId = routeId ?? (spotOne && spotOne !== 'others' ? spotOne : undefined)
	const spotMany = !routeId && spotBodies.size > 1
	// Small ministries sit close together: push each label down until it clears the one above.
	const labelYs = c2.reduce<number[]>((ys, box) => [...ys, Math.max(box.y + box.h / 2 + 4, (ys.at(-1) ?? -Infinity) + 15)], [])
	const focus = hover ?? (selectedId && bodies.some((b) => b.id === selectedId) ? selectedId : null)
	const bodyIds = new Set(bodies.map((b) => b.id))
	const typeKeys = new Set<string>(TYPES.map((ty) => ty.key))
	// Light the whole route through the focus: back to the total, and on to where the money is spent.
	const lit = (b: Band) => {
		if (!focus && spotMany) return b.key === 'total-ministries' || spotBodies.has(b.from) || spotBodies.has(b.to)
		if (!focus || focus === 'total') return true
		if (b.from === focus || b.to === focus) return true
		if (bodyIds.has(focus)) return b.key === 'total-ministries'
		if (focus === 'ministries') return bodyIds.has(b.from)
		if (typeKeys.has(focus)) return b.key === 'total-ministries' || (b.from === 'ministries' && bands.some((x) => x.from === b.to && x.to === focus))
		return false
	}

	const detail = (() => {
		if (!focus && spotMany && spot)
			return {
				title: spot.label,
				value: spot.amount ?? 0,
				share: (spot.amount ?? 0) / flow.total,
				note: `${spotBodies.size} ministries and offices, lit in the flow`,
			}
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
	// Portrait phones open on the step-by-step flow; the whole Sankey is one tap away for the overview.
	const [mode, setMode] = useState<'steps' | 'whole'>('steps')

	return (
		<div className="budget-flow" data-mode={mode}>
			<BudgetFlowList flow={flow} selectedId={selectedId} onSelect={onSelect} />
			<BudgetFlowSteps flow={flow} selectedId={selectedId} highlight={spotMany ? spotBodies : undefined} onSelect={onSelect} onWhole={() => setMode('whole')} />
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
								<rect x={c2[i].x} y={c2[i].y} width={NODE} height={c2[i].h} className={`flow-node tone-own${body.id === selectedId || (spotMany && spotBodies.has(body.id)) ? ' is-selected' : ''}`} />
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
			{detail && dismissedKey !== (focus ?? spot?.label ?? null) ? (
				<div className="flow-detail" aria-live="polite">
					<button type="button" className="flow-detail-x" aria-label="Hide these details" onClick={() => setDismissedKey(focus ?? spot?.label ?? null)}>×</button>
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
			<button type="button" className="flow-steps-back" onClick={() => setMode('steps')}>← Step by step</button>
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

/** The flow's rows that a spotlight's nodes fall in: a shown ministry, or the folded "others" row. */
function spotlitBodies(flow: Flow, nodeIds: string[]) {
	const shown = new Set(flow.ministries.map((body) => body.id))
	const folded = new Set(flow.others.ids)
	return new Set(nodeIds.flatMap((id) => (shown.has(id) ? [id] : folded.has(id) ? ['others'] : [])))
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

type Level = 'split' | 'ministries' | string

interface StepRow {
	id: string
	label: string
	value: number
	tone: string
	/** Tapping the row goes one level deeper. */
	drill?: Level
	note?: string
}

const SW = 390
/** Fits between the step header and the view switcher on a 390×844 phone; taller steps scroll. */
const SH = 450
const S_TOP = 12
const S_LEFT = 14
const S_RIGHT = 150
const S_NODE = 10
/** Two lines of label (name, then amount and share) need this much height each. */
const ROW = 36

/**
 * Portrait phones: the flow one step at a time, two columns that fill the tall screen with labels at
 * reading size. The whole budget splits; tap Ministries and offices to see where their share goes; tap a
 * ministry to see what it spends on (and its page opens in the sheet). A breadcrumb walks back.
 */
function BudgetFlowSteps({ flow, selectedId, highlight, onSelect, onWhole }: { flow: Flow; selectedId?: string; highlight?: Set<string>; onSelect: (id: string) => void; onWhole: () => void }) {
	const { t } = useT()
	const bodies: FlowMinistry[] = [...flow.ministries, flow.others]
	const selected = bodies.find((b) => b.id === selectedId && b.id !== 'others')
	const [level, setLevel] = useState<Level>(selected ? selected.id : highlight?.size ? 'ministries' : 'split')
	const [note, setNote] = useState<string | null>(null)
	// A ministry picked elsewhere (its page, or the whole flow) opens at its own step.
	const [prevSelected, setPrevSelected] = useState(selectedId)
	if (prevSelected !== selectedId) {
		setPrevSelected(selectedId)
		if (selected) setLevel(selected.id)
	}
	// Several ministries lit from the page beside the flow: show them among the ministries.
	const highlightKey = highlight ? [...highlight].sort().join('|') : ''
	const [prevHighlight, setPrevHighlight] = useState(highlightKey)
	if (prevHighlight !== highlightKey) {
		setPrevHighlight(highlightKey)
		if (highlightKey) setLevel('ministries')
	}

	const own = flow.parts.find((p) => p.id === 'ministries')?.value ?? 0
	const body = bodies.find((b) => b.id === level)
	const source = level === 'split'
		? { label: t('budgetTitle'), value: flow.total, tone: 'total' }
		: level === 'ministries'
			? { label: 'Ministries and offices', value: own, tone: 'own' }
			: { label: body?.label ?? '', value: body?.total ?? 0, tone: 'own' }
	const rows: StepRow[] = level === 'split'
		? flow.parts.map((p) => ({ id: p.id, label: p.label, value: p.value, tone: PART_TONE[p.id], drill: p.id === 'ministries' ? 'ministries' : undefined, note: p.note }))
		: level === 'ministries'
			? bodies.map((b) => ({ id: b.id, label: b.label, value: b.total, tone: 'own', drill: b.id === 'others' ? undefined : b.id, note: b.id === 'others' ? `${flow.others.count} smaller bodies share ${short(b.total)}. The budget page lists every one.` : undefined }))
			: body
				? TYPES.map((type) => ({ id: type.key, label: type.label, value: body[type.key], tone: type.tone }))
				: []

	// Layout: the source fills the left; the rows stack on the right, each at least ROW tall for its label.
	const usable = SH - S_TOP * 2
	const gaps = 6 * Math.max(0, rows.length - 1)
	const k = (usable - gaps) / Math.max(1, source.value)
	const sourceH = source.value * k
	const sourceY = S_TOP + (usable - sourceH) / 2
	// Each row gets a slot at least ROW tall with its bar centred in it, so a label always sits beside its
	// own bar; the bands fan out from the source to meet them. A step taller than the screen scrolls.
	const placed = rows.reduce<(StepRow & { y: number; h: number; from: number; slot: number })[]>((acc, row) => {
		const prev = acc.at(-1)
		const h = Math.max(2, row.value * k)
		const slot = prev ? prev.slot + Math.max(prev.h, ROW) + 6 : S_TOP
		const y = slot + (Math.max(h, ROW) - h) / 2
		// from: where this row's band leaves the source bar, stacked in order.
		const from = prev ? prev.from + prev.value * k : sourceY
		return [...acc, { ...row, y, h, from, slot }]
	}, [])
	const labelYs = placed.map((box) => box.y + box.h / 2 - 17)
	const height = Math.max(SH, (placed.at(-1)?.slot ?? 0) + Math.max(placed.at(-1)?.h ?? 0, ROW) + S_TOP)

	const choose = (row: StepRow) => {
		if (row.drill) {
			setNote(null)
			setLevel(row.drill)
			if (row.drill !== 'ministries') onSelect(row.drill)
		} else {
			setNote((current) => (current === row.id ? null : row.id))
		}
	}
	const noteRow = rows.find((r) => r.id === note)
	const crumbs: { level: Level; label: string }[] = [{ level: 'split', label: short(flow.total) }]
	if (level !== 'split') crumbs.push({ level: 'ministries', label: 'Ministries' })
	if (body) crumbs.push({ level: body.id, label: body.label })

	return (
		<div className="flow-steps">
			<header className="flow-steps-head">
				<nav aria-label="Budget steps" className="flow-crumbs">
					{crumbs.map((crumb, i) => (
						<span key={crumb.level}>
							{i > 0 ? <span aria-hidden="true" className="flow-crumb-sep">›</span> : null}
							{i < crumbs.length - 1 ? (
								<button type="button" onClick={() => { setNote(null); setLevel(crumb.level) }}>{crumb.label}</button>
							) : (
								<strong aria-current="step">{crumb.label}</strong>
							)}
						</span>
					))}
				</nav>
				<button type="button" className="flow-whole" onClick={onWhole}>Whole flow ⤢</button>
			</header>
			<p className="flow-steps-sub">
				{level === 'split' ? 'The 2026 budget, and where it splits first. Tap a part.' : level === 'ministries' ? 'Tap a ministry to see what it spends on.' : `What ${body?.label ?? 'it'} spends its ${short(source.value)} on.`}
			</p>
			{noteRow?.note ? (
				<div className="flow-step-note" aria-live="polite">
					<strong>{noteRow.label}</strong> {noteRow.note}
					{noteRow.id === 'others' ? <Link href="/ng/budget" className="flow-open">See every body →</Link> : null}
				</div>
			) : body ? (
				<div className="flow-step-note">
					<button type="button" className="flow-open" onClick={() => window.dispatchEvent(new Event('govgraph:open-panel'))}>{body.label}: details ↑</button>
				</div>
			) : null}
			<div className="flow-steps-scroll">
				<svg viewBox={`0 0 ${SW} ${height}`} className="flow-steps-svg" role="img" aria-label={`${source.label}: ${naira(source.value)}`}>
					{placed.map((row) => (
						<path key={`band-${row.id}`} d={band(S_LEFT + S_NODE, row.from, S_RIGHT, row.y, row.value * k)} className={`flow-band tone-${row.tone}${(note && note !== row.id) || (!note && level === 'ministries' && highlight && !highlight.has(row.id)) ? ' is-faded' : ''}`} />
					))}
					<rect x={S_LEFT} y={sourceY} width={S_NODE} height={sourceH} className={`flow-node tone-${source.tone}`} />
					{placed.map((row, i) => (
						<g
							key={row.id}
							role="button"
							tabIndex={0}
							aria-label={`${row.label}, ${naira(row.value)}${row.drill ? ', open' : ''}`}
							className={`flow-step-row${!note && level === 'ministries' && highlight && !highlight.has(row.id) ? ' is-dim' : ''}`}
							onClick={() => choose(row)}
							onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(row) } }}
						>
							{/* The whole row, bar to edge, is the target: at least 44px tall for a thumb. */}
							<rect x={S_RIGHT - 4} y={row.slot - 3} width={SW - S_RIGHT + 4} height={Math.max(row.h, ROW) + 6} className="flow-step-hit" />
							<rect x={S_RIGHT} y={row.y} width={S_NODE} height={row.h} className={`flow-node tone-${row.tone}`} />
							<text x={S_RIGHT + S_NODE + 8} y={labelYs[i] + 12} className="flow-step-name">
								{row.label.length > 26 ? `${row.label.slice(0, 25).trimEnd()}…` : row.label}
								{row.drill ? <tspan className="flow-step-more"> ›</tspan> : null}
							</text>
							<text x={S_RIGHT + S_NODE + 8} y={labelYs[i] + 28} className="flow-step-value">
								{short(row.value)} · {pct(row.value, source.value)}
							</text>
						</g>
					))}
				</svg>
			</div>
		</div>
	)
}