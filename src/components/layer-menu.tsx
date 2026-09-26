'use client'

import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const LAYERS = [
	{ id: 'federal', href: '/ng', label: 'Federal government', hint: 'Presidency, ministries, NASS, courts' },
	{ id: 'state', href: '/ng?layer=states', label: 'States & governors', hint: '36 states and the FCT by zone' },
] as const

/** "Nigeria ⌄": switches between the federal and state maps, and closes on choice, Escape or outside click. */
export function LayerMenu({ layer }: { layer: 'federal' | 'state' }) {
	const [open, setOpen] = useState(false)
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
				{layer === 'state' ? 'Nigeria · States' : 'Nigeria'} <ChevronDown size={14} />
			</button>
			{open && (
				<nav aria-label="Government layer" role="menu">
					{LAYERS.map((item) => (
						<Link key={item.id} href={item.href} role="menuitem" aria-current={layer === item.id ? 'page' : undefined} onClick={() => setOpen(false)}>
							<strong>{item.label}</strong>
							<small>{item.hint}</small>
						</Link>
					))}
				</nav>
			)}
		</div>
	)
}
