'use client'

import { track } from '@/lib/track'
import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react'
import { LANG_COOKIE, LANGS, parseLang, t, type Lang, type MessageKey } from '@/lib/i18n'

/**
 * The language lives in a cookie that only the browser reads. Reading it on the server made every page
 * personal to its reader, so Vercel rendered each one on every visit and could cache none of them
 * (the free plan's CPU allowance ran out in October 2026). The server renders English; readers who chose
 * another language see it as soon as the page hydrates.
 */
const listeners = new Set<() => void>()

function readCookie(): Lang {
	return parseLang(document.cookie.match(new RegExp(`(?:^|; )${LANG_COOKIE}=([^;]*)`))?.[1])
}

function subscribe(listener: () => void) {
	listeners.add(listener)
	return () => listeners.delete(listener)
}

const LangContext = createContext<Lang>('en')

export function LangProvider({ children }: { children: ReactNode }) {
	const lang = useSyncExternalStore(subscribe, readCookie, () => 'en' as const)
	return <LangContext.Provider value={lang}>{children}</LangContext.Provider>
}

/** The current language and a translator bound to it. */
export function useT() {
	const lang = useContext(LangContext)
	return { lang, t: (key: MessageKey, values?: Record<string, string | number>) => t(lang, key, values) }
}

/** Translated interface text, for server components that can't call useT. */
export function T({ k, values }: { k: MessageKey; values?: Record<string, string | number> }) {
	return useT().t(k, values)
}

/** Language menu: stores the choice in a cookie and re-renders every translated string in place. */
export function LangSelect() {
	const { lang, t: tr } = useT()
	const choose = (code: string) => {
		track('language_changed', { from: lang, to: code })
		document.cookie = `${LANG_COOKIE}=${code}; path=/; max-age=31536000; samesite=lax`
		document.documentElement.lang = code
		for (const listener of listeners) listener()
	}
	return (
		<label className="lang-select">
			<span className="sr-only">{tr('language')}</span>
			<select value={lang} onChange={(event) => choose(event.target.value)} aria-label={tr('language')}>
				{LANGS.map((item) => (
					<option key={item.code} value={item.code} lang={item.code}>{item.name}</option>
				))}
			</select>
		</label>
	)
}
