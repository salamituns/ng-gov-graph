import Link from 'next/link'
import { BrandBar } from '@/components/brand-bar'

/** Shown inside the map's layout for any unknown office, body or state, with a real 404 status. */
export default function NotFound() {
	return (
		<>
			<BrandBar crumbs={[{ label: 'Not found' }]} />
			<article className="panel-card entity-card">
				<p className="represent-zone">404</p>
				<h1>We can’t find that page</h1>
				<p className="entity-description">
					The office or body may have been renamed, merged or wound up, or the link may be mistyped. Search the map above, or start from one of these.
				</p>
				<ul className="not-found-links">
					<li><Link href="/ng" className="entity-link">The federal government</Link></li>
					<li><Link href="/ng?layer=states" className="entity-link">States and governors</Link></li>
					<li><Link href="/ng/elections" className="entity-link">The 2027 election guide</Link></li>
					<li><Link href="/ng/budget" className="entity-link">Where the 2026 budget goes</Link></li>
				</ul>
			</article>
		</>
	)
}
