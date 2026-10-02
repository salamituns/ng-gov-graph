import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { carryPortraits } from './portraits'
import type { CompiledGraph, GraphNode, Officeholder } from './types'

function graphOf(people: Record<string, Officeholder>): CompiledGraph {
	const nodes: Record<string, GraphNode> = {}
	for (const [id, person] of Object.entries(people)) {
		nodes[id] = { id, name: id, type: 'elected', description: '', aliases: [], people: [person], edges: [], connectedNodes: [] }
	}
	return { nodes, edges: {} } as unknown as CompiledGraph
}

describe('portraits survive a refresh', () => {
	it('keeps a portrait the last snapshot had when today has none', () => {
		const previous = graphOf({ president: { name: 'Bola Ahmed Tinubu', imageUrl: 'https://example.org/tinubu.jpg', imageSourceUrl: 'https://example.org/' } })
		const today = carryPortraits(graphOf({ president: { name: 'Bola Ahmed Tinubu' } }), previous)
		assert.equal(today.nodes.president.people[0].imageUrl, 'https://example.org/tinubu.jpg')
		assert.equal(today.nodes.president.people[0].imageSourceUrl, 'https://example.org/')
	})

	it('follows the person, not the seat', () => {
		const previous = graphOf({ 'old-seat': { name: 'Jane Doe', imageUrl: 'https://example.org/jane.jpg' } })
		const today = carryPortraits(graphOf({ 'new-seat': { name: 'Jane Doe' } }), previous)
		assert.equal(today.nodes['new-seat'].people[0].imageUrl, 'https://example.org/jane.jpg')
	})

	it('never replaces a portrait already set, so a verified one wins', () => {
		const previous = graphOf({ seat: { name: 'Jane Doe', imageUrl: 'https://example.org/old.jpg' } })
		const today = carryPortraits(graphOf({ seat: { name: 'Jane Doe', imageUrl: 'https://example.gov.ng/verified.jpg' } }), previous)
		assert.equal(today.nodes.seat.people[0].imageUrl, 'https://example.gov.ng/verified.jpg')
	})

	it('leaves a new holder without a face rather than borrowing the last one', () => {
		const previous = graphOf({ seat: { name: 'Old Holder', imageUrl: 'https://example.org/old.jpg' } })
		const today = carryPortraits(graphOf({ seat: { name: 'New Holder' } }), previous)
		assert.equal(today.nodes.seat.people[0].imageUrl, undefined)
	})

	it('does nothing on a first run', () => {
		const today = carryPortraits(graphOf({ seat: { name: 'Jane Doe' } }), null)
		assert.equal(today.nodes.seat.people[0].imageUrl, undefined)
	})
})
