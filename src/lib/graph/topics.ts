import type { CivicTopic } from '@/data/nigeria/topics'

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
/** Not inside a word: no letter or digit just before (and, for whole words, just after). */
const START = '(?<![\\p{L}\\p{N}])'
const END = '(?![\\p{L}\\p{N}])'

/** One keyword as a pattern, by the rules in data/nigeria/topics.ts. */
export function keywordPattern(keyword: string): RegExp {
	const acronym = /^[A-Z0-9][A-Z0-9-]*[A-Z0-9]$/.test(keyword) && /[A-Z]/.test(keyword)
	if (acronym) return new RegExp(`${START}${escape(keyword)}${END}`, 'u')
	if (/[A-Z]/.test(keyword)) return new RegExp(`${START}${escape(keyword)}${END}`, 'iu')
	return new RegExp(`${START}${escape(keyword)}`, 'iu')
}

/**
 * The topics a story belongs to, in list order: any keyword in the headline, or two different keywords in the
 * excerpt (an excerpt wanders: a fire report that mentions petrol is not about fuel prices).
 */
export function topicsOf(headline: string, excerpt: string, topics: CivicTopic[]): string[] {
	return topics
		.filter((topic) => {
			const patterns = topic.keywords.map(keywordPattern)
			return patterns.some((pattern) => pattern.test(headline)) || patterns.filter((pattern) => pattern.test(excerpt)).length >= 2
		})
		.map((topic) => topic.id)
}
