'use client'

import Link from 'next/link'
import { Search, X } from 'lucide-react'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Glyph } from '@/components/panel-client'
import { naira } from '@/data/nigeria/budget'
import { toneOf } from '@/lib/graph/layout'
import { nodePath } from '@/lib/graph/paths'
import { searchGraph } from '@/lib/graph/search'
import type { CompiledGraph, GraphNode } from '@/lib/graph/types'

/** Before the reader types: the bodies most people come looking for. */
const SUGGESTED = ['ng-president', 'ng-senate', 'ng-house-of-representatives', 'ng-inec', 'ng-cbn', 'ng-supreme-court']

/** The state the reader picked in "Who represents me?", remembered on this device. */
function myState() {
	try {
		return localStorage.getItem('govgraph:my-state')
	} catch {
		return null
	}
}
const noSubscribe = () => () => {}

function kind(node: GraphNode) {
	if (node.type === 'dept_head') return 'office'
	// The Presidency is one person's office; the chambers and assemblies are bodies.
	if (node.type === 'elected') return /Senate|House|Assembly/.test(node.name) ? 'elected body' : 'elected office'
	return node.type.replaceAll('_', ' ')
}

export function GraphSearch({ gov, graph, budgets = {} }: { gov: string; graph: CompiledGraph; budgets?: Record<string, number> }) {
	const dialog = useRef<HTMLDialogElement>(null)
	const [query, setQuery] = useState('')
	const hits = searchGraph(graph, query).slice(0, 16)
	const mine = useSyncExternalStore(noSubscribe, myState, () => null)
	const suggestions = [...(mine ? [mine] : []), ...SUGGESTED].map((id) => graph.nodes[id]).filter((node): node is GraphNode => Boolean(node))
	useEffect(() => {
		const open = (event: KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
				event.preventDefault()
				dialog.current?.showModal()
			}
		}
		window.addEventListener('keydown', open)
		return () => window.removeEventListener('keydown', open)
	}, [])

	const row = (node: GraphNode) => (
		<li key={node.id}>
			<Link href={nodePath(gov, node)} onClick={() => dialog.current?.close()}>
				<Glyph type={node.type} tone={toneOf(node)} size={14} />
				<span>
					<strong>{node.name}</strong>
					<small>
						{kind(node)}
						{node.people[0] ? ` · ${node.people[0].name}` : ''}
						{budgets[node.id] ? <span className="search-budget"> · {naira(budgets[node.id])}</span> : null}
					</small>
				</span>
			</Link>
		</li>
	)

	return <>
		<button className="icon-button" aria-label="Search graph (⌘K)" title="Search (⌘K)" onClick={() => dialog.current?.showModal()}><Search size={20} /></button>
		<dialog ref={dialog} className="graph-search" aria-label="Search government graph" onClose={() => setQuery('')} onClick={event => { if (event.target === event.currentTarget) event.currentTarget.close() }}>
			<div className="graph-search-input">
				<Search size={20} />
				<input autoFocus type="search" enterKeyHint="search" aria-label="Search people, offices and agencies" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search people, offices, agencies…" />
				<button type="button" aria-label="Close search" onClick={() => dialog.current?.close()}><X size={20} /></button>
			</div>
			{query.trim() ? (
				<div className="graph-search-results">
					<h2>Results</h2>
					{hits.length ? <ul>{hits.map(row)}</ul> : <p>No matches. Try a person, an office, or an agency’s short name, such as EFCC.</p>}
				</div>
			) : (
				<div className="graph-search-results">
					<h2>Suggestions</h2>
					<ul>{suggestions.map(row)}</ul>
				</div>
			)}
		</dialog>
	</>
}
