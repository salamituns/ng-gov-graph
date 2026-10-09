"""Joins generated lines (line-1.wav … line-7.wav) into one narration with a fixed breath between them.

    python3 sound/assemble.py <dir with line-N.wav> <out.wav> [--gap 1.0]

Each line is trimmed of leading/trailing silence first, so the pauses are exactly `gap` seconds; the result
then goes through sound/voice.py like a recorded take (it finds the same seven lines from those pauses).
"""
import subprocess
import sys

args = sys.argv[1:]
gap = 1.0
if '--gap' in args:
    i = args.index('--gap')
    gap = float(args[i + 1])
    del args[i:i + 2]
folder, out = args

# Trim each line's edges, then interleave with silence: [1] [gap] [2] [gap] … [7].
inputs, chains, labels = [], [], []
for n in range(1, 8):
    inputs += ['-i', f'{folder}/line-{n}.wav']
    trim = 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.08,areverse'
    chains.append(f'[{n - 1}:a]aresample=48000,aformat=channel_layouts=mono,{trim}[l{n}]')
    labels.append(f'[l{n}]')
    if n < 7:
        chains.append(f'anullsrc=r=48000:cl=mono,atrim=duration={gap}[g{n}]')
        labels.append(f'[g{n}]')
graph = ';'.join(chains) + ';' + ''.join(labels) + f'concat=n={len(labels)}:v=0:a=1[out]'
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', *inputs, '-filter_complex', graph, '-map', '[out]', out], check=True)
print('wrote', out)
