'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { SeeOnMap } from '@/components/see-on-map'
import { SpendBar } from '@/components/spend-bar'
import { naira, perNigerian } from '@/data/nigeria/budget'
import { spotlight } from '@/lib/spotlight'

export interface ExplorerBudget {
	id: string
	label: string
	href: string
	personnel: number
	overhead: number
	capital: number
	total: number
	/** The Act's page for this body. */
	actHref: string
	page: number
	lines: number
	largest: { name: string; total: number; href?: string }[]
	/** Who runs it: the minister (or other head) and their page. */
	head?: { name: string; role: string; href: string }
}

type Unit = 'total' | 'person'

/**
 * The ministries, largest first. A row opens in place (how the money splits, its largest lines, who runs it)
 * and lights the body on the government map; on desktop a hover previews the light. Amounts read as totals
 * or as a share for every Nigerian.
 */
export function BudgetExplorer({ rows }: { rows: ExplorerBudget[] }) {
	const params = useSearchParams()
	const [open, setOpen] = useState<string | null>(params.get('ministry'))
	const [preview, setPreview] = useState<string | null>(null)
	const [unit, setUnit] = useState<Unit>('total')
	const opened = useRef<HTMLLIElement>(null)
	const moved = useRef(false)
	const top = rows[0]?.total ?? 1
	const amount = (value: number) => (unit === 'person' ? perNigerian(value) : naira(value))

	const toggle = (id: string) => {
		const next = open === id ? null : id
		setOpen(next)
		setPreview(null)
		moved.current = true
		const url = new URL(window.location.href)
		if (next) url.searchParams.set('ministry', next)
		else url.searchParams.delete('ministry')
		window.history.replaceState(window.history.state, '', url)
	}

	// The government map lights the row being read (or previewed).
	const shown = rows.find((row) => row.id === (preview ?? open))
	useEffect(() => {
		spotlight(shown ? { label: shown.label, nodeIds: [shown.id], stateIds: [], caption: `${shown.label} · ${naira(shown.total)}` } : null)
	}, [shown])
	useEffect(() => () => spotlight(null), [])

	// An opened row stays in view: on a phone the detail can open below the fold.
	useEffect(() => {
		if (!moved.current || !open) return
		moved.current = false
		const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
		opened.current?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' })
	}, [open])

	return (
		<>
			<div className="budget-unit" role="group" aria-label="Show amounts as">
				<button type="button" aria-pressed={unit === 'total'} onClick={() => setUnit('total')}>Total</button>
				<button type="button" aria-pressed={unit === 'person'} onClick={() => setUnit('person')}>Per Nigerian</button>
			</div>
			<ol className="budget-ranking" onPointerLeave={() => setPreview(null)}>
				{rows.map((row) => {
					const isOpen = open === row.id
					return (
						<li key={row.id} ref={isOpen ? opened : undefined} className={isOpen ? 'is-open' : undefined}>
							<button
								type="button"
								className="budget-rank-row"
								aria-expanded={isOpen}
								onClick={() => toggle(row.id)}
								onPointerEnter={(event) => {
									if (event.pointerType === 'mouse') setPreview(row.id)
								}}
							>
								<span className="budget-rank-name">{row.label}</span>
								<span className="fc-bar" aria-hidden="true"><span style={{ width: `${(row.total / top) * 100}%` }} /></span>
								<span className="budget-rank-total">{amount(row.total)}</span>
							</button>
							{isOpen ? (
								<div className="budget-rank-detail">
									<SpendBar {...row} />
									{unit === 'person' ? <p className="budget-note">{naira(row.total)} in all.</p> : <p className="budget-note">About {perNigerian(row.total)} for every Nigerian.</p>}
									{row.head ? (
										<p className="budget-head">
											Run by <Link href={row.head.href} className="entity-link">{row.head.name}</Link>, {row.head.role}
										</p>
									) : null}
									{row.lines > 1 ? (
										<>
											<h3>Largest lines, of {row.lines}</h3>
											<ol className="budget-lines">
												{row.largest.slice(0, 3).map((line) => (
													<li key={line.name}>
														{line.href ? <Link href={line.href} className="entity-link">{line.name}</Link> : <span>{line.name}</span>}
														<span>{amount(line.total)}</span>
													</li>
												))}
											</ol>
										</>
									) : null}
									<p className="budget-rank-links">
										<Link href={row.href} className="fc-pick-link">Open {row.label} →</Link>
										<a href={row.actHref} target="_blank" rel="noreferrer">Act, p.{row.page}</a>
									</p>
									<SeeOnMap />
								</div>
							) : null}
						</li>
					)
				})}
			</ol>
		</>
	)
}
