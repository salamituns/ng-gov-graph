import { Composition } from 'remotion'
import { Scene, type SceneProps } from './Scene'
import opening from '../public/clips/opening.json'
import './theme'

const FPS = 30

/** Scene 1–2: the hook over the first-visit pulse, then the President's lines fanning out. */
const OPENING: SceneProps = {
	clip: 'opening',
	taps: opening.taps as SceneProps['taps'],
	trim: 0.3,
	// Whole phone for the hook and the tap; once the sheet is pulled down, push in on the fan-out.
	camera: [
		{ t: 0, scale: 1, x: 540, y: 900 },
		{ t: 5.6, scale: 1, x: 540, y: 900 },
		{ t: 7.0, scale: 1.5, x: 540, y: 820 },
	],
	captions: [
		{ from: 0, to: 3.0, headline: 'Who actually runs Nigeria?' },
		{ from: 3.0, to: 9.6, headline: 'Tap any office.', detail: 'See who holds it, and who put them there.' },
	],
}

export function Root() {
	return (
		<Composition id="PreviewOpening" component={Scene} defaultProps={OPENING} width={1080} height={1920} fps={FPS} durationInFrames={Math.round(9.6 * FPS)} />
	)
}
