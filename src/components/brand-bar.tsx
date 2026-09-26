import Link from 'next/link'
import { LayerMenu } from '@/components/layer-menu'
import { NigeriaMark } from '@/components/nigeria-mark'

export interface Crumb {
	label: string
	href?: string
}

/** "Govgraph / Nigeria ⌄ / Executive": the Nigeria menu switches between the federal and state maps. */
export function BrandBar({ crumbs = [], layer = 'federal' }: { crumbs?: Crumb[]; layer?: 'federal' | 'state' }) {
	return (
		<header className="brand-bar">
			<Link href="/ng" className="brand-home">
				<span className="brand-mark"><NigeriaMark /></span>
				<strong>Govgraph</strong>
			</Link>
			<span className="brand-slash">/</span>
			<LayerMenu layer={layer} />
			{crumbs.map((crumb) => (
				<span key={crumb.label} className="brand-crumb">
					<span className="brand-slash">/</span>
					{crumb.href ? <Link href={crumb.href}>{crumb.label}</Link> : <span>{crumb.label}</span>}
				</span>
			))}
		</header>
	)
}
