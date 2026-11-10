'use client'

import { useSyncExternalStore } from 'react'
import { lagosDay } from '@/lib/dates'

function subscribe(tick: () => void) {
	const timer = setInterval(tick, 15000)
	return () => clearInterval(timer)
}

function minute() {
	return Math.floor(Date.now() / 60000) * 60000
}

/** No cached server clock: time-dependent UI starts with the browser's current minute. */
export function useClock() {
	return useSyncExternalStore(subscribe, minute, () => 0)
}

function currentDay() { return lagosDay(new Date()) }

/** React updates this subscriber only when Nigeria's calendar day changes, not every minute. */
export function useLagosDay() {
	return useSyncExternalStore(subscribe, currentDay, () => null)
}
