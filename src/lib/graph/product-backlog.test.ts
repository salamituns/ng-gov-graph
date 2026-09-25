import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { layoutGovernment, MAP, RING } from './layout'
import { compileNigeriaGraph } from './nigeria'
import { filterGraph } from './filter'
import { applyPortraitUrls, mapPortraitUrls, portraitTargets } from './portraits'
import { civicMonitorEnabled, extractCivicUpdates } from '../ai/monitor'

describe('government layout', () => {
	const graph = filterGraph(compileNigeriaGraph(), 'federal')
	const layout = layoutGovernment(graph)
	const at = new Map(layout.nodes.map((item) => [item.id, item]))
	const radius = (id: string) => {
		const item = at.get(id)
		assert.ok(item, `${id} is placed`)
		return Math.hypot(item.x - MAP.cx, item.y - MAP.cy)
	}

	it('places every federal body exactly once', () => {
		const ids = layout.nodes.map((item) => item.id)
		assert.equal(new Set(ids).size, ids.length)
		const bodies = Object.values(graph.nodes).filter((node) => node.type !== 'dept_head')
		assert.equal(ids.length, bodies.length)
	})

	it('puts each tier on its ring and sub-agencies outside their ministry', () => {
		assert.ok(Math.abs(radius('ng-president') - RING.authority) < 1)
		assert.ok(Math.abs(radius('ng-vice-president') - RING.authority) < 1)
		assert.ok(Math.abs(radius('ng-inec') - RING.oversight) < 1)
		assert.ok(Math.abs(radius('ng-ministry-of-finance') - RING.administration) < 1)
		assert.ok(Math.abs(radius('ng-office-of-sgf') - RING.administration) < 1)
		assert.ok(radius('ng-firs') > radius('ng-ministry-of-finance') + 40)
		assert.equal(at.get('ng-firs')?.kind, 'dot')
		assert.equal(at.get('ng-frsc')?.kind, 'dot')
	})

	it('keeps glyphs from overlapping and paths well formed', () => {
		const glyphs = layout.nodes.filter((item) => item.kind === 'glyph')
		for (const [index, item] of glyphs.entries()) {
			for (const other of glyphs.slice(index + 1)) {
				assert.ok(Math.hypot(item.x - other.x, item.y - other.y) >= item.r + other.r + 4, `${item.id} overlaps ${other.id}`)
			}
		}
		const paths = [...layout.wedges.map((wedge) => wedge.d), ...layout.bands.map((band) => band.d), ...layout.rings.map((ring) => ring.d)]
		assert.ok(paths.every((d) => d.startsWith('M') && !d.includes('NaN')))
		assert.deepEqual(layout.wedges.map((wedge) => wedge.key).sort(), ['executive', 'judicial', 'legislative'])
	})

	it('draws the States layer as six geopolitical zones', () => {
		const states = layoutGovernment(filterGraph(compileNigeriaGraph(), 'state'), { layer: 'state' })
		assert.equal(states.wedges.length, 6)
		const place = new Map(states.nodes.map((item) => [item.id, item]))
		const lagos = place.get('ng-lagos-state')
		const house = place.get('ng-lagos-house-of-assembly')
		assert.ok(lagos && house)
		assert.ok(Math.hypot(house.x - MAP.cx, house.y - MAP.cy) > Math.hypot(lagos.x - MAP.cx, lagos.y - MAP.cy))
		assert.equal(states.nodes.filter((item) => item.node.type === 'state').length, 37)
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

describe('portrait matching', () => {
	it('matches the person, not a namesake', async () => {
		const { isSamePerson, officialImage } = await import('./portraits')
		assert.equal(isSamePerson('Ali Muhammad Ali', 'Muhammad Ali Pate', 'Nigerian physician'), false)
		assert.equal(isSamePerson('Mohammed Mohammed', 'Amina J. Mohammed', 'Nigerian diplomat'), false)
		assert.equal(isSamePerson('Benjamin Kalu', 'Benjamin Okezie Kalu', 'Nigerian politician'), true)
		assert.equal(isSamePerson('Benjamin Kalu', 'Benjamin Kalu (footballer)', 'English footballer'), false)
		const page = `<img src="/uploads/dummy.png" alt="Mohammed Idris"><img src="/uploads/courtesy-visit.jpg" alt="Idris"><img src="/uploads/hon-idris.jpg" alt="">`
		assert.equal(officialImage(page, 'https://fmino.gov.ng/about/', 'Mohammed Idris'), 'https://fmino.gov.ng/uploads/hon-idris.jpg')
		assert.equal(officialImage('<img src="/x.jpg" alt="DG receives delegation from the EU climate group led by Barikor">', 'https://nesrea.gov.ng/', 'Innocent Barikor'), null)
	})
})

describe('portrait size', () => {
	it('shrinks oversized Wikimedia thumbnails and leaves the rest alone', async () => {
		const { portraitSize } = await import('./portraits')
		const base = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/X.jpg/'
		assert.equal(portraitSize(`${base}3840px-X.jpg`), `${base}500px-X.jpg`)
		assert.equal(portraitSize(`${base}250px-X.jpg`), `${base}250px-X.jpg`)
		assert.equal(portraitSize('https://nass.gov.ng/photo/92.jpg'), 'https://nass.gov.ng/photo/92.jpg')
	})
})
