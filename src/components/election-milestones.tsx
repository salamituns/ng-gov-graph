'use client'

import { MILESTONES } from '@/data/nigeria/elections'
import { useClock } from '@/components/clock'

function day(iso: string) {
	return new Date(`${iso}T12:00:00+01:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' })
}

export function ElectionMilestones() {
	const clock = useClock()
	const today = clock ? new Date(clock).toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' }) : null
	const nextIndex = today ? MILESTONES.findIndex((item) => (item.ends ?? item.starts) >= today) : -1
	return <ol className="milestones">{MILESTONES.map((item, index) => {
		const state = !today ? '' : index < nextIndex || nextIndex === -1 ? 'is-done' : index === nextIndex ? 'is-next' : ''
		return <li key={item.id} className={state}>
			<span className="milestone-date">{item.ends ? `${day(item.starts)} – ${day(item.ends)}` : day(item.starts)}</span>
			<strong>{item.label}</strong>
			{item.detail ? <small>{item.detail}</small> : null}
			<a href={item.sourceUrl} target="_blank" rel="noreferrer" className="milestone-source">source</a>
		</li>
	})}</ol>
}
