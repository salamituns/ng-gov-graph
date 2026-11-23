/**
 * Sites a security filter has flagged as dangerous. The site never links visitors to them and the
 * refresh never fetches them, even when a curated record still cites one as its source.
 *
 * Add a host when a filter (a browser, an ISP, Google Safe Browsing) flags it; remove it once a
 * recheck comes back clean. A listed host also covers its subdomains, so `example.edu.ng` withholds
 * `www.example.edu.ng` and `portal.example.edu.ng`.
 */
export const FLAGGED_HOSTS: Record<string, { reason: string; flaggedOn: string }> = {
	// AT&T Internet Security blocked the nightly portrait fetch of /about-us/ as a phishing page.
	'ninlan.edu.ng': { reason: 'phishing', flaggedOn: '2026-11-22' },
}

export function isFlaggedUrl(url: string | undefined): boolean {
	if (!url) return false
	let host: string
	try {
		host = new URL(url).hostname.toLowerCase().replace(/\.$/, '')
	} catch {
		return false
	}
	return Object.keys(FLAGGED_HOSTS).some((flagged) => host === flagged || host.endsWith(`.${flagged}`))
}
