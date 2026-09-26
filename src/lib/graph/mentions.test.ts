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

	it('matches a bare surname only after a title', () => {
		assert.deepEqual(mentionedIds('President Tinubu met the press.', labels), ['ng-president'])
		const defenceHead = graph.nodes['ng-ministry-of-defence'].people[0]?.name ?? ''
		const surname = defenceHead.split(/\s+/).at(-1) ?? ''
		assert.equal(mentionedIds(`${surname} Ibrahim opened a shop.`, labels).includes('ng-ministry-of-defence'), false)
	})

	it('does not read a place named after someone as that person', () => {
		const senatePresident = graph.nodes['ng-senate'].people[0]?.name ?? ''
		assert.equal(mentionedIds(`The match is at the ${senatePresident} Stadium, Uyo.`, labels).includes('ng-senate'), false)
		assert.ok(mentionedIds(`${senatePresident} presided over plenary.`, labels).includes('ng-senate'))
	})

	it('prefers the longest label and never overlaps spans', () => {
		const spans = findMentions('The Ministry of Finance met the Federal Inland Revenue Service.', labels)
		assert.deepEqual(spans.map((span) => span.id), ['ng-ministry-of-finance', 'ng-firs'])
	})
})
