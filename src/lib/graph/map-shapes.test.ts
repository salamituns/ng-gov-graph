import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { NIGERIA_MAP } from '@/data/nigeria/map-shapes'
import { compileNigeriaGraph } from './nigeria'

describe('Nigeria map at the core', () => {
	it('has a shape for every state and the FCT, and nothing else', () => {
		const states = Object.values(compileNigeriaGraph().nodes).filter((node) => node.type === 'state').map((node) => node.id).sort()
		assert.deepEqual(Object.keys(NIGERIA_MAP.states).sort(), states)
		assert.ok(Object.values(NIGERIA_MAP.states).every((d) => /^M[-\d. L]+Z/.test(d)))
	})

	it('fits inside the hub disc when drawn', () => {
		assert.ok(NIGERIA_MAP.width * 1.08 < 2 * 112 && NIGERIA_MAP.height * 1.08 < 2 * 112)
	})
})
