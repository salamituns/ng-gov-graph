'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { SeeOnMap } from '@/components/see-on-map'
import { naira, perNigerian } from '@/data/nigeria/budget'
import { spotlight } from '@/lib/spotlight'

export interface ExplorerMinister {
	name: string
	href: string
	portfolio: string
	imageUrl?: string
	/** The state comes from the minister's hometown, not a nomination report. */
	hometown?: boolean
	/** The minister's seats and the bodies they sit in, for the spotlight on the government map. */
	nodeIds: string[]
	/** The 2026 budget of the ministry they serve in, when the Act gives it a line. */
	budget?: number
}

/** The ministries a group of ministers serve in, each counted once (worked out on the server). */
export interface ExplorerMoney {
	total: number
	/** Ministries without a line of their own in the Act, named rather than counted as nothing. */
	uncounted: string[]
}

export interface ExplorerState {
	id: string
	slug: string
	name: string
	zone: string
	representHref: string
	ministers: ExplorerMinister[]
	money: ExplorerMoney
}

export interface ExplorerZone {
	zone: string
	slug: string
	states: number
	ministers: number
	money: ExplorerMoney
}

/** A pick is one state or one zone; the URL carries it, so a pick can be shared and survives Back. */
type Pick = { kind: 'state'; slug: string } | { kind: 'zone'; slug: string } | null

const zoneSlug = (zone: string) => zone.toLowerCase().replace(/\s+/g, '-')

function shade(count: number) {
	return count === 0 ? 'fc-none' : count === 1 ? 'fc-one' : count === 2 ? 'fc-two' : 'fc-many'
}

function plural(count: number) {
	return `${count} ${count === 1 ? 'minister' : 'ministers'}`
}

function initials(name: string) {
	return name
		.split(/\s+/)
		.filter((part) => /^[A-Z]/.test(part))
		.slice(0, 2)
		.map((part) => part[0])
		.join('')
}

/** "Its ministers serve in ministries with ₦4.27 trillion of the 2026 budget, about ₦17,600 for every Nigerian." */
function MoneyLine({ money, who }: { money: ExplorerMoney; who: string }) {
	if (!money.total && !money.uncounted.length) return null
	if (!money.total) return <p className="fc-money">{who} in {money.uncounted.join(' and ')}, which the Act funds outside a ministry line, so there is no ministry budget to show.</p>
	return (
		<p className="fc-money">
			{who} in ministries with <strong>{naira(money.total)}</strong> of the 2026 budget, about {perNigerian(money.total)} for every Nigerian
			{money.uncounted.length ? `, not counting ${money.uncounted.join(' and ')}, which the Act funds outside a ministry line` : ''}.
		</p>
	)
}

function MinisterRow({ minister }: { minister: ExplorerMinister }) {
	// Some official sites refuse to serve their portraits to other domains; show initials instead.
	const [broken, setBroken] = useState(false)
	return (
		<li>
			<Link href={minister.href} className="fc-minister">
				{minister.imageUrl && !broken ? (
					// eslint-disable-next-line @next/next/no-img-element
					<img src={minister.imageUrl} alt="" loading="lazy" onError={() => setBroken(true)} />
				) : (
					<span className="fc-minister-initials" aria-hidden="true">{initials(minister.name)}</span>
				)}
				<span>
					<strong>
						{minister.name}
						{minister.hometown ? <sup title="State taken from the minister’s hometown, not a nomination report">†</sup> : null}
					</strong>
					<small>{minister.portfolio}{minister.budget ? ` · ${naira(minister.budget)} budget` : ''}</small>
				</span>
			</Link>
		</li>
	)
}

