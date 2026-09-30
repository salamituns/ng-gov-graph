'use client'

import { useRouter } from 'next/navigation'
import { createContext, useContext, type ReactNode } from 'react'
import { LANG_COOKIE, LANGS, t, type Lang, type MessageKey } from '@/lib/i18n'

const LangContext = createContext<Lang>('en')

export function LangProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
	return <LangContext.Provider value={lang}>{children}</LangContext.Provider>
}

/** The current language and a translator bound to it. */
export function useT() {
	const lang = useContext(LangContext)
	return { lang, t: (key: MessageKey, values?: Record<string, string | number>) => t(lang, key, values) }
}

/** Language menu: stores the choice in a cookie so server-rendered text follows it, then re-renders. */
export function LangSelect() {
	const router = useRouter()
	const { lang, t: tr } = useT()
	const choose = (code: string) => {
		document.cookie = `${LANG_COOKIE}=${code}; path=/; max-age=31536000; samesite=lax`
		document.documentElement.lang = code
		router.refresh()
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

/** Shown whenever a language other than English is chosen: these translations are drafts. */
export function DraftNotice() {
	const { lang, t: tr } = useT()
	if (lang === 'en') return null
	return (
		<p className="draft-notice" role="note">
			<span lang={lang}>{tr('draftNotice')}</span>
			<span lang="en"> · {t('en', 'draftNotice')}</span>
		</p>
	)
}
