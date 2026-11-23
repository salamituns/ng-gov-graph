import type { ReactNode } from 'react'
import { isFlaggedUrl } from '@/lib/flagged-links'

/**
 * An external source link that is withheld when its site is flagged as dangerous: the label stays,
 * so readers still see what the record cites, but nothing sends them to the flagged page.
 */
export function SourceLink({ href, className, children, ...rest }: { href: string; className?: string; children: ReactNode; 'aria-label'?: string }) {
	if (isFlaggedUrl(href)) {
		return (
			<span className={className} title="Link withheld: a security filter flagged this site as unsafe">
				{children} (link withheld: site flagged as unsafe)
			</span>
		)
	}
	return (
		<a href={href} className={className} target="_blank" rel="noreferrer" {...rest}>
			{children}
		</a>
	)
}
