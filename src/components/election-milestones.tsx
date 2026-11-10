'use client'

import { formatLagosDate } from '@/lib/dates'

import { MILESTONES } from '@/data/nigeria/elections'
import { useClock } from '@/components/clock'


export function ElectionMilestones() {
	const clock = useClock()
	const today = clock ? new Date(clock).toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' }) : null
	const nextIndex = today ? MILESTONES.findIndex((item) => (item.ends ?? item.starts) >= today) : -1
	return <ol className="milestones">{MILESTONES.map((item, index) => {
		const state = !today ? '' : index < nextIndex || nextIndex === -1 ? 'is-done' : index === nextIndex ? 'is-next' : ''
		return <li key={item.id} className={state}>
			<span className="milestone-date">{item.ends ? `${formatLagosDate(item.starts)} – ${formatLagosDate(item.ends)}` : formatLagosDate(item.starts)}</span>
			<strong>{item.label}</strong>
			{item.detail ? <small>{item.detail}</small> : null}
			<a href={item.sourceUrl} target="_blank" rel="noreferrer" className="milestone-source">source</a>
		</li>
	})}</ol>
}
