import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { compileNigeriaGraph } from './nigeria'
import { filterGraph } from './filter'
import { findMentions, mentionLabels, mentionedIds } from './mentions'

const graph = filterGraph(compileNigeriaGraph(), 'federal')
const labels = mentionLabels(graph)

describe('news mentions', () => {
	it('matches acronyms only as whole, correctly cased words', () => {
		assert.equal(mentionedIds('Nigeria unlocks five-decade gas resource, finishing talks', labels).includes('ng-nis'), false)
		assert.ok(mentionedIds('The NIS issued new passports.', labels).includes('ng-nis'))
	})

	it('credits a person to their primary seat, not every office they hold', () => {
		const ids = mentionedIds('PRESIDENT TINUBU HAILS $800M IMA GAS FID', labels)
		assert.deepEqual(ids, ['ng-president'])
	})

	it('prefers the longest label and never overlaps spans', () => {
		const spans = findMentions('The Ministry of Finance met the Federal Inland Revenue Service.', labels)
		assert.deepEqual(spans.map((span) => span.id), ['ng-ministry-of-finance', 'ng-firs'])
	})
})
