"""Picks the best take of each sentence, then joins each line's sentences into line-N.wav.

    python sound/pick_takes.py <dir with line-N-take-K.wav>

Scores each take by how closely a speech-to-text transcript matches the script, compared only against the
other takes of the same line (the transcriber is weak on Nigerian-accented speech, so absolute scores mean
little), and by pace: a take much faster than the voice's own natural speed has usually dropped words. Each line's
chosen sentences are joined with a short breath and slowed slightly (pitch kept) so it never sounds rushed.
Needs faster-whisper.
"""
import difflib
import glob
import os
import re
import shutil
import subprocess
import sys

sys.path.insert(0, os.path.dirname(__file__))
from yarn_tts import PARTS  # noqa: E402

from faster_whisper import WhisperModel  # noqa: E402

folder = sys.argv[1]
model = WhisperModel('base.en', device='cpu', compute_type='int8')
words = lambda text: re.sub(r'[^a-z0-9 ]', '', text.lower().replace('-', ' ')).split()


def duration(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path], capture_output=True, text=True)
    return float(out.stdout)


BREATH = 0.25
SLOWER = 0.9


def best_take(n, p, text):
    takes = sorted(glob.glob(os.path.join(folder, f'line-{n}-{p}-take-*.wav')))
    script = words(text)
    scored = []
    for take in takes:
        heard = ' '.join(seg.text for seg in model.transcribe(take, beam_size=5, language='en')[0])
        match = difflib.SequenceMatcher(None, script, words(heard)).ratio()
        pace = len(script) / max(0.1, duration(take))
        # Jude reads at ~4.5 words a second; well above that, words are being swallowed.
        off = max(0.0, pace - 5.0) + max(0.0, 2.0 - pace)
        scored.append((match - 0.3 * off, match, pace, take, heard.strip()))
    best = max(scored)
    for score, match, pace, take, heard in scored:
        print(f"{'*' if take == best[3] else ' '} {n}.{p} {os.path.basename(take)}: match {match:.0%}, {pace:.1f} w/s | {heard}")
    return best[3]


for n, parts in enumerate(PARTS, 1):
    chosen = [best_take(n, p, text) for p, text in enumerate(parts, 1)]
    if not all(chosen):
        continue
    inputs, chains, labels = [], [], []
    for i, path in enumerate(chosen):
        inputs += ['-i', path]
        trim = 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse'
        chains.append(f'[{i}:a]aresample=48000,aformat=channel_layouts=mono,{trim}[s{i}]')
        labels.append(f'[s{i}]')
        if i < len(chosen) - 1:
            chains.append(f'anullsrc=r=48000:cl=mono,atrim=duration={BREATH}[b{i}]')
            labels.append(f'[b{i}]')
    graph = ';'.join(chains) + ';' + ''.join(labels) + f'concat=n={len(labels)}:v=0:a=1,atempo={SLOWER}[out]'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', *inputs, '-filter_complex', graph, '-map', '[out]', os.path.join(folder, f'line-{n}.wav')], check=True)
