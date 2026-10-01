import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BrandBar } from '@/components/brand-bar'
import { Fold } from '@/components/fold'
import { RepresentPicker } from '@/components/represent-picker'
import { GENERAL_ELECTION, governorshipFor } from '@/data/nigeria/elections'
import { naira, perNigerian } from '@/data/nigeria/budget'
import { STATE_ZONES } from '@/data/nigeria/states'
import { ministriesOf, ministriesTotal } from '@/lib/graph/cabinet-budget'
import { federalCharacter, portfolioOf } from '@/lib/graph/federal-character'
import { loadNigeriaGraph } from '@/lib/graph/nigeria'
import { nodePath, representPath, stateIdFromSlug } from '@/lib/graph/paths'
import { representativesFor } from '@/lib/graph/representatives'
import type { RosterSeat } from '@/lib/graph/roster'
import type { CompiledGraph } from '@/lib/graph/types'

interface PageProps {
	params: Promise<{ state: string }>
}

export async function generateMetadata({ params }: PageProps) {
	const { state } = await params
	const node = (await loadNigeriaGraph()).graph.nodes[stateIdFromSlug(state)]
	return { title: node ? `Who represents ${node.name} · Who Runs Naija` : 'Who represents me? · Who Runs Naija' }
}

function initials(name: string) {
	return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('')
}

function SeatCard({ gov, seat }: { gov: string; seat: RosterSeat }) {
	return (
		<li>
			<Link href={`/${gov}/dept-heads/${seat.id}`} className="detail-roster-card">
				{seat.person?.imageUrl ? (
					<Image src={seat.person.imageUrl} alt="" width={36} height={36} className="size-9 rounded-full object-cover" unoptimized />
				) : (
					<span className="detail-roster-empty represent-initials">{seat.person ? initials(seat.person.name) : ''}</span>
				)}
				<span className="min-w-0">
					<p>{seat.person?.name ?? 'Vacant'}</p>
					<p>
						{seat.name.replace(/^(Senator|Member|Representative) for /, '')}
						{seat.person?.party ? ` · ${seat.person.party}` : ''}
					</p>
				</span>
			</Link>
		</li>
	)
}

function electionDay(iso: string) {
	return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' })
}

