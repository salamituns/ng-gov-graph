'use client'

import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useT } from '@/components/lang'

const LAYERS = [
	{ id: 'federal', href: '/ng', label: 'layerFederal', hint: 'layerFederalHint' },
	{ id: 'state', href: '/ng?layer=states', label: 'layerState', hint: 'layerStateHint' },
] as const

/** The civic pages, reachable from the menu on every page. */
const EXPLORE = [
	{ href: '/ng#represent', label: 'whoRepresents', hint: 'representHint' },
	{ href: '/ng/elections', label: 'electionGuide' },
	{ href: '/ng/budget', label: 'budgetTitle' },
	{ href: '/ng/federal-character', label: 'federalCharacter' },
] as const

/** "Nigeria ⌄": switches between the federal and state maps, and closes on choice, Escape or outside click. */
export function LayerMenu({ layer }: { layer: 'federal' | 'state' }) {
	const [open, setOpen] = useState(false)
	const { t } = useT()
	const root = useRef<HTMLDivElement>(null)
	useEffect(() => {
		if (!open) return
		const close = (event: MouseEvent | KeyboardEvent) => {
			if (event instanceof KeyboardEvent ? event.key === 'Escape' : !root.current?.contains(event.target as Node)) setOpen(false)
		}
		document.addEventListener('mousedown', close)
		document.addEventListener('keydown', close)
		return () => {
			document.removeEventListener('mousedown', close)
			document.removeEventListener('keydown', close)
		}
	}, [open])
	return (
		<div className="layer-menu" ref={root}>
			<button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
				<span className="flag-chip" aria-hidden="true"><span /><span /><span /></span>
				{layer === 'state' ? <span><span className="layer-country">Nigeria · </span>States</span> : 'Nigeria'} <ChevronDown size={14} />
			</button>
			{/* On phones the menu is a bottom sheet over a dimmed map; tapping the backdrop closes it. */}
			{open && <div className="layer-menu-backdrop" aria-hidden="true" onClick={() => setOpen(false)} />}
			{open && (
				<nav aria-label="Government layer" role="menu">
					<p className="layer-menu-title" role="presentation">Nigeria</p>
					{LAYERS.map((item) => (
						<Link key={item.id} href={item.href} role="menuitem" aria-current={layer === item.id ? 'page' : undefined} onClick={() => setOpen(false)}>
							<strong>{t(item.label)}</strong>
							<small>{t(item.hint)}</small>
						</Link>
					))}
					<p className="layer-menu-heading" role="presentation">{t('explore')}</p>
					{EXPLORE.map((item) => (
						<Link
							key={item.href}
							href={item.href}
							role="menuitem"
							onClick={() => {
								setOpen(false)
								// A home section (#represent) changes only the hash: tell the phone sheet to show it.
								if (item.href.includes('#')) window.dispatchEvent(new CustomEvent('govgraph:open-panel', { detail: 'half' }))
							}}
						>
							<strong>{t(item.label)}</strong>
							{'hint' in item ? <small>{t(item.hint)}</small> : null}
						</Link>
					))}
				</nav>
			)}
		</div>
	)
}
