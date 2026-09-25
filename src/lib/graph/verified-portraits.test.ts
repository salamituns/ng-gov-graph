import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { VERIFIED_PORTRAITS } from '@/data/nigeria/verified-portraits'
import { compileNigeriaGraph } from './nigeria'

describe('verified portraits', () => {
	const graph = compileNigeriaGraph()
	const holders = new Set(Object.values(graph.nodes).flatMap((node) => node.people.map((person) => person.name)))

	it('belong to people who hold an office in the graph', () => {
		const strays = Object.keys(VERIFIED_PORTRAITS).filter((name) => !holders.has(name))
		assert.deepEqual(strays, [])
	})

	it('are served over https with the page that publishes them', () => {
		for (const [name, entry] of Object.entries(VERIFIED_PORTRAITS)) {
			assert.match(entry.imageUrl, /^https:\/\//, name)
			assert.match(entry.sourceUrl, /^https:\/\//, name)
		}
	})

	it('reach the holder on both the body and its seat', () => {
		const withPortrait = Object.values(graph.nodes).filter((node) => node.people[0] && VERIFIED_PORTRAITS[node.people[0].name])
		assert.ok(withPortrait.length >= 40)
		assert.ok(withPortrait.every((node) => node.people[0].imageUrl))
	})
})