/** When this state's voters next go to the polls, and for what. */
function NextElections({ gov, stateId, stateName }: { gov: string; stateId: string; stateName: string }) {
	const [federal, state] = GENERAL_ELECTION.polls
	const governor = governorshipFor(stateId)
	const isFct = stateId === 'ng-fct'
	const rows = [
		{ what: isFct ? 'President, your senator and House members' : 'President, your senators and House members', when: electionDay(federal.opensAt) },
		...(governor
			? [{
					what: 'Governor',
					when: governor.offCycle
						? `Off-cycle: expected ${new Date(`${governor.nextExpected}-15T12:00:00+01:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`
						: electionDay(governor.opensAt),
				}]
			: []),
		...(isFct ? [] : [{ what: `${stateName} House of Assembly`, when: electionDay(state.opensAt) }]),
	]
	return (
		<section className="panel-card">
			<h2>Your next elections</h2>
			<ul className="next-elections">
				{rows.map((row) => (
					<li key={row.what}><span>{row.what}</span><span>{row.when}</span></li>
				))}
			</ul>
			{isFct ? <p className="muted-copy">The FCT has no governor or state assembly; its six area councils hold their own elections.</p> : null}
			<p className="muted-copy"><Link href={`/${gov}/elections`} className="entity-link">Your 2027 election guide</Link>: check your registration, collect your PVC, find your polling unit.</p>
		</section>
	)
}

/** Everyone who represents or governs one state, with the map turned to it. */
/** The state's place in the federal cabinet: its ministers, and what the ministries they serve in spend. */
function StateInCabinet({ gov, graph, stateId, stateName }: { gov: string; graph: CompiledGraph; stateId: string; stateName: string }) {
	const tally = federalCharacter(graph).states.find((item) => item.state.id === stateId)
	if (!tally) return null
	const slug = representPath(gov, stateId).split('/').pop()
	const money = ministriesTotal(tally.members.flatMap((member) => ministriesOf(graph, member)))
	return (
		<section className="detail-roster">
			<div className="detail-roster-heading">
				<h2>From {stateName} in the federal cabinet</h2>
				<span>{tally.members.length === 1 ? 'one minister' : `${tally.members.length} ministers`}</span>
			</div>
			{tally.members.length ? (
				<>
					<ul className="detail-roster-grid represent-list">
						{tally.members.map((member) => {
							const ministries = ministriesOf(graph, member)
							const budget = ministriesTotal(ministries).total
							return (
								<li key={member.person.name}>
									<Link href={nodePath(gov, member.seats[0])} className="detail-roster-card">
										{member.person.imageUrl ? (
											<Image src={member.person.imageUrl} alt="" width={36} height={36} className="size-9 rounded-full object-cover" unoptimized />
										) : (
											<span className="detail-roster-empty represent-initials">{initials(member.person.name)}</span>
										)}
										<span className="min-w-0">
											<p>{member.person.name}</p>
											<p>
												{portfolioOf(graph, member)}
												{budget ? ` · ${naira(budget)} budget` : ''}
											</p>
										</span>
									</Link>
								</li>
							)
						})}
					</ul>
					{!money.total && money.uncounted.length ? (
						<p className="muted-copy represent-money">
							{tally.members.length === 1 ? 'This minister serves' : 'They serve'} in {money.uncounted.join(' and ')}, which the Act funds outside a ministry line, so there is no ministry budget to show.
						</p>
					) : null}
					{money.total ? (
						<p className="muted-copy represent-money">
							{tally.members.length === 1 ? 'This minister serves' : 'They serve'} in ministries with <strong>{naira(money.total)}</strong> of the 2026 budget, about {perNigerian(money.total)} for every Nigerian
							{money.uncounted.length ? `, not counting ${money.uncounted.join(' and ')}, which the Act funds outside a ministry line` : ''}.
						</p>
					) : null}
				</>
			) : (
				<p className="fc-gap">No minister on record from {stateName}. Section 147(3) asks for at least one from every state.</p>
			)}
			<p className="muted-copy">
				<Link href={`/${gov}/federal-character?state=${slug}`} className="entity-link">Compare every state on the federal character map →</Link>
			</p>
		</section>
	)
}

export default async function RepresentPage({ params }: PageProps) {
	const { state: slug } = await params
	const { gov, graph } = await loadNigeriaGraph()
	const reps = representativesFor(graph, stateIdFromSlug(slug))
	if (!reps) notFound()
	const { state, leader, assembly, senators, representatives } = reps
	const states = Object.values(graph.nodes).filter((node) => node.type === 'state').map((node) => ({ id: node.id, name: node.name }))
	const isFct = state.id === 'ng-fct'
	return (
		<>
			<BrandBar layer="state" crumbs={[{ label: 'Who represents me?' }, { label: state.name.replace(/ State$/, ''), href: nodePath(gov, state) }]} />
			<article className="panel-card entity-card">
				<p className="represent-zone">{STATE_ZONES[state.id] ?? 'North Central'} zone</p>
				<h1>{isFct ? 'The Federal Capital Territory' : state.name}</h1>
				<p className="entity-description">
					{isFct
						? `Residents of the FCT elect one senator and ${representatives.length} ${representatives.length === 1 ? 'member' : 'members'} of the House of Representatives. The territory is run by a minister the President appoints, not an elected governor.`
						: `Residents of ${state.name} elect a governor, three senators, ${representatives.length} ${representatives.length === 1 ? 'member' : 'members'} of the House of Representatives, and the ${assembly?.name ?? 'State House of Assembly'}.`}
				</p>
				<p className="entity-seat-title">{leader.seat?.name ?? (isFct ? 'Minister of the FCT' : 'Governor')}{leader.elected ? '' : ' · appointed, not elected'}</p>
				{leader.person ? (
					<Link href={leader.seat ? nodePath(gov, leader.seat) : nodePath(gov, state)} className="holder-card">
						{leader.person.imageUrl ? (
							<Image src={leader.person.imageUrl} alt="" width={48} height={48} className="holder-portrait" unoptimized />
						) : (
							<span className="holder-portrait holder-initials">{initials(leader.person.name)}</span>
						)}
						<span>
							<strong>{leader.person.name}</strong>
							<small>
								{leader.person.appointedYear ? `${leader.elected ? 'Since' : 'Appointed'} ${leader.person.appointedYear}` : 'Incumbent'}
								{leader.person.party ? ` · ${leader.person.party}` : ''}
							</small>
						</span>
					</Link>
				) : null}
			</article>

			<NextElections gov={gov} stateId={state.id} stateName={state.name} />

			<section className="detail-roster">
				<div className="detail-roster-heading">
					<h2>Your {senators.length === 1 ? 'senator' : 'senators'}</h2>
					<span>{senators.length === 1 ? 'one seat for the FCT' : 'three per state'}</span>
				</div>
				<ul className="detail-roster-grid represent-list">
					{senators.map((seat) => <SeatCard key={seat.id} gov={gov} seat={seat} />)}
				</ul>
			</section>

			<section className="detail-roster">
				<div className="detail-roster-heading">
					<h2>Your members of the House of Representatives</h2>
					<span>{representatives.length} federal constituencies</span>
				</div>
				<Fold className="detail-roster-grid represent-list" limit={10} showAll={`Show all ${representatives.length} members`}>
					{representatives.map((seat) => <SeatCard key={seat.id} gov={gov} seat={seat} />)}
				</Fold>
			</section>

			<StateInCabinet gov={gov} graph={graph} stateId={state.id} stateName={isFct ? 'the FCT' : state.name} />

			{assembly ? (
				<section className="panel-card">
					<h2>Your state legislature</h2>
					<p className="muted-copy">
						<Link href={nodePath(gov, assembly)} className="entity-link">{assembly.name}</Link> makes laws for the state and approves its budget.
					</p>
				</section>
			) : null}

			<RepresentPicker gov={gov} states={states} compact />
		</>
	)
}
