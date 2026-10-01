'use client'

import { useState } from 'react'
import { useT } from '@/components/lang'
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

	const hoverProps = (id: string) => ({ onMouseEnter: () => setHover(id), onMouseLeave: () => setHover(null), onFocus: () => setHover(id), onBlur: () => setHover(null) })

	return (
		<div className="budget-flow">
			<div className="budget-flow-scroll">
				<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${t('budgetTitle')}: ${naira(flow.total)} in 2026`}>
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
								onClick={clickable ? () => onSelect(body.id) : undefined}
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
			{detail ? (
				<div className="flow-detail" aria-live="polite">
					<strong>{detail.title}</strong>
					<span>{naira(detail.value)} · {(detail.share * 100).toFixed(1)}% of the budget</span>
					<small>{detail.note}</small>
				</div>
			) : (
				<p className="flow-detail flow-hint">Hover a band to see the amount. Select a ministry to open it.</p>
			)}
		</div>
	)
}
