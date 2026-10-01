import Link from 'next/link'
import { BrandBar } from '@/components/brand-bar'
import { CabinetExplorer, type ExplorerState } from '@/components/cabinet-explorer'
import { NIGERIA_MAP } from '@/data/nigeria/map-shapes'
import { federalCharacter, type CabinetMember } from '@/lib/graph/federal-character'
import { loadNigeriaGraph } from '@/lib/graph/nigeria'
import { nodePath, representPath } from '@/lib/graph/paths'

export const metadata = { title: 'Federal character · Who Runs Naija' }

const CONSTITUTION = 'https://www.constituteproject.org/constitution/Nigeria_2011'

/** Ministry name, without the "Federal Ministry of" preamble, for a short portfolio line. */
function portfolio(member: CabinetMember, graph: Awaited<ReturnType<typeof loadNigeriaGraph>>['graph']) {
	return member.seats
		.map((seat) => {
			const ministry = seat.parentId ? graph.nodes[seat.parentId] : undefined
			const area = (ministry?.name ?? seat.name).replace(/^(Federal )?Ministry of (the )?/, '')
			if (seat.id === 'ng-attorney-general') return 'Attorney-General and Justice'
			return seat.id.startsWith('ng-minister-of-state-') ? `${area} (State)` : area
		})
		.join(' · ')
}

export default async function FederalCharacterPage() {
	const { gov, graph } = await loadNigeriaGraph()
	const report = federalCharacter(graph)
	const total = report.members.length
	const covered = report.states.length - report.uncovered.length
	const hometownOnly = report.members.filter((member) => member.origin?.basis === 'hometown').length
	// The explorer gets only what it shows: the graph stays on the server.
	const states: ExplorerState[] = report.states.map((tally) => ({
		id: tally.state.id,
		slug: representPath(gov, tally.state.id).split('/').pop()!,
		name: tally.state.name,
		zone: tally.zone,
		representHref: representPath(gov, tally.state.id),
		ministers: tally.members.map((member) => ({
			name: member.person.name,
			href: nodePath(gov, member.seats[0]),
			portfolio: portfolio(member, graph),
			imageUrl: member.person.imageUrl,
			hometown: member.origin?.basis === 'hometown',
		})),
	}))
	const zones = report.zones.map((zone) => ({ zone: zone.zone, slug: zone.zone.toLowerCase().replace(/\s+/g, '-'), states: zone.states, ministers: zone.members.length }))

	return (
		<>
			<BrandBar crumbs={[{ label: 'Federal character' }]} />
			<article className="panel-card entity-card">
				<p className="represent-zone">Constitution · sections 14(3) and 147(3)</p>
				<h1>Federal character</h1>
				<p className="entity-description">
					The Constitution says the Federal Government must reflect the country’s diversity, so that no few states or ethnic groups dominate it. For the cabinet this is concrete: the President must appoint at least one minister from each of the 36 states.
				</p>
				<div className="fc-headline">
					<p>
						<strong>{covered}</strong> of {report.states.length}
						<span>states and the FCT have a minister</span>
					</p>
					<p>
						<strong>{total}</strong>
						<span>ministers, ministers of state and the Attorney-General</span>
					</p>
				</div>
				{report.uncovered.length ? (
					<p className="fc-gap">
						No minister on record from {report.uncovered.map((state) => state.name).join(', ')}.
					</p>
				) : null}
				<p className="muted-copy">
					Read the text: <a className="entity-link" href={`${CONSTITUTION}#s14`} target="_blank" rel="noreferrer">section 14(3)</a> and{' '}
					<a className="entity-link" href={`${CONSTITUTION}#s147`} target="_blank" rel="noreferrer">section 147(3)</a>.
				</p>
			</article>

			<CabinetExplorer states={states} zones={zones} shapes={NIGERIA_MAP.states} width={NIGERIA_MAP.width} height={NIGERIA_MAP.height} />

			<section className="detail-roster">
				<div className="detail-roster-heading">
					<h2>State by state</h2>
					<span>where each minister was nominated from</span>
				</div>
				<div className="detail-roster-groups">
					{report.zones.map((zone) => (
						<div key={zone.zone}>
							<h3>{zone.zone}</h3>
							<ul className="fc-states">
								{report.states
									.filter((tally) => tally.zone === zone.zone)
									.map((tally) => (
										<li key={tally.state.id}>
											<Link href={representPath(gov, tally.state.id)} className="fc-state-name">{tally.state.name}</Link>
											{tally.members.length ? (
												<ul>
													{tally.members.map((member) => (
														<li key={member.person.name}>
															<Link href={nodePath(gov, member.seats[0])} className="entity-link">{member.person.name}</Link>
															{member.origin?.basis === 'hometown' ? <sup title="State taken from the minister’s hometown, not a nomination report">†</sup> : null}
															<small>
																{portfolio(member, graph)}
																{member.origin ? <> · <a href={member.origin.sourceUrl} target="_blank" rel="noreferrer">source</a></> : null}
															</small>
														</li>
													))}
												</ul>
											) : (
												<p className="fc-gap">No minister on record</p>
											)}
										</li>
									))}
							</ul>
						</div>
					))}
				</div>
				<p className="muted-copy">
					Each state comes from the nomination or Senate screening report{hometownOnly ? `, except ${hometownOnly} marked †, which use the minister’s recorded hometown` : ''}. The President, who also holds the Petroleum portfolio, is not counted.
				</p>
			</section>
		</>
	)
}
