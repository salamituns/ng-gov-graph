'use client'

import { useEffect } from 'react'
import { spotlight } from '@/lib/spotlight'

/** Lights a topic's bodies on the government map while its page is open (see lib/spotlight). */
export function TopicSpotlight({ label, bodyIds }: { label: string; bodyIds: string[] }) {
	const key = bodyIds.join('|')
	useEffect(() => {
		spotlight({ label, nodeIds: key.split('|').filter(Boolean), stateIds: [], caption: label })
		return () => spotlight(null)
	}, [label, key])
	return null
}
