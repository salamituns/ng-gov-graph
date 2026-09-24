'use client'

import Link from 'next/link'
import { Search, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { nodePath } from '@/lib/graph/paths'
import { searchGraph } from '@/lib/graph/search'
import type { CompiledGraph } from '@/lib/graph/types'

export function GraphSearch({ gov, graph }: { gov: string; graph: CompiledGraph }) {
	const dialog = useRef<HTMLDialogElement>(null)
	const [query, setQuery] = useState('')
	const hits = searchGraph(graph, query).slice(0, 16)

	return <>
		<button className="icon-button" aria-label="Search graph" onClick={() => dialog.current?.showModal()}><Search size={20} /></button>
		<dialog ref={dialog} className="graph-search" aria-label="Search government graph" onClose={() => setQuery('')} onClick={event => { if (event.target === event.currentTarget) event.currentTarget.close() }}>
			<div className="graph-search-input"><Search size={20} /><input autoFocus aria-label="Search people, offices and agencies" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search people, offices, agencies…" /><button aria-label="Close search" onClick={() => dialog.current?.close()}><X size={20} /></button></div>
			{query.trim() && <div className="graph-search-results"><h2>Entities</h2>{hits.length ? <ul>{hits.map(node => <li key={node.id}><Link href={nodePath(gov, node)} onClick={() => dialog.current?.close()}><span className="graph-search-glyph" aria-hidden="true" /><span><strong>{node.name}</strong><small>{node.type.replaceAll('_', ' ')}{node.people[0] ? ` · ${node.people[0].name}` : ''}</small></span></Link></li>)}</ul> : <p>No matches. Try a person, office, or agency alias.</p>}</div>}
		</dialog>
	</>
}
