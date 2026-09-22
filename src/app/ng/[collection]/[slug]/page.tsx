import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { ChamberRosterList } from '@/components/chamber-roster'
import { NodeList } from '@/components/explorer'
import { GraphMap } from '@/components/graph-map'
import { Badge } from '@/components/ui/badge'
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

export async function generateStaticParams() {
	const { graph } = await loadNigeriaGraph()
	return Object.values(graph.nodes).flatMap((node) => {
		const collection = Object.entries(COLLECTIONS).find(([, types]) =>
			types.includes(node.type),
		)?.[0]
		if (!collection) {
			return []
		}
		return [{ collection, slug: node.id }]
	})
}

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
						<a href={node.legalSourceUrl}>Legal source</a>
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
				) : (
					<div className="detail-holder detail-vacant">
						Seat vacant — no current officeholder on record.
					</div>
				)}
				<section className="detail-section">
					<h2>News</h2>
					{stories.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							No headlines in the civic feed name this office yet.
						</p>
					) : (
						<ul className="detail-stories">
							{stories.map((item) => (
								<li key={item.id}>
									<a href={item.url} className="hover:underline">
											{item.summary.replace(/<[^>]+>/g, '')}
									</a>
									<p className="mt-1 text-xs text-muted-foreground">
										{item.publishedAt ? `${item.publishedAt} · ` : ''}
										{item.publication}
									</p>
								</li>
							))}
						</ul>
					)}
				</section>
				{roster ? <ChamberRosterList gov={gov} roster={roster} /> : null}
				<section className="detail-section detail-connections">
					<h2>Who is connected?</h2>
					<NodeList gov={gov} nodes={related} />
				</section>
			</article>
			<div className="detail-map">
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
