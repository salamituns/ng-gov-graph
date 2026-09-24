import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { layoutGraph, organizationBands, sectorBands } from './layout'
import { compileNigeriaGraph } from './nigeria'
import { filterGraph } from './filter'
import { applyPortraitUrls, mapPortraitUrls, portraitTargets } from './portraits'
import { civicMonitorEnabled, extractCivicUpdates } from '../ai/monitor'

describe('people layout', () => {
	it('places every federal organization and keeps children outside their parents', () => {
		const graph = filterGraph(compileNigeriaGraph(), 'federal')
		const placed = layoutGraph(graph, 800, 800)
		assert.equal(placed.length, Object.values(graph.nodes).filter((node) => node.type !== 'dept_head').length)
		const parent = placed.find((item) => item.id === 'ng-ministry-of-finance')
		const child = placed.find((item) => item.id === 'ng-firs')
		const grandchild = placed.find((item) => item.id === 'ng-frsc')
		assert.ok(parent)
		assert.ok(child)
		assert.ok(grandchild)
		const parentDist = Math.hypot(parent.x - 400, parent.y - 400)
		const childDist = Math.hypot(child.x - 400, child.y - 400)
		assert.equal(childDist > parentDist, true)
		const president = placed.find((item) => item.id === 'ng-president')
		const vicePresident = placed.find((item) => item.id === 'ng-vice-president')
		assert.ok(president)
		assert.ok(vicePresident)
		assert.ok(Math.hypot(president.x - 400, president.y - 400) < parentDist)
		assert.ok(Math.hypot(vicePresident.x - 400, vicePresident.y - 400) < parentDist)
		assert.ok(Math.hypot(president.x - vicePresident.x, president.y - vicePresident.y) > 40)
		const ministries = placed.filter(
			(item) => item.node.sector === 'executive' && !item.node.parentId && item.node.type !== 'elected',
		)
		const distances = ministries.map((item) => Math.round(Math.hypot(item.x - 400, item.y - 400)))
		assert.ok(distances.every((distance) => Math.abs(distance - 312) < 15))
		assert.ok(ministries.every((item, index) => ministries.slice(index + 1).every(
			(other) => Math.hypot(item.x - other.x, item.y - other.y) > 20,
		)))
		const bands = organizationBands(placed, 800, 800)
		const parents = new Set(
			placed
				.filter((item) => item.node.parentId && item.node.type !== 'dept_head')
				.map((item) => item.node.parentId),
		)
		assert.deepEqual(new Set(bands.map((band) => band.id)), parents)
		assert.ok(bands.every((band) => !band.d.includes('NaN')))
		const executiveOutline = sectorBands(800, 800).find((band) => band.sector === 'executive')
		assert.ok(executiveOutline && executiveOutline.d.split('L').length > 100)
	})

	it('places occupied officeholders as holder nodes in people mode', () => {
		const graph = compileNigeriaGraph()
		const orgs = layoutGraph(graph, 800, 800, { mode: 'orgs' })
		const people = layoutGraph(graph, 800, 800, { mode: 'people' })
		assert.equal(
			orgs.some((item) => item.id.startsWith('holder:')),
			false,
		)
		assert.equal(
			people.some((item) => item.id === 'holder:ng-president'),
			true,
		)
		assert.equal(
			people.some((item) => item.id.startsWith('holder:ng-senator-')),
			false,
		)
		const holder = people.find((item) => item.id === 'holder:ng-president')
		assert.equal(
			holder?.node.people[0]?.imageUrl,
			graph.nodes['ng-president'].people[0]?.imageUrl,
		)
		assert.ok(
			people.filter((item) => item.id.startsWith('holder:')).every(
				(item) => Math.hypot(item.x - 400, item.y - 400) <= 800 * 0.47,
			),
		)
	})

	it('keeps the combined federal and state view legible', () => {
		const placed = layoutGraph(compileNigeriaGraph(), 920, 720)
		const nodes = placed.filter((item) => item.node.type !== 'constituency')
		for (const [index, item] of nodes.entries()) {
			for (const other of nodes.slice(index + 1)) {
				assert.ok(Math.hypot(item.x - other.x, item.y - other.y) >= 14, `${item.id} overlaps ${other.id}`)
			}
		}
		const state = placed.find((item) => item.id === 'ng-lagos-state')
		const house = placed.find((item) => item.id === 'ng-lagos-house-of-assembly')
		assert.ok(state && house)
		assert.ok(Math.hypot(house.x - 460, house.y - 360) > Math.hypot(state.x - 460, state.y - 360))
	})
})

