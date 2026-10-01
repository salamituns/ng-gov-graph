'use client'

import Link from 'next/link'
import { Banknote, MapPin, Scale, Vote } from 'lucide-react'
import { useT } from '@/components/lang'

/**
 * Portrait phones: the home sheet opens on the four things most people come for, so they show even while
 * the sheet only peeks. Desktop has these as full cards in the panel and never shows this row.
 */
export function QuickActions({ gov }: { gov: string }) {
	const { t } = useT()
	const actions = [
		{ href: `/${gov}#represent`, label: t('whoRepresents'), icon: MapPin, hash: true },
		{ href: `/${gov}/elections`, label: t('electionGuide'), icon: Vote },
		{ href: `/${gov}/budget`, label: t('budgetTitle'), icon: Banknote },
		{ href: `/${gov}/federal-character`, label: t('federalCharacter'), icon: Scale },
	]
	return (
		<nav className="quick-actions" aria-label={t('explore')}>
			{actions.map(({ href, label, icon: Icon, hash }) => (
				<Link
					key={href}
					href={href}
					// The section link lets Next scroll to #represent inside the sheet; page links start at their top.
					scroll={hash ? undefined : false}
					// A home section changes only the URL's hash, so the sheet is asked to rise and show it.
					onClick={hash ? () => window.dispatchEvent(new CustomEvent('govgraph:open-panel', { detail: 'half' })) : undefined}
				>
					<Icon size={20} aria-hidden="true" />
					<span>{label}</span>
				</Link>
			))}
		</nav>
	)
}
