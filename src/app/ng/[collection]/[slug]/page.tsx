import Image from 'next/image'
import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'
import { BrandBar, type Crumb } from '@/components/brand-bar'
import { ElectionCountdown } from '@/components/election-countdown'
import { GENERAL_ELECTION } from '@/data/nigeria/elections'
import { ChamberRosterList } from '@/components/chamber-roster'
import { ConnectionGroup, Glyph, StoryImage, type ConnectionCard } from '@/components/panel-client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { authorityChain, descendantsOf, organizationOf } from '@/lib/graph/authority'
import { newsForEntity } from '@/lib/graph/feed'
import { toneOf } from '@/lib/graph/layout'
import { decodeHtml, newsHeadline } from '@/lib/graph/news-text'
import { getNode, loadNigeriaGraph } from '@/lib/graph/nigeria'
import { nodePath } from '@/lib/graph/paths'
import { chamberRoster } from '@/lib/graph/roster'
import type { CompiledGraph, GraphNode, NodeType } from '@/lib/graph/types'
import { MINISTER_ORIGINS } from '@/data/nigeria/origins'
import { STATE_ZONES } from '@/data/nigeria/states'
import { isCabinetSeat } from '@/lib/graph/cabinet'
import { CONSTITUTION_URL, provisionUrl, type Provision } from '@/data/nigeria/constitution'
import { provisionsFor } from '@/lib/graph/constitution'
import { BudgetCard } from '@/components/budget-card'

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

const SECTOR_LABEL: Record<string, string> = {
	executive: 'Executive',
	legislative: 'Legislative',
	judicial: 'Judicial',
	independent: 'Independent',
}

interface PageProps {
	params: Promise<{ collection: string; slug: string }>
}

export async function generateMetadata({ params }: PageProps) {
	const { slug } = await params
	const node = getNode((await loadNigeriaGraph()).graph, slug)
	return {
		title: node ? `${node.name} · Who Runs Naija` : 'Who Runs Naija',
		description: node?.description,
	}
}

function card(gov: string, node: GraphNode, note?: string): ConnectionCard {
	return { id: node.id, name: node.name, href: nodePath(gov, node), type: node.type, tone: toneOf(node), note }
}

function uniqueCards(cards: ConnectionCard[]) {
	const seen = new Set<string>()
	return cards.filter((item) => !seen.has(item.id) && seen.add(item.id))
}

/** Groups an entity's relationships the way a reader asks about them: who is below, who put it there, what it controls. */
function connectionGroups(gov: string, graph: CompiledGraph, node: GraphNode) {
	const orgId = organizationOf(graph, node.id)
	const org = graph.nodes[orgId]
	const direct = authorityChain(graph, orgId).filter((link) => link.toId === orgId)
	const from = (type: string) =>
		uniqueCards(direct.filter((link) => link.type === type).map((link) => graph.nodes[link.fromId]).filter(Boolean).map((item) => card(gov, item)))
	const outgoing = (type: string) =>
		uniqueCards(
			Object.values(graph.edges)
				.filter((edge) => edge.type === type && (edge.fromId === orgId || edge.fromId === org?.head))
				.map((edge) => graph.nodes[organizationOf(graph, edge.toId)])
				.filter((item): item is GraphNode => Boolean(item) && item.id !== orgId && item.parentId !== orgId)
				.map((item) => card(gov, item, item.people[0]?.name)),
		)
	const children = Object.values(graph.nodes).filter((item) => item.parentId === orgId && item.type !== 'dept_head')
	const nested = descendantsOf(graph, orgId).length
	const parent = org?.parentId ? graph.nodes[org.parentId] : undefined
	return [
		{ title: nested > children.length ? `Agencies under it (${nested} in all)` : 'Agencies under it', cards: children.map((item) => card(gov, item, item.people[0]?.name)) },
		{ title: 'Chaired by', cards: from('ex_officio') },
		{ title: 'Elected by', cards: from('elects') },
		{ title: 'Appointed by', cards: from('appoints') },
		{ title: 'Confirmed by', cards: from('confirms') },
		{ title: 'Overseen by', cards: from('oversees').filter((item) => item.id !== parent?.id) },
		{ title: 'Appoints', cards: outgoing('appoints') },
		{ title: 'Confirms', cards: outgoing('confirms') },
		{ title: 'Oversees', cards: outgoing('oversees') },
		{ title: 'Chairs', cards: outgoing('ex_officio') },
	]
}

