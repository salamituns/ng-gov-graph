import { cookies } from 'next/headers'
import { LANG_COOKIE, parseLang, type Lang } from './i18n'

/** The reader's chosen language, from the cookie the language menu sets. */
export async function getLang(): Promise<Lang> {
	return parseLang((await cookies()).get(LANG_COOKIE)?.value)
}
