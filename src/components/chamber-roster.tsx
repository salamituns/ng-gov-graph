import Link from 'next/link'
import Image from 'next/image'
import type { ChamberRoster } from '@/lib/graph/roster'

export function ChamberRosterList({
	gov,
	roster,
}: {
	gov: string
	roster: ChamberRoster
}) {
	const vacant = roster.seats.filter((seat) => !seat.person).length
	const groups: Array<{ state: string; seats: ChamberRoster['seats'] }> = []
	for (const seat of roster.seats) {
		const last = groups.at(-1)
		if (last && last.state === seat.stateName) {
			last.seats.push(seat)
		} else {
			groups.push({ state: seat.stateName, seats: [seat] })
		}
	}
	return (
		<section className="detail-roster">
			<div className="detail-roster-heading"><h2>{roster.kind === 'senate' ? 'Senators' : 'Representatives'}</h2><span>{roster.seats.length} seats · {vacant} without sourced officeholder</span></div>
			<ul className="detail-roster-groups">
				{groups.map((group) => (
					<li key={group.state}>
						<h3>{group.state}</h3>
						<ul className="detail-roster-grid">
							{group.seats.map((seat) => (
								<li key={seat.id}>
									<Link
										href={`/${gov}/dept-heads/${seat.id}`}
										className="detail-roster-card"
									>
										{seat.person?.imageUrl ? (
											<Image
												src={seat.person.imageUrl}
												alt=""
												width={36}
												height={36}
												className="size-9 rounded-full object-cover"
												unoptimized
											/>
										) : (
											<span className="detail-roster-empty" />
										)}
										<span className="min-w-0">
											<p>{seat.person?.name ?? 'Vacant'}</p>
											<p>
												{seat.name}
												{seat.person?.party ? ` · ${seat.person.party}` : ''}
											</p>
										</span>
									</Link>
								</li>
							))}
						</ul>
					</li>
				))}
			</ul>
		</section>
	)
}