/** Bodies the Constitution does not create rest on an Act of the National Assembly. */
const STATUTORY_TYPES = new Set<NodeType>(['department', 'corporation', 'commission'])

function ConstitutionCard({ node, provisions }: { node: GraphNode; provisions: Provision[] }) {
	const constitutional = node.legalSourceUrl?.startsWith(CONSTITUTION_URL)
	if (!provisions.length && (constitutional || !STATUTORY_TYPES.has(node.type))) return null
	return (
		<section className="panel-card constitution-card">
			<h2>What the Constitution says</h2>
			{provisions.length ? (
				<ul>
					{provisions.map((provision) => (
						// The citation alone cannot key this list: two provisions can cite the same section
						// (s.171 grounds both the Secretary to the Government of the Federation and the Head
						// of the Civil Service, and three provisions cite s.153, Third Schedule). Each entry
						// is deduplicated by object upstream, so its own words tell same-cited ones apart.
						<li key={`${provision.cite} ${provision.text}`}>
							<a href={provisionUrl(provision)} target="_blank" rel="noreferrer" className="constitution-cite">{provision.cite}</a>
							<p>{provision.text}</p>
						</li>
					))}
				</ul>
			) : (
				<p className="muted-copy">
					The Constitution does not create this body. It is set up by an Act of the National Assembly, so its powers and how its head is chosen are set by that law, which the Assembly can amend.
				</p>
			)}
		</section>
	)
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

	const parent = node.parentId ? graph.nodes[node.parentId] : undefined
	const seat = node.type === 'dept_head' ? node : node.head ? graph.nodes[node.head] : undefined
	const holder = seat?.people[0] ?? (node.type !== 'dept_head' ? node.people[0] : undefined)
	const roster = chamberRoster(graph, node.id)
	const groups = connectionGroups(gov, graph, node).filter((group) => group.cards.length)
	const orgId = organizationOf(graph, node.id)
	const stories = newsForEntity(news, [orgId, ...descendantsOf(graph, orgId)]).sort((a, b) =>
		(b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''),
	)
	const origin = seat && holder && isCabinetSeat(seat) ? MINISTER_ORIGINS[holder.name] : undefined
	const crumbs: Crumb[] = []
	if (node.sector) crumbs.push({ label: SECTOR_LABEL[node.sector] ?? node.sector })
	if (parent && parent.type !== 'constituency') crumbs.push({ label: parent.name, href: nodePath(gov, parent) })

	return (
		<>
			<BrandBar crumbs={crumbs} layer={node.layer === 'state' || parent?.layer === 'state' ? 'state' : 'federal'} />
			<article className="panel-card entity-card">
				<h1>{node.name}</h1>
				<p className="entity-description">{node.description}</p>
				<p className="entity-sources">
					{node.legalSourceUrl ? <a href={node.legalSourceUrl} target="_blank" rel="noreferrer">Legal basis</a> : null}
					{node.officialUrl ? <a href={node.officialUrl} target="_blank" rel="noreferrer">Website</a> : null}
				</p>
				{seat && node.type !== 'dept_head' ? <p className="entity-seat-title">{seat.name}</p> : null}
				{holder ? (
					<>
						<Link href={seat ? nodePath(gov, seat) : nodePath(gov, node)} className="holder-card">
							{holder.imageUrl ? (
								<Image src={holder.imageUrl} alt="" width={48} height={48} className="holder-portrait" unoptimized />
							) : (
								<span className="holder-portrait holder-initials">{holder.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('')}</span>
							)}
							<span>
								<strong>{holder.name}</strong>
								<small>
									{holder.acting ? 'Acting · ' : ''}
									{holder.handoverUnconfirmed ? 'Appointment announced · handover unconfirmed' : holder.appointedYear ? `${node.type === 'elected' || seat?.id.includes('senator') || seat?.id.includes('rep-') ? 'Since' : 'Appointed'} ${holder.appointedYear}` : 'Incumbent'}
									{holder.party ? ` · ${holder.party}` : ''}
								</small>
							</span>
						</Link>
						{holder.sourceUrl || holder.imageSourceUrl ? (
							<p className="entity-sources">
								{holder.sourceUrl ? <a href={holder.sourceUrl} target="_blank" rel="noreferrer">Officeholder source</a> : null}
								{holder.sourceUrl && holder.sourceCheckedAt ? ` · as of ${holder.sourceCheckedAt}` : ''}
								{holder.imageSourceUrl ? <a href={holder.imageSourceUrl} target="_blank" rel="noreferrer">Photo source</a> : null}
							</p>
						) : null}
						{holder.handoverSourceUrl ? <p className="entity-sources"><a href={holder.handoverSourceUrl} target="_blank" rel="noreferrer">Handover report</a></p> : null}
						{origin ? (
							<p className="entity-origin">
								{origin.basis === 'nominated' ? 'Nominated from' : 'From'} {graph.nodes[origin.stateId]?.name ?? origin.stateId}, {STATE_ZONES[origin.stateId]}
								{' · '}
								<Link href={`/${gov}/federal-character`}>Federal character</Link>
							</p>
						) : null}
					</>
				) : seat ? (
					<div className="holder-card is-vacant">
						<span className="holder-portrait" />
						<span>
							<strong>{seat.unrecorded ? 'Officeholder not yet recorded' : 'Vacant'}</strong>
							<small>{seat.unrecorded ? 'The appointment rule is sourced; the current holder is not yet in the graph' : 'No current officeholder for this seat'}</small>
						</span>
					</div>
				) : null}
				{parent && parent.type !== 'constituency' && node.type !== 'dept_head' ? (
					<>
						<p className="entity-seat-title">Sits under</p>
						<Link href={nodePath(gov, parent)} className="holder-card part-of-card">
							<Glyph type={parent.type} tone={toneOf(parent)} size={12} />
							<span><strong>{parent.name}</strong></span>
						</Link>
					</>
				) : null}
			</article>
			<ConstitutionCard node={node} provisions={provisionsFor(graph, node.id)} />
			<BudgetCard id={orgId} gov={gov} graph={graph} />
			{node.id === GENERAL_ELECTION.authorityId ? <ElectionCountdown serverNow={new Date().toISOString()} inecHref={nodePath(gov, node)} /> : null}

			<Tabs defaultValue="news" className="entity-tabs">
				<TabsList aria-label="About this entity">
					<TabsTrigger value="news">Stories{stories.length ? ` (${stories.length})` : ''}</TabsTrigger>
					<TabsTrigger value="connections">Relationships</TabsTrigger>
				</TabsList>
				<TabsContent value="news" className="entity-tab">
					<h2>Where it appears in the news</h2>
					{stories.length === 0 ? (
						<p className="empty-box">No story names this body yet</p>
					) : (
						<ul className="story-list">
							{stories.map((item) => (
								<li key={item.id}>
									<div className="story-text">
										<a href={item.url} target="_blank" rel="noreferrer">
											<h3>{newsHeadline(item)}</h3>
										</a>
										{item.publishedAt ? <time dateTime={item.publishedAt}>{new Date(`${item.publishedAt.slice(0, 10)}T12:00:00Z`).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}</time> : null}
										{item.excerpt ? <p>{decodeHtml(item.excerpt).slice(0, 260)}</p> : null}
										<a href={item.url} target="_blank" rel="noreferrer" className="source-pill">{hostOf(item.url)} ↗</a>
									</div>
									<a href={item.url} target="_blank" rel="noreferrer" className="story-image" aria-hidden="true" tabIndex={-1}>
										<StoryImage src={item.imageUrl} />
									</a>
								</li>
							))}
						</ul>
					)}
				</TabsContent>
				<TabsContent value="connections" className="entity-tab">
					{groups.length ? groups.map((group) => <ConnectionGroup key={group.title} title={group.title} cards={group.cards} />) : (
						<p className="muted-copy">No relationships are recorded for this entity yet.</p>
					)}
				</TabsContent>
			</Tabs>
			{roster ? <ChamberRosterList gov={gov} roster={roster} /> : null}
		</>
	)
}

function hostOf(url: string) {
	try {
		return new URL(url).hostname.replace(/^www\./, '')
	} catch {
		return 'source'
	}
}
