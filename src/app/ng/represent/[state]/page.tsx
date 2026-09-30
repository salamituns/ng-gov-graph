import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BrandBar } from '@/components/brand-bar'
import { RepresentPicker } from '@/components/represent-picker'
import { STATE_ZONES } from '@/data/nigeria/states'
import { loadNigeriaGraph } from '@/lib/graph/nigeria'
import { nodePath, stateIdFromSlug } from '@/lib/graph/paths'
import { representativesFor } from '@/lib/graph/representatives'
import type { RosterSeat } from '@/lib/graph/roster'

interface PageProps {
	params: Promise<{ state: string }>
}

export async function generateMetadata({ params }: PageProps) {
	const { state } = await params
	const node = (await loadNigeriaGraph()).graph.nodes[stateIdFromSlug(state)]
	return { title: node ? `Govgraph · Who represents ${node.name}` : 'Govgraph · Who represents me?' }
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

/** Everyone who represents or governs one state, with the map turned to it. */
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
			<BrandBar layer="state" crumbs={[{ label: 'Who represents me?' }, { label: state.name, href: nodePath(gov, state) }]} />
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
				<ul className="detail-roster-grid represent-list">
					{representatives.map((seat) => <SeatCard key={seat.id} gov={gov} seat={seat} />)}
				</ul>
			</section>

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
