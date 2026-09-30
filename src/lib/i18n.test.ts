import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { allMessages, parseLang, t } from './i18n'

describe('interface languages', () => {
	it('translates every key in every language, keeping the placeholders', () => {
		const messages = allMessages()
		const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort()
		for (const [lang, table] of Object.entries(messages)) {
			for (const [key, english] of Object.entries(messages.en)) {
				const text = table[key as keyof typeof table]
				assert.ok(text?.trim(), `${lang}.${key} is empty`)
				assert.deepEqual(placeholders(text), placeholders(english), `${lang}.${key} placeholders`)
			}
		}
	})

	it('fills placeholders and falls back to English for unknown languages', () => {
		assert.equal(parseLang('xx'), 'en')
		assert.equal(parseLang(undefined), 'en')
		assert.match(t('ha', 'federalCharacterCard', { covered: 37, states: 37, members: 48 }), /^Jihohi 37 cikin 37/)
	})
})
