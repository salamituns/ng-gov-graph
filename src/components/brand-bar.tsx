import Link from 'next/link'
import { ChevronDown } from 'lucide-react'

export interface Crumb {
	label: string
	href?: string
}

/** "Govgraph / Nigeria ⌄ / Executive": the Nigeria menu switches between the federal and state maps. */
export function BrandBar({ crumbs = [], layer = 'federal' }: { crumbs?: Crumb[]; layer?: 'federal' | 'state' }) {
	return (
		<header className="brand-bar">
			<Link href="/ng" className="brand-home">
				<span className="brand-mark" aria-hidden="true">✳</span>
				<strong>Govgraph</strong>
			</Link>
			<span className="brand-slash">/</span>
			<details className="layer-menu">
				<summary aria-label="Choose government layer">
					{layer === 'state' ? 'Nigeria · States' : 'Nigeria'} <ChevronDown size={14} />
				</summary>
				<nav aria-label="Government layer">
					<Link href="/ng" aria-current={layer === 'federal' ? 'page' : undefined}>Federal government</Link>
					<Link href="/ng?layer=states" aria-current={layer === 'state' ? 'page' : undefined}>States &amp; governors</Link>
				</nav>
			</details>
			{crumbs.map((crumb) => (
				<span key={crumb.label} className="brand-crumb">
					<span className="brand-slash">/</span>
					{crumb.href ? <Link href={crumb.href}>{crumb.label}</Link> : <span>{crumb.label}</span>}
				</span>
			))}
		</header>
	)
}