export function CabinetExplorer({ states, zones, shapes, width, height }: { states: ExplorerState[]; zones: ExplorerZone[]; shapes: Record<string, string>; width: number; height: number }) {
	const params = useSearchParams()
	const fromUrl: Pick = params.get('state') ? { kind: 'state', slug: params.get('state')! } : params.get('zone') ? { kind: 'zone', slug: params.get('zone')! } : null
	const [pick, setPick] = useState<Pick>(fromUrl)
	// Desktop hover previews a state in the card without pinning it.
	const [preview, setPreview] = useState<string | null>(null)
	const card = useRef<HTMLDivElement>(null)
	const moved = useRef(false)

	const byId = new Map(states.map((state) => [state.id, state]))
	const bySlug = new Map(states.map((state) => [state.slug, state]))
	const most = Math.max(...zones.map((zone) => zone.ministers), 1)

	const shown: Pick = preview ? { kind: 'state', slug: preview } : pick
	const pickedState = shown?.kind === 'state' ? bySlug.get(shown.slug) : undefined
	const pickedZone = shown?.kind === 'zone' ? zones.find((zone) => zone.slug === shown.slug) : undefined
	const inPick = (state: ExplorerState) => (pickedState ? state.id === pickedState.id : pickedZone ? zoneSlug(state.zone) === pickedZone.slug : true)

	const choose = (next: Pick) => {
		const same = next && pick && next.kind === pick.kind && next.slug === pick.slug
		const value = same ? null : next
		setPick(value)
		setPreview(null)
		moved.current = true
		const url = new URL(window.location.href)
		url.searchParams.delete('state')
		url.searchParams.delete('zone')
		if (value) url.searchParams.set(value.kind, value.slug)
		window.history.replaceState(window.history.state, '', url)
	}

	// The government map follows what the card shows: a hover preview, a pick, or nothing.
	const spotKey = pickedState ? `s:${pickedState.id}` : pickedZone ? `z:${pickedZone.slug}` : ''
	useEffect(() => {
		const picked = pickedState ? [pickedState] : pickedZone ? states.filter((state) => zoneSlug(state.zone) === pickedZone.slug) : []
		spotlight(
			picked.length
				? {
						label: pickedState?.name ?? pickedZone!.zone,
						nodeIds: picked.flatMap((state) => state.ministers.flatMap((minister) => minister.nodeIds)),
						stateIds: picked.map((state) => state.id),
					}
				: null,
		)
		// spotKey stands for the pick; the lists themselves never change while the page is open.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [spotKey])
	// Leaving the page leaves the map as it was.
	useEffect(() => () => spotlight(null), [])

	// After a pick, bring the card into view: on a phone it sits below the fold of the sheet.
	useEffect(() => {
		if (!moved.current || !pick) return
		moved.current = false
		const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
		card.current?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' })
	}, [pick])

	const pad = 2
	const selectedShape = pickedState ? shapes[pickedState.id] : undefined

	return (
		<>
			<section className="panel-card">
				<h2>Ministers by state</h2>
				<p className="muted-copy fc-hint">Tap a state, or a zone below, to see its ministers.</p>
				<svg
					viewBox={`${-width / 2 - pad} ${-height / 2 - pad} ${width + pad * 2} ${height + pad * 2}`}
					className={`fc-map${shown ? ' has-pick' : ''}`}
					role="group"
					aria-label="Map of Nigeria shaded by the number of ministers from each state"
					onPointerLeave={() => setPreview(null)}
				>
					{Object.entries(shapes).map(([id, d]) => {
						const state = byId.get(id)
						if (!state) return <path key={id} d={d} className="fc-state fc-none" />
						const count = state.ministers.length
						const picked = pick?.kind === 'state' && pick.slug === state.slug
						return (
							<path
								key={id}
								d={d}
								className={`fc-state ${shade(count)}${inPick(state) ? ' is-in' : ''}`}
								role="button"
								tabIndex={0}
								aria-pressed={picked}
								aria-label={`${state.name}: ${plural(count)}`}
								onPointerEnter={(event) => {
									if (event.pointerType === 'mouse') setPreview(state.slug)
								}}
								onClick={() => choose({ kind: 'state', slug: state.slug })}
								onKeyDown={(event) => {
									if (event.key === 'Enter' || event.key === ' ') {
										event.preventDefault()
										choose({ kind: 'state', slug: state.slug })
									}
								}}
							/>
						)
					})}
					{/* SVG paints in order, so the picked state is drawn again on top for a full outline. */}
					{selectedShape ? <path d={selectedShape} className="fc-state-outline" aria-hidden="true" /> : null}
				</svg>
				<ul className="fc-key" aria-label="Key">
					<li><i className="fc-none" />None</li>
					<li><i className="fc-one" />1</li>
					<li><i className="fc-two" />2</li>
					<li><i className="fc-many" />3 or more</li>
				</ul>

				<div ref={card} className="fc-pick" aria-live="polite">
					{pickedState ? (
						<div key={pickedState.id} className="fc-pick-card">
							<header>
								<div>
									<h3>{pickedState.name}</h3>
									<p>{pickedState.zone} · {plural(pickedState.ministers.length)}</p>
								</div>
								<button type="button" className="fc-pick-clear" aria-label="Clear" onClick={() => choose(null)}>×</button>
							</header>
							<MoneyLine money={pickedState.money} who={pickedState.ministers.length === 1 ? 'Its minister serves' : 'Its ministers serve'} />
							{pickedState.ministers.length ? (
								<ul className="fc-ministers">{pickedState.ministers.map((minister) => <MinisterRow key={minister.name} minister={minister} />)}</ul>
							) : (
								<p className="fc-gap">No minister on record from {pickedState.name}. Section 147(3) asks for at least one from every state.</p>
							)}
							<Link href={pickedState.representHref} className="fc-pick-link">Who represents {pickedState.name} →</Link>
							<SeeOnMap />
						</div>
					) : pickedZone ? (
						<div key={pickedZone.slug} className="fc-pick-card">
							<header>
								<div>
									<h3>{pickedZone.zone}</h3>
									<p>{pickedZone.states} states · {plural(pickedZone.ministers)}</p>
								</div>
								<button type="button" className="fc-pick-clear" aria-label="Clear" onClick={() => choose(null)}>×</button>
							</header>
							<MoneyLine money={pickedZone.money} who="Its ministers serve" />
							{states
								.filter((state) => zoneSlug(state.zone) === pickedZone.slug)
								.map((state) => (
									<div key={state.id} className="fc-pick-group">
										<button type="button" className="fc-pick-state" onClick={() => choose({ kind: 'state', slug: state.slug })}>
											{state.name} <span>{state.ministers.length}</span>
										</button>
										{state.ministers.length ? (
											<ul className="fc-ministers">{state.ministers.map((minister) => <MinisterRow key={minister.name} minister={minister} />)}</ul>
										) : (
											<p className="fc-gap">No minister on record</p>
										)}
									</div>
								))}
							<SeeOnMap />
						</div>
					) : null}
				</div>
			</section>

			<section className="panel-card">
				<h2>Across the six zones</h2>
				<p className="muted-copy">The zones are not in the Constitution, but appointments are weighed by them in practice.</p>
				<ul className="fc-zones">
					{zones.map((zone) => (
						<li key={zone.zone}>
							<button type="button" aria-pressed={pick?.kind === 'zone' && pick.slug === zone.slug} onClick={() => choose({ kind: 'zone', slug: zone.slug })}>
								<span className="fc-zone-name">{zone.zone}</span>
								<span className="fc-bar" aria-hidden="true"><span style={{ width: `${(zone.ministers / most) * 100}%` }} /></span>
								<span className="fc-zone-count">
									{zone.ministers} <small>/ {zone.states} states</small>
								</span>
							</button>
						</li>
					))}
				</ul>
			</section>
		</>
	)
}
