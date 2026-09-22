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
import { neighborhood } from '@/lib/graph/neighborhood'
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
	const localGraph = neighborhood(graph, node.id)

	return (
		<div className="grid min-h-screen grid-cols-1 lg:grid-cols-[minmax(360px,40%)_1fr]">
			<article className="space-y-6 p-5 lg:p-6">
				<p className="text-sm text-muted-foreground">
					<Link href="/ng" className="text-primary hover:underline">
						Govgraph
					</Link>
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
				<div>
					<Badge variant="outline" className="mb-2 capitalize">
						{node.sector ?? node.type.replace('_', ' ')}
					</Badge>
					<h1 className="font-[family-name:var(--font-heading)] text-3xl text-accent">
						{node.name}
					</h1>
				</div>
				<p className="leading-relaxed text-pretty">{node.description}</p>
				<div className="flex flex-wrap gap-3 text-sm">
					{node.legalSourceUrl ? (
						<a href={node.legalSourceUrl} className="text-primary hover:underline">
							Legal source
						</a>
					) : null}
					{node.officialUrl ? (
						<a href={node.officialUrl} className="text-primary hover:underline">
							Official website
						</a>
					) : null}
				</div>
				{holder ? (
					<div className="flex gap-4 rounded-xl border bg-card p-4">
						{holder.imageUrl ? (
							<Image
								src={holder.imageUrl}
								alt=""
								width={64}
								height={64}
								className="size-16 rounded-full object-cover"
								unoptimized
							/>
						) : null}
						<div>
							<p className="text-xs uppercase tracking-wider text-muted-foreground">
								Current officeholder
							</p>
							<p className="mt-1 text-xl">{holder.name}</p>
							<p className="text-sm text-muted-foreground">
								{holder.acting ? 'Acting · ' : ''}
								{holder.appointedYear ? `Since ${holder.appointedYear}` : 'Incumbent'}
								{holder.party ? ` · ${holder.party}` : ''}
							</p>
						</div>
					</div>
				) : (
					<div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
						Seat vacant — no current officeholder on record.
					</div>
				)}
				<section>
					<h2 className="mb-2 font-[family-name:var(--font-heading)] text-lg text-accent">
						News
					</h2>
					{stories.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							No headlines in the civic feed name this office yet.
						</p>
					) : (
						<ul className="space-y-3">
							{stories.map((item) => (
								<li key={item.id} className="rounded-lg border bg-card p-3 text-sm">
									<a href={item.url} className="hover:underline">
										{item.summary}
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
				<section>
					<h2 className="mb-2 font-[family-name:var(--font-heading)] text-lg text-accent">
						Who is connected?
					</h2>
					<NodeList gov={gov} nodes={related} />
				</section>
			</article>
			<div className="p-4 lg:p-5">
				<GraphMap
					gov={gov}
					graph={localGraph}
					selectedId={node.id}
					mode={roster ? 'chamber' : 'orgs'}
				/>
			</div>
		</div>
	)
}
