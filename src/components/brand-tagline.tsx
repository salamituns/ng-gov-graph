'use client'

import { useT } from '@/components/lang'

export function BrandTagline() {
	return <span className="brand-tagline">{useT().t('tagline')}</span>
}