describe('portraits', () => {
	it('attaches a portrait url to named people that lack one', () => {
		const graph = compileNigeriaGraph()
		applyPortraitUrls(graph, {
			'Bola Ahmed Tinubu':
				'https://upload.wikimedia.org/wikipedia/commons/tinubu.jpg',
		})
		assert.equal(
			graph.nodes['ng-president'].people[0]?.imageUrl,
			'https://upload.wikimedia.org/wikipedia/commons/tinubu.jpg',
		)
		assert.equal(
			graph.nodes['ng-president-of-the-senate'].people[0]?.imageUrl,
			undefined,
		)
	})

	it('asks Wikipedia only for org-head names that still lack a portrait', () => {
		const graph = compileNigeriaGraph()
		graph.nodes['ng-president'].people[0].imageUrl = 'https://example.com/tinubu.jpg'
		const president = graph.nodes['ng-president'].people[0]?.name ?? ''
		const names = portraitTargets(graph)
		assert.equal(names.includes(president), false)
		assert.equal(
			names.some((name) => name.includes('Senator') || name.length === 0),
			false,
		)
		assert.ok(names.includes(graph.nodes['ng-president-of-the-senate'].people[0].name))
	})

	it('fetches portraits with a concurrency cap', async () => {
		let active = 0
		let peak = 0
		const urls = await mapPortraitUrls(
			['Ada', 'Bola', 'Chidi'],
			async (name) => {
				active += 1
				peak = Math.max(peak, active)
				await new Promise((resolve) => setTimeout(resolve, 20))
				active -= 1
				return `https://example.com/${name}.jpg`
			},
			{ concurrency: 2 },
		)
		assert.equal(peak <= 2, true)
		assert.equal(urls.Ada, 'https://example.com/Ada.jpg')
	})
})

describe('civic monitor', () => {
	it('parses model output into news and personnel changes', async () => {
		const result = await extractCivicUpdates(
			'Tinubu swore in a new minister on 1 May 2026.',
			async () => ({
				news: [
					{
						id: 'news-minister',
						summary: 'A new minister was sworn in.',
						url: 'https://statehouse.gov.ng/',
						publication: 'State House',
					},
				],
				changes: [
					{
						kind: 'personnel' as const,
						id: 'chg-minister',
						date: '2026-05-01',
						personName: 'Example Minister',
						positionId: 'ng-office-of-the-president',
						positionName: 'Minister',
						groupId: 'ng-president',
						entryMode: 'sworn' as const,
						departure: false,
						predecessorName: null,
					},
				],
			}),
		)
		assert.equal(result.news[0]?.id, 'news-minister')
		assert.equal(result.changes[0]?.personName, 'Example Minister')
	})

	it('is enabled on Vercel OIDC without a stored gateway key', () => {
		assert.equal(civicMonitorEnabled({}), false)
		assert.equal(civicMonitorEnabled({ VERCEL: '1' }), true)
		assert.equal(civicMonitorEnabled({ VERCEL_OIDC_TOKEN: 'token' }), true)
		assert.equal(civicMonitorEnabled({ AI_GATEWAY_API_KEY: 'key' }), true)
	})

	it('skips a hung feed and uses the next official RSS source', async () => {
		const { fetchCivicSource } = await import('../ai/monitor')
		const seen: string[] = []
		const source = await fetchCivicSource(async (url) => {
			seen.push(String(url))
			if (seen.length === 1) {
				throw new Error('timeout')
			}
			return new Response('<rss><item><title>Cabinet</title></item></rss>', {
				status: 200,
			})
		})
		assert.equal(seen.length, 2)
		assert.match(source, /Cabinet/)
	})
})
