import { loadFont } from '@remotion/fonts'
import { staticFile } from 'remotion'
import { fontsReady as baseFonts } from '../theme'

// brand.json's three faces. Hanken comes from theme.ts; Bricolage 700 and Geist Mono are fontsource subsets,
// and the latin-ext half is what carries ₦ (U+20A6), so both halves are registered under one family.
export const DISPLAY = '"Bricolage 700", Bricolage, sans-serif'
export const BODY = 'Hanken, sans-serif'
export const MONO = '"Geist Mono", ui-monospace, monospace'

const LATIN = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD'
const LATIN_EXT = 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF'

const both = (family: string, file: string, weight: string) => [
	loadFont({ family, url: staticFile(`fonts/${file}.woff2`), weight, unicodeRange: LATIN }),
	loadFont({ family, url: staticFile(`fonts/${file}-ext.woff2`), weight, unicodeRange: LATIN_EXT }),
]

export const fontsReady = Promise.all([
	baseFonts,
	...both('Bricolage 700', 'bricolage-700', '700'),
	...both('Geist Mono', 'geist-mono-500', '500'),
	...both('Geist Mono', 'geist-mono-600', '600'),
])
