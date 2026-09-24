'use client'

import Link from 'next/link'
import { useState } from 'react'
import { glyphPath } from '@/lib/graph/glyph'
import type { NodeType } from '@/lib/graph/types'

export interface ProseSegment {
	text: string
	href?: string
	tone?: string
	type?: NodeType
}

export interface ProseItem {
	id: string
	url: string
	segments: ProseSegment[]
}

export function Glyph({ type, tone, size = 11 }: { type: NodeType; tone?: string; size?: number }) {
	return (
		<svg viewBox="0 0 12 12" width={size} height={size} aria-hidden="true" className={`inline-glyph tone-${tone ?? 'executive'}`}>
			<path d={glyphPath(type, 6, 6, 4.6)} />
		</svg>
	)
}

/** Latest news as one running paragraph: entity names become links and each story gets a footnote. */
export function NewsProse({ items, collapsedCount = 4 }: { items: ProseItem[]; collapsedCount?: number }) {
	const [open, setOpen] = useState(false)
	const shown = open ? items : items.slice(0, collapsedCount)
	return (
		<>
			<p className={`news-prose ${open ? 'is-open' : ''}`}>
				{shown.map((item, index) => (
					<span key={item.id}>
						{item.segments.map((segment, part) =>
							segment.href ? (
								<Link key={part} href={segment.href} className="entity-chip">
									<Glyph type={segment.type ?? 'department'} tone={segment.tone} />
									<span>{segment.text}</span>
								</Link>
							) : (
								<span key={part}>{segment.text}</span>
							),
						)}
						<sup>
							<a href={item.url} target="_blank" rel="noreferrer" aria-label={`Source ${index + 1}`}>{index + 1}</a>
						</sup>{' '}
					</span>
				))}
			</p>
			{items.length > collapsedCount && (
				<button type="button" className="text-action" onClick={() => setOpen(!open)}>
					{open ? 'Show less' : 'Read more'}
				</button>
			)}
		</>
	)
}

export interface ConnectionCard {
	id: string
	name: string
	href: string
	type: NodeType
	tone: string
	note?: string
}

export function ConnectionGroup({ title, cards, limit = 6 }: { title: string; cards: ConnectionCard[]; limit?: number }) {
	const [all, setAll] = useState(false)
	if (!cards.length) return null
	const shown = all ? cards : cards.slice(0, limit)
	return (
		<section className="connection-group">
			<header>
				<h3>{title}</h3>
				<span>{cards.length}</span>
			</header>
			<ul>
				{shown.map((card) => (
					<li key={card.id}>
						<Link href={card.href}>
							<Glyph type={card.type} tone={card.tone} />
							<span>
								{card.name}
								{card.note ? <small>{card.note}</small> : null}
							</span>
						</Link>
					</li>
				))}
			</ul>
			{cards.length > limit && (
				<button type="button" className="text-action" onClick={() => setAll(!all)}>
					{all ? 'Show fewer' : `See all (${cards.length})`}
				</button>
			)}
		</section>
	)
}
