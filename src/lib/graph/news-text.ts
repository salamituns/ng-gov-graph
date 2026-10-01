import type { NewsItem } from '@/data/nigeria/news'
import { findMentions, type MentionLabel } from './mentions'

export interface NewsSegment {
	text: string
	/** Set when the words name an entity in the graph. */
	id?: string
}

/** Decodes entities and collapses whitespace, keeping edge spaces so segments join cleanly. */
function decodeInline(value: string) {
	return value
		.replace(/<[^>]+>/g, ' ')
		.replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
		.replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
		.replace(/&quot;/g, '"')
		.replace(/&apos;|&rsquo;|&lsquo;/g, '’')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/\s+/g, ' ')
}

export function decodeHtml(value: string) {
	return decodeInline(value).trim()
}

/** Feed boilerplate that is not part of the story: "Read More: https://…", "The post … appeared first on …". */
export function cleanExcerpt(value: string) {
	return value
		.replace(/\s*Read More:?\s*https?:\/\/\S+/gi, '')
		.replace(/\s*The post\b[\s\S]*?appeared first on\b[\s\S]*$/i, '')
		.replace(/\s*The post\b[^.]*$/i, '')
		.replace(/\s*(?:Continue reading|Read more)\s*(?:→|»|\.\.\.)?\s*$/i, '')
		.trim()
}

const SMALL_WORDS = new Set(['a', 'an', 'and', 'as', 'at', 'by', 'for', 'from', 'in', 'of', 'on', 'or', 'the', 'to', 'with'])
const ACRONYMS = /^(FG|FCT|NNPC|NNPCL|ECOWAS|NASS|INEC|CBN|EFCC|ICPC|FEC|APC|PDP|LP|AU|UN|US|UK|FID|SGF|IGP|CJN|\$[\d.]+[MBK]?)$/

/** State House headlines arrive in capitals; set them in title case so names stay capitalised. */
export function titleCase(value: string) {
	if (value !== value.toUpperCase()) return value
	return value
		.split(/(\s+)/)
		.map((word, index) => {
			if (/^\s+$/.test(word) || ACRONYMS.test(word.replace(/[^\w$.]/g, ''))) return word
			const lower = word.toLowerCase()
			if (index > 0 && SMALL_WORDS.has(lower)) return lower
			return lower.replace(/(^|[-'’(])(\p{L})/gu, (_, lead, letter: string) => lead + letter.toUpperCase())
		})
		.join('')
}

export function newsHeadline(item: NewsItem) {
	return titleCase(decodeHtml(item.summary.replace(/<gov_entities='[^']*'>|<\/gov_entities>/g, '')))
}

/**
 * Sentence breaks: a full stop, question or exclamation mark followed by a capital. Not after an initial
 * ("produced J. Smith") or a title ("Gen. Musa", "Sen. Akpabio"), which would end the lead mid-name.
 */
const SENTENCE_END = /(?<=[.!?])(?<!(?:^|[\s(])[A-Z]\.)(?<!\b(?:Mr|Mrs|Ms|Dr|Prof|Gen|Sen|Hon|Rt|St|No|Engr|Arc|Barr|Col|Lt|Maj|Capt|Gov|Rev|Jr|Sr|Amb|Esq|Ltd|Plc|Inc|Co)\.)\s+(?=[A-Z“"])/

/** The line shown for a story: the tagged summary if it has one, otherwise the lead sentence. */
export function newsLead(item: NewsItem) {
	if (/<gov_entities=/.test(item.summary)) return item.summary
	const excerpt = item.excerpt ? decodeHtml(item.excerpt).trim() : ''
	const lead = excerpt.split(SENTENCE_END)[0]?.trim() ?? ''
	// A lead must be a whole sentence. Feeds often cut excerpts mid-word ("domestic and sexual vio"), so a
	// lead without a closing full stop falls back to the headline, which is always complete.
	if (lead.length >= 40 && lead.length <= 300 && /[.!?]["”’)]?$/.test(lead)) return lead
	return newsHeadline(item)
}

/** Splits a story's text into plain words and linked entity mentions. */
export function newsSegments(text: string, labels: MentionLabel[]): NewsSegment[] {
	if (/<gov_entities=/.test(text)) {
		const segments: NewsSegment[] = []
		const pattern = /<gov_entities='([^']+)'>(.*?)<\/gov_entities>/g
		let cursor = 0
		for (const match of text.matchAll(pattern)) {
			const index = match.index ?? 0
			if (index > cursor) segments.push({ text: decodeInline(text.slice(cursor, index)) })
			segments.push({ text: decodeInline(match[2]), id: match[1] })
			cursor = index + match[0].length
		}
		if (cursor < text.length) segments.push({ text: decodeInline(text.slice(cursor)) })
		return segments
	}
	const clean = decodeHtml(text)
	const segments: NewsSegment[] = []
	let cursor = 0
	for (const span of findMentions(clean, labels)) {
		if (span.start > cursor) segments.push({ text: clean.slice(cursor, span.start) })
		segments.push({ text: span.text, id: span.id })
		cursor = span.end
	}
	if (cursor < clean.length) segments.push({ text: clean.slice(cursor) })
	return segments
}
