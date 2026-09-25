'use client'

import Link from 'next/link'
import { useSyncExternalStore } from 'react'
import { GENERAL_ELECTION, nextPoll } from '@/data/nigeria/elections'

function subscribeMinute(onTick: () => void) {
	const timer = setInterval(onTick, 15000)
	return () => clearInterval(timer)
}

function currentMinute() {
	return Math.floor(Date.now() / 60000) * 60000
}

function parts(ms: number) {
	const minutes = Math.max(0, Math.floor(ms / 60000))
	return { days: Math.floor(minutes / 1440), hours: Math.floor((minutes % 1440) / 60), minutes: minutes % 60 }
}

function pollDate(iso: string) {
	return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' })
}

/**
 * Days, hours and minutes to the next general election poll. The first render uses the server's clock so
 * the markup matches; it then ticks every minute and moves to the next poll once one opens.
 */
export function ElectionCountdown({ serverNow, inecHref }: { serverNow: string; inecHref: string }) {
	// Minute-resolution clock: the server's time during hydration, the browser's afterwards.
	const nowMs = useSyncExternalStore(subscribeMinute, currentMinute, () => Date.parse(serverNow))
	const now = new Date(nowMs)
	const poll = nextPoll(now)
	if (!poll) return null
	const left = parts(Date.parse(poll.opensAt) - now.getTime())
	const later = GENERAL_ELECTION.polls.filter((other) => Date.parse(other.opensAt) > Date.parse(poll.opensAt))
	return (
		<section className="panel-card election-card" aria-label={`${GENERAL_ELECTION.name} countdown`}>
			<header>
				<h2>{GENERAL_ELECTION.name}</h2>
				<Link href={inecHref}>INEC</Link>
			</header>
			<p className="election-poll">{poll.label}</p>
			<p className="election-count" role="timer" aria-live="off">
				<span><strong>{left.days}</strong> days</span>
				<span><strong>{left.hours}</strong> hrs</span>
				<span><strong>{left.minutes}</strong> min</span>
			</p>
			<p className="election-meta">
				{pollDate(poll.opensAt)} · polls open 8:30 a.m. WAT · {poll.offices}
			</p>
			{later.map((other) => (
				<p key={other.id} className="election-next">
					Then {other.label}: <strong>{pollDate(other.opensAt)}</strong>
				</p>
			))}
			<a className="election-source" href={GENERAL_ELECTION.sourceUrl} target="_blank" rel="noreferrer">{GENERAL_ELECTION.sourceLabel} ↗</a>
		</section>
	)
}
