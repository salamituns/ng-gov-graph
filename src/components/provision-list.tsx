'use client'

import { useState } from 'react'
import { provisionUrl, type Provision } from '@/data/nigeria/constitution'

/** How many provisions show in full before the rest fold away. */
const SHOWN = 2

/**
 * The provisions behind an entity's links, in reading order (how the office is filled comes first).
 * A busy office such as the Presidency has more than a dozen, which would push the rest of its page far
 * down, so only the first two show in full; the rest appear as citations, and open in place on request.
 */
export function ProvisionList({ provisions }: { provisions: Provision[] }) {
	const [open, setOpen] = useState(false)
	const shown = open ? provisions : provisions.slice(0, SHOWN)
	const hidden = provisions.slice(SHOWN)
	return (
		<>
			<ul>
				{shown.map((provision) => (
					// The citation alone cannot key this list: two provisions can cite the same section
					// (s.171 grounds both the Secretary to the Government of the Federation and the Head
					// of the Civil Service, and three provisions cite s.153, Third Schedule). Each entry
					// is deduplicated by object upstream, so its own words tell same-cited ones apart.
					<li key={`${provision.cite} ${provision.text}`}>
						<a href={provisionUrl(provision)} target="_blank" rel="noreferrer" className="constitution-cite">{provision.cite}</a>
						<p>{provision.text}</p>
					</li>
				))}
			</ul>
			{hidden.length ? (
				<div className="constitution-more">
					{open ? null : (
						<p className="constitution-more-cites" aria-hidden="true">
							{/* Two provisions can share a citation; the row names each section once. */}
							{[...new Set(hidden.map((provision) => provision.cite))].map((cite) => <span key={cite}>{cite}</span>)}
						</p>
					)}
					<button type="button" className="text-action" aria-expanded={open} onClick={() => setOpen(!open)}>
						{open ? 'Show fewer' : `Show all ${provisions.length} provisions`}
					</button>
				</div>
			) : null}
		</>
	)
}
