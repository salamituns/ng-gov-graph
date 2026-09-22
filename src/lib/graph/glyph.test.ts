import assert from 'node:assert/strict'
import { test } from 'node:test'
import { glyphPath } from './glyph'

test('graph entity types have distinct, valid SVG shapes', () => {
	const types = ['elected', 'department', 'commission', 'advisory', 'court', 'corporation', 'state'] as const
	const paths = types.map((type) => glyphPath(type, 12, 12, 9))
	assert.equal(new Set(paths).size, types.length)
	assert.ok(paths.every((path) => path.startsWith('M ') && path.endsWith('Z') && !path.includes('NaN')))
})
