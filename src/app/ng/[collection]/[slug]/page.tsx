import Link from 'next/link'
import Image from 'next/image'
import { notFound, permanentRedirect } from 'next/navigation'
import { ChamberRosterList } from '@/components/chamber-roster'
import { NodeList } from '@/components/explorer'
import { GraphMap } from '@/components/graph-map'
import { GraphSearch } from '@/components/graph-search'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { nodePath } from '@/lib/graph/paths'
import { getNode, loadNigeriaGraph } from '@/lib/graph/nigeria'
import { newsForEntity } from '@/lib/graph/feed'
import { chamberRoster } from '@/lib/graph/roster'
import type { NodeType } from '@/lib/graph/types'

const COLLECTIONS: Record<string, NodeType[]> = {
	departments: ['department'],
	elected: ['elected'],
	commissions: ['commission'],
	advisories: ['advisory'],
	'dept-heads': ['dept_head'],
	courts: ['court'],
	corporations: ['corporation'],
	states: ['state'],
}

interface PageProps {
	params: Promise<{ collection: string; slug: string }>
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: PageProps) {
	const { slug } = await params
	const node = getNode((await loadNigeriaGraph()).graph, slug)
	return {
		title: node ? `Govgraph · ${node.name}` : 'Govgraph · Nigeria',
		description: node?.description,
	}
}

export default async function EntityPage({ params }: PageProps) {
	const { collection, slug } = await params
	if (collection === 'departments' && slug === 'ng-osgf') {
		permanentRedirect('/ng/departments/ng-office-of-sgf')
	}
	const allowed = COLLECTIONS[collection]
	const { gov, graph, news } = await loadNigeriaGraph()
	const node = getNode(graph, slug)
	if (!allowed || !node || !allowed.includes(node.type)) {
		notFound()
	}

	const connected = node.connectedNodes
		.map((id) => graph.nodes[id])
		.filter(Boolean)
	const roster = chamberRoster(graph, node.id)
	const related = roster
		? connected.filter(
				(item) =>
					!item.id.startsWith('ng-senator-') && !item.id.startsWith('ng-rep-'),
			)
		: connected
	const holder = node.people[0]
	const parent = node.parentId ? graph.nodes[node.parentId] : undefined
	const stories = newsForEntity(news, [
		node.id,
		...Object.values(graph.nodes)
			.filter((item) => item.parentId === node.id)
			.map((item) => item.id),
	])
	return (
		<div className="detail-page">
			<article className="detail-panel">
				<p className="detail-brand">
					<span className="brand-mark">✳</span>
					<Link href="/ng">Govgraph</Link>
					{' / '}
					Nigeria
					{parent ? (
						<>
							{' / '}
							<Link href={nodePath(gov, parent)} className="hover:underline">
								{parent.name}
							</Link>
						</>
					) : null}
				</p>
				<div className="detail-intro">
					<Badge variant="outline" className="detail-badge capitalize">
						{node.sector ?? node.type.replace('_', ' ')}
					</Badge>
					<h1>{node.name}</h1>
				</div>
				<p className="detail-description">{node.description}</p>
				<div className="detail-sources">
					{node.legalSourceUrl ? (
						<a href={node.legalSourceUrl}>Source</a>
					) : null}
					{node.officialUrl ? (
						<a href={node.officialUrl}>Official website</a>
					) : null}
				</div>
				{holder ? (
					<div className="detail-holder">
						{holder.imageUrl ? (
							<Image
								src={holder.imageUrl}
								alt=""
								width={64}
								height={64}
								className="size-14 rounded-md object-cover"
								unoptimized
							/>
						) : null}
						<div>
							<p className="detail-eyebrow">Current officeholder</p>
							<p className="detail-holder-name">{holder.name}</p>
							<p className="detail-holder-meta">
								{holder.acting ? 'Acting · ' : ''}
								{holder.appointedYear
									? `Since ${holder.appointedYear}`
									: 'Incumbent'}
								{holder.party ? ` · ${holder.party}` : ''}
							</p>
						</div>
					</div>
				) : node.head ? (
					<div className="detail-holder detail-vacant">
						No current officeholder is recorded for this seat.
					</div>
				) : null}
				<Tabs defaultValue="news" className="detail-tabs">
					<TabsList aria-label="Entity information">
						<TabsTrigger value="news">News</TabsTrigger>
						<TabsTrigger value="connections">Who’s connected?{related.length ? ` (${related.length})` : ''}</TabsTrigger>
					</TabsList>
					<TabsContent value="news" className="detail-tab-content">
						{stories.length === 0 ? <p className="muted-copy">No sourced headlines name this entity yet.</p> : <ul className="detail-stories">{stories.map(item => <li key={item.id}><a href={item.url} target="_blank" rel="noreferrer">{item.summary.replace(/<[^>]+>/g, '')}</a><p>{item.publishedAt ? `${item.publishedAt} · ` : ''}{item.publication}</p></li>)}</ul>}
					</TabsContent>
					<TabsContent value="connections" className="detail-tab-content detail-connections">
						<NodeList gov={gov} nodes={related} />
					</TabsContent>
				</Tabs>
				{roster ? <ChamberRosterList gov={gov} roster={roster} /> : null}
			</article>
			<div className="detail-map">
				<div className="detail-map-toolbar"><GraphSearch gov={gov} graph={graph} /></div>
				<GraphMap
					gov={gov}
					graph={graph}
					selectedId={node.type === 'dept_head' ? parent?.id : node.id}
					mode="orgs"
				/>
			</div>
		</div>
	)
}
