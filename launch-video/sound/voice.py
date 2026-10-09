"""Prepares a voiceover recording for the film: clean it, then find where each scripted line starts and ends.

    python3 sound/voice.py <recording>      (any format ffmpeg reads: .m4a from Voice Memos, .wav, .mp3)

Writes public/voice/voice.wav (cleaned, 48 kHz mono, -16 LUFS) and public/voice/voice.json, which the film
reads to time its scenes. Lines are found from the pauses between them (VOICEOVER.md asks for a breath
between numbered lines); if the count isn't 7, the segments are printed so a take can be picked by hand.
"""
import json
import os
import re
import subprocess
import sys

LINES = 7
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'voice')
# Broadcast-style cleanup: cut rumble and hiss, tame room noise, even out the level, then speech loudness.
CHAIN = 'highpass=f=80,lowpass=f=14000,afftdn=nf=-28,acompressor=threshold=-20dB:ratio=3:attack=8:release=120:makeup=2,loudnorm=I=-16:TP=-1.5:LRA=7'


def run(args):
    return subprocess.run(args, capture_output=True, text=True, check=True)


def speech_segments(path, noise='-38dB', pause=0.55):
    """Stretches of speech, split wherever there is at least `pause` seconds of silence."""
    log = run(['ffmpeg', '-nostats', '-v', 'info', '-i', path, '-af', f'silencedetect=noise={noise}:d={pause}', '-f', 'null', '-']).stderr
    starts = [float(x) for x in re.findall(r'silence_start: ([0-9.]+)', log)]
    ends = [float(x) for x in re.findall(r'silence_end: ([0-9.]+)', log)]
    duration = float(run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path]).stdout)
    segments, cursor = [], 0.0
    for start, end in zip(starts, ends + [duration]):
        if start - cursor > 0.15:
            segments.append({'start': round(cursor, 3), 'end': round(start, 3)})
        cursor = end
    if duration - cursor > 0.15:
        segments.append({'start': round(cursor, 3), 'end': round(duration, 3)})
    return segments, duration


def main():
    source = sys.argv[1]
    os.makedirs(OUT, exist_ok=True)
    clean = os.path.join(OUT, 'voice.wav')
    run(['ffmpeg', '-y', '-loglevel', 'error', '-i', source, '-ac', '1', '-ar', '48000', '-af', CHAIN, clean])
    segments, duration = speech_segments(clean)
    # A long line can contain a short pause; merge the closest neighbours until there are LINES segments.
    while len(segments) > LINES:
        gaps = [segments[i + 1]['start'] - segments[i]['end'] for i in range(len(segments) - 1)]
        i = gaps.index(min(gaps))
        segments[i:i + 2] = [{'start': segments[i]['start'], 'end': segments[i + 1]['end']}]
    json.dump({'duration': duration, 'lines': segments}, open(os.path.join(OUT, 'voice.json'), 'w'), indent=1)
    for n, seg in enumerate(segments, 1):
        print(f"line {n}: {seg['start']:6.2f} – {seg['end']:6.2f}  ({seg['end'] - seg['start']:.1f}s)")
    if len(segments) != LINES:
        print(f'expected {LINES} lines, found {len(segments)}: check the take (or pick lines by hand in voice.json)')
        sys.exit(1)


if __name__ == '__main__':
    main()
