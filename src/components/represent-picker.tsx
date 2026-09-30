'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSyncExternalStore } from 'react'
import { STATE_ZONES, ZONE_ORDER } from '@/data/nigeria/states'
import { representPath } from '@/lib/graph/paths'

const KEY = 'govgraph:my-state'
const EVENT = 'govgraph-my-state'

function subscribe(onChange: () => void) {
	window.addEventListener(EVENT, onChange)
	window.addEventListener('storage', onChange)
	return () => {
		window.removeEventListener(EVENT, onChange)
		window.removeEventListener('storage', onChange)
	}
}

function readState() {
	try {
		return localStorage.getItem(KEY)
	} catch {
		return null
	}
}

export function rememberState(stateId: string) {
	try {
		localStorage.setItem(KEY, stateId)
		window.dispatchEvent(new Event(EVENT))
	} catch {
		// Private browsing: the choice just isn't remembered.
	}
}

/** "Who represents me?": pick a state, grouped by geopolitical zone, and see everyone who serves it. */
export function RepresentPicker({ gov, states, compact = false }: { gov: string; states: Array<{ id: string; name: string }>; compact?: boolean }) {
	const router = useRouter()
	const mine = useSyncExternalStore(subscribe, readState, () => null)
	const known = mine ? states.find((state) => state.id === mine) : undefined
	const choose = (stateId: string) => {
		if (!stateId) return
		rememberState(stateId)
		router.push(representPath(gov, stateId), { scroll: false })
	}
	return (
		<section className={`panel-card represent-card${compact ? ' is-compact' : ''}`}>
			{compact ? null : (
				<>
					<h2>Who represents me?</h2>
					<p className="muted-copy">Your governor, senators, members of the House of Representatives and state assembly.</p>
				</>
			)}
			<label className="represent-select">
				<span className="sr-only">Your state</span>
				<select value="" onChange={(event) => choose(event.target.value)}>
					<option value="">{compact ? 'Another state…' : 'Choose your state…'}</option>
					{ZONE_ORDER.map((zone) => (
						<optgroup key={zone} label={zone}>
							{states
								.filter((state) => (STATE_ZONES[state.id] ?? 'North Central') === zone)
								.sort((a, b) => a.name.localeCompare(b.name))
								.map((state) => (
									<option key={state.id} value={state.id}>{state.name}</option>
								))}
						</optgroup>
					))}
				</select>
			</label>
			{known && !compact ? (
				<Link className="represent-mine" href={representPath(gov, known.id)} scroll={false}>
					Your state: <strong>{known.name}</strong> →
				</Link>
			) : null}
		</section>
	)
}
