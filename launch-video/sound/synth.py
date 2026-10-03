"""Synthesises the launch film's sound effects from scratch (no samples, no licences).

    python3 sound/synth.py      -> public/sfx/{click,whoosh,rise,resolve}.wav  (48 kHz, 16-bit stereo)

Restrained on purpose: the story is in the captions; the sound only gives the clicks and camera moves weight.
"""
import os
import wave

import numpy as np

RATE = 48000
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'sfx')
rng = np.random.default_rng(9)


def t_axis(seconds):
    return np.arange(int(seconds * RATE)) / RATE


def lowpass(signal, cutoff):
    """One-pole low-pass; `cutoff` may be a per-sample array (a sweep)."""
    cutoff = np.broadcast_to(cutoff, signal.shape)
    a = 1 - np.exp(-2 * np.pi * cutoff / RATE)
    out = np.empty_like(signal)
    y = 0.0
    for i, x in enumerate(signal):
        y += a[i] * (x - y)
        out[i] = y
    return out


def write(name, left, right=None):
    right = left if right is None else right
    stereo = np.stack([left, right], axis=1)
    peak = np.max(np.abs(stereo)) or 1
    stereo = stereo / peak * 0.89  # headroom; the film sets each sound's level
    fade = min(len(stereo), int(0.004 * RATE))
    stereo[-fade:] *= np.linspace(1, 0, fade)[:, None]
    data = (stereo * 32767).astype(np.int16)
    with wave.open(os.path.join(OUT, f'{name}.wav'), 'wb') as f:
        f.setnchannels(2)
        f.setsampwidth(2)
        f.setframerate(RATE)
        f.writeframes(data.tobytes())


def click():
    """A soft, glassy UI tick: two short tones and a breath of noise."""
    t = t_axis(0.09)
    body = np.sin(2 * np.pi * 2300 * t) * np.exp(-t / 0.005) + 0.55 * np.sin(2 * np.pi * 950 * t) * np.exp(-t / 0.014)
    air = lowpass(rng.standard_normal(len(t)), 5000) * np.exp(-t / 0.003) * 0.6
    write('click', body + air)


def whoosh():
    """Air moving past: noise swept up then down in brightness, panned left to right."""
    t = t_axis(0.75)
    k = t / t[-1]
    env = np.sin(np.pi * np.clip(k / 0.9, 0, 1)) ** 2.2
    cutoff = 400 + 3600 * np.sin(np.pi * k) ** 1.5
    noise = lowpass(rng.standard_normal(len(t)), cutoff) * env
    pan = 0.25 + 0.5 * k
    write('whoosh', noise * np.cos(pan * np.pi / 2), noise * np.sin(pan * np.pi / 2))


def rise():
    """Under the title: a filtered-noise swell with a gliding tone, landing as the words do."""
    t = t_axis(2.2)
    k = t / t[-1]
    env = k ** 2.4 * (1 - np.clip((k - 0.93) / 0.07, 0, 1))
    swell = lowpass(rng.standard_normal(len(t)), 250 + 5000 * k ** 2) * env
    glide = np.sin(2 * np.pi * np.cumsum(180 + 260 * k ** 2) / RATE) * env * 0.35
    write('rise', swell + glide, swell * 0.92 + glide)


def resolve():
    """The end card: a warm major chord that blooms and fades, like a door opening."""
    t = t_axis(3.6)
    attack = np.clip(t / 0.09, 0, 1)
    tail = np.exp(-t / 1.25)
    chord = sum(amp * (np.sin(2 * np.pi * f * t) + 0.18 * np.sin(4 * np.pi * f * t)) for f, amp in [(220.0, 1.0), (277.18, 0.7), (329.63, 0.75), (440.0, 0.5), (659.26, 0.22)])
    shimmer = np.sin(2 * np.pi * 1318.5 * t) * np.exp(-t / 0.5) * 0.12
    left = (chord + shimmer) * attack * tail
    right = (chord * 0.97 + shimmer * 1.1) * attack * tail
    write('resolve', left, right)


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for make in (click, whoosh, rise, resolve):
        make()
        print('wrote', make.__name__)
