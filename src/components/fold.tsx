'use client'

import { Children, cloneElement, isValidElement, useState, type ReactElement, type ReactNode } from 'react'

/**
 * A long list that folds on portrait phones: the first `limit` items show, the rest wait behind a button.
 * Elsewhere every item shows and the button never appears (globals.css), so desktop reading is unchanged.
 * The folding is CSS on a data attribute, so the server renders the whole list and nothing shifts on load.
 */
export function Fold({
	as: Tag = 'ul',
	className,
	limit,
	showAll,
	children,
}: {
	as?: 'ul' | 'ol'
	className?: string
	limit: number
	/** The button's label while folded, e.g. "Show all 109 senators". */
	showAll: string
	children: ReactNode
}) {
	const [open, setOpen] = useState(false)
	const items = Children.toArray(children)
	const extra = items.length - limit
	return (
		<>
			<Tag className={`${className ?? ''} fold${open ? '' : ' is-folded'}`}>
				{items.map((item, index) =>
					index >= limit && isValidElement(item) ? cloneElement(item as ReactElement<Record<string, unknown>>, { 'data-fold-extra': '' }) : item,
				)}
			</Tag>
			{extra > 0 ? (
				<button type="button" className="fold-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
					{open ? 'Show fewer' : showAll}
				</button>
			) : null}
		</>
	)
}
