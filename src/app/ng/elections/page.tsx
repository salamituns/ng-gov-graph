import Link from 'next/link'
import { BrandBar } from '@/components/brand-bar'
import { ElectionCountdown } from '@/components/election-countdown'
import { GENERAL_ELECTION, MILESTONES, OFF_CYCLE, VOTER_LINKS } from '@/data/nigeria/elections'
import { loadNigeriaGraph } from '@/lib/graph/nigeria'
import { nodePath, representPath } from '@/lib/graph/paths'

export const metadata = { title: 'Nigeria Decides 2027 · Who Runs Naija' }

function day(iso: string) {
	return new Date(`${iso}T12:00:00+01:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' })
}

function month(iso: string) {
	return new Date(`${iso}-15T12:00:00+01:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'Africa/Lagos' })
}

export default async function ElectionsPage() {
	const { gov, graph } = await loadNigeriaGraph()
	const now = new Date()
	// Lagos date, so a milestone turns "done" at midnight in Nigeria, not UTC.
	const today = now.toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' })
	const nextIndex = MILESTONES.findIndex((item) => (item.ends ?? item.starts) >= today)
	const inec = graph.nodes['ng-inec']

	return (
		<>
			<BrandBar crumbs={[{ label: 'Nigeria Decides 2027' }]} />
			<article className="panel-card entity-card">
				<p className="represent-zone">Nigeria Decides 2027</p>
				<h1>Your guide to the 2027 elections</h1>
				<p className="entity-description">
					Two polling days: the President and the National Assembly first, then governors and state assemblies three weeks later. Here is what happens before them, and what you need to vote.
				</p>
			</article>

			<ElectionCountdown serverNow={now.toISOString()} inecHref={inec ? nodePath(gov, inec) : '/ng'} />

			<section className="panel-card">
				<h2>Before you vote</h2>
				<ul className="voter-links">
					{VOTER_LINKS.map((link) => (
						<li key={link.id}>
							<a href={link.href} target="_blank" rel="noreferrer">
								<strong>{link.label} ↗</strong>
								<small>{link.detail}</small>
							</a>
						</li>
					))}
				</ul>
				<p className="muted-copy">
					Bring your PVC on polling day: you cannot vote without it. Registration for 2027 closed on 26 July 2026.
				</p>
			</section>

			<section className="panel-card">
				<h2>The road to polling day</h2>
				<ol className="milestones">
					{MILESTONES.map((item, index) => {
						const state = index < nextIndex || nextIndex === -1 ? 'is-done' : index === nextIndex ? 'is-next' : ''
						return (
							<li key={item.id} className={state}>
								<span className="milestone-date">{item.ends ? `${day(item.starts)} – ${day(item.ends)}` : day(item.starts)}</span>
								<strong>{item.label}</strong>
								{item.detail ? <small>{item.detail}</small> : null}
								<a href={item.sourceUrl} target="_blank" rel="noreferrer" className="milestone-source">source</a>
							</li>
						)
					})}
				</ol>
			</section>

			<section className="detail-roster">
				<div className="detail-roster-heading">
					<h2>Off-cycle governorship elections</h2>
					<span>8 states vote on their own calendar</span>
				</div>
				<p className="muted-copy">
					Court rulings and re-run elections in these states moved governors’ swearing-in dates, and a governor serves four years from the oath (s.180), so their elections no longer fall with the general poll. INEC fixes each date separately; the next ones are expected about four years after the last.
				</p>
				<ul className="offcycle-list">
					{[...OFF_CYCLE]
						.sort((a, b) => a.nextExpected.localeCompare(b.nextExpected) || a.stateId.localeCompare(b.stateId))
						.map((item) => {
							const state = graph.nodes[item.stateId]
							return (
								<li key={item.stateId}>
									<Link href={representPath(gov, item.stateId)} className="fc-state-name">{state?.name ?? item.stateId}</Link>
									<span>Next expected <strong>{month(item.nextExpected)}</strong></span>
									<small>
										Last held {day(item.lastPoll)} · <a href={item.sourceUrl} target="_blank" rel="noreferrer">source</a>
									</small>
								</li>
							)
						})}
				</ul>
			</section>

			<p className="panel-footer">
				Dates from <a href={GENERAL_ELECTION.sourceUrl} target="_blank" rel="noreferrer">{GENERAL_ELECTION.sourceLabel}</a> and INEC’s later notices. INEC can revise its timetable; we update this page when it does.
			</p>
		</>
	)
}
