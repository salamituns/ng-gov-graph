import { loadFont } from '@remotion/fonts'
import { staticFile } from 'remotion'

// The site's own palette and type (Flag & Bronze): executive green, cream ink, Bricolage for display, Hanken for text.
export const COLORS = { band: '#0a7046', bandDeep: '#06573a', ink: '#fbf7ec', mint: '#c6f0da', tap: '#ffffff' }
export const DISPLAY = 'Bricolage'
export const BODY = 'Hanken'

export const fontsReady = Promise.all([
	loadFont({ family: DISPLAY, url: staticFile('fonts/bricolage-800.ttf'), weight: '800' }),
	loadFont({ family: BODY, url: staticFile('fonts/hanken-500.ttf'), weight: '500' }),
	loadFont({ family: BODY, url: staticFile('fonts/hanken-700.ttf'), weight: '700' }),
])

/** Frame layout (1080x1920): captions in the green band on top, the phone recording below it. */
export const LAYOUT = { width: 1080, height: 1920, bandHeight: 330, screen: { top: 330, height: 1500, radius: 44 } }
export const SCREEN_SCALE = LAYOUT.screen.height / 1920
export const SCREEN_WIDTH = 1080 * SCREEN_SCALE
export const SCREEN_LEFT = (1080 - SCREEN_WIDTH) / 2
