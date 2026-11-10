'use client'

import Link from 'next/link'
import { GENERAL_ELECTION, nextPoll } from '@/data/nigeria/elections'
import { useT } from '@/components/lang'
import { useClock } from '@/components/clock'

function parts(ms: number) {
	const minutes = Math.max(0, Math.floor(ms / 60000))
	return { days: Math.floor(minutes / 1440), hours: Math.floor((minutes % 1440) / 60), minutes: minutes % 60 }
}

function pollDate(iso: string) {
	return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' })
}

/**
 * Days, hours and minutes to the next general election poll. The cached HTML shows absolute poll dates;
 * the browser adds a live countdown and moves to the next poll once one opens.
 */
export function ElectionCountdown({ inecHref, guideHref }: { inecHref: string; guideHref?: string }) {
	// Relative time is never frozen into the page cache.
	const { t } = useT()
	const nowMs = useClock()
	if (!nowMs) return <section className="panel-card election-card"><h2>{GENERAL_ELECTION.name}</h2><p className="election-meta">{GENERAL_ELECTION.polls.map((poll) => `${poll.label}: ${pollDate(poll.opensAt)}`).join(' · ')}</p></section>
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
				<span><strong>{left.days}</strong> {t('days')}</span>
				<span><strong>{left.hours}</strong> {t('hours')}</span>
				<span><strong>{left.minutes}</strong> {t('minutes')}</span>
			</p>
			<p className="election-meta">
				{pollDate(poll.opensAt)} · {t('pollsOpen')} · {poll.offices}
			</p>
			{later.map((other) => (
				<p key={other.id} className="election-next">
					{t('then')} {other.label}: <strong>{pollDate(other.opensAt)}</strong>
				</p>
			))}
			<p className="election-foot">
				<a className="election-source" href={GENERAL_ELECTION.sourceUrl} target="_blank" rel="noreferrer">{GENERAL_ELECTION.sourceLabel} ↗</a>
				{guideHref ? <Link href={guideHref} className="election-guide">{t('electionGuide')} →</Link> : null}
			</p>
		</section>
	)
}
