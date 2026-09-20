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
		<section>
			<h2 className="mb-2 font-[family-name:var(--font-heading)] text-lg text-accent">
				{roster.kind === 'senate' ? 'Senators' : 'Representatives'}
			</h2>
			<p className="mb-3 text-sm text-muted-foreground">
				{roster.seats.length} seats · {vacant} vacant on the NASS roll
			</p>
			<ul className="max-h-[70vh] overflow-y-auto rounded-lg border bg-card">
				{groups.map((group) => (
					<li key={group.state}>
						<p className="sticky top-0 bg-secondary px-3 py-1 text-xs uppercase tracking-wider text-muted-foreground">
							{group.state}
						</p>
						<ul>
							{group.seats.map((seat) => (
								<li key={seat.id}>
									<Link
										href={`/${gov}/dept-heads/${seat.id}`}
										className="flex items-center gap-3 px-3 py-2 hover:bg-secondary"
									>
										{seat.person?.imageUrl ? (
											<Image
												src={seat.person.imageUrl}
												alt=""
												width={32}
												height={32}
												className="size-8 rounded-full object-cover"
												unoptimized
											/>
										) : (
											<span className="size-8 rounded-full bg-muted" />
										)}
										<span className="min-w-0">
											<p className="truncate text-sm">{seat.name}</p>
											<p className="truncate text-xs text-muted-foreground">
												{seat.person?.name ?? 'Vacant'}
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
