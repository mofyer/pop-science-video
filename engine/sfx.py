"""Sound effects and an upbeat music bed synthesized from code: no samples, no licences, same bytes every run."""
import math
import random
import struct
import wave

RATE = 48000
# Peak level of one effect before mixing; narration is normalized to -16 LUFS and must stay in front.
SFX_PEAK = 0.2
MUSIC_STYLES = ("marimba",)


def _envelope(index, count, attack, decay):
    """Linear attack then exponential decay; decay is the time constant in seconds."""
    seconds = index / RATE
    rise = min(1.0, seconds / attack) if attack else 1.0
    return rise * math.exp(-seconds / decay) * min(1.0, (count - index) / (RATE * 0.004))


def _tone(seconds, pitch, attack=0.002, decay=0.08, partials=((1, 1.0),)):
    """pitch maps a 0..1 progress to Hz, so a sound can glide."""
    count = round(seconds * RATE)
    phases = [0.0] * len(partials)
    samples = []
    for index in range(count):
        hz = pitch(index / count)
        value = 0.0
        for slot, (ratio, level) in enumerate(partials):
            phases[slot] += 2 * math.pi * hz * ratio / RATE
            value += math.sin(phases[slot]) * level
        samples.append(value * _envelope(index, count, attack, decay))
    return samples


def _noise(seconds, seed, low, high, shape):
    """Band-limited noise: a one-pole low-pass minus a slower one; shape maps progress to gain."""
    count = round(seconds * RATE)
    source = random.Random(seed)
    fast = slow = 0.0
    samples = []
    for index in range(count):
        progress = index / count
        cutoff = low + (high - low) * math.sin(progress * math.pi)
        alpha = 1 - math.exp(-2 * math.pi * cutoff / RATE)
        white = source.uniform(-1, 1)
        fast += alpha * (white - fast)
        slow += alpha * 0.25 * (white - slow)
        samples.append((fast - slow) * shape(progress))
    return samples


def _pop():
    return _tone(0.11, lambda p: 520 + 640 * (1 - p) ** 2, decay=0.035)


def _tick():
    return _tone(0.05, lambda p: 1500, decay=0.012)


def _ding():
    return _tone(0.7, lambda p: 1318.5, decay=0.2, partials=((1, 1.0), (2.0, 0.35), (3.01, 0.18)))


def _rise():
    return _tone(0.36, lambda p: 392 * 2 ** (p * 1.0), attack=0.02, decay=0.5, partials=((1, 1.0), (2, 0.25)))


def _drop():
    return _tone(0.32, lambda p: 330 * 2 ** (-p * 0.9), attack=0.005, decay=0.16, partials=((1, 1.0), (0.5, 0.4)))


def _whoosh():
    return _noise(0.42, 7, 500, 5200, lambda p: math.sin(p * math.pi) ** 2)


def _sparkle():
    notes = [(0.0, 1568.0), (0.07, 1975.5), (0.14, 2349.3), (0.21, 3136.0)]
    samples = [0.0] * round(0.75 * RATE)
    for offset, hz in notes:
        for index, value in enumerate(_tone(0.5, lambda p, hz=hz: hz, decay=0.11, partials=((1, 1.0), (2.76, 0.2)))):
            samples[round(offset * RATE) + index] += value * 0.6
    return samples


SOUNDS = {"pop": _pop, "tick": _tick, "ding": _ding, "rise": _rise, "drop": _drop, "whoosh": _whoosh, "sparkle": _sparkle}
_rendered = {}


def render(name):
    """Mono samples of one effect, peak-normalized to SFX_PEAK."""
    if name not in _rendered:
        samples = SOUNDS[name]()
        peak = max(abs(value) for value in samples) or 1.0
        _rendered[name] = [value * SFX_PEAK / peak for value in samples]
    return _rendered[name]


def _write(path, samples):
    """Write mono float samples as 48 kHz stereo PCM16."""
    frames = bytearray()
    for value in samples:
        packed = struct.pack("<h", max(-32767, min(32767, round(value * 32767))))
        frames += packed + packed
    with wave.open(str(path), "wb") as output:
        output.setparams((2, 2, RATE, 0, "NONE", "not compressed"))
        output.writeframes(bytes(frames))


def bus(path, duration, events):
    """Place effects on a silent track of exactly `duration` seconds; events are (seconds, name).

    An effect that starts before 0 or runs past the end is cut at the edge rather than moved.
    """
    track = [0.0] * round(duration * RATE)
    for seconds, name in events:
        start = round(seconds * RATE)
        for index, value in enumerate(render(name)):
            position = start + index
            if 0 <= position < len(track):
                track[position] += value
    _write(path, track)


# C major pentatonic, one bar per chord; the bed loops every four bars.
_PROGRESSION = [(261.63, 329.63, 392.00), (220.00, 261.63, 329.63), (174.61, 220.00, 261.63), (196.00, 246.94, 293.66)]
_PATTERN = [0, 1, 2, 1, 0, 2, 1, 2]


def _add(track, start, samples, level):
    for index, value in enumerate(samples):
        position = start + index
        if position >= len(track):
            break
        track[position] += value * level


def music(path, duration, bpm, style="marimba"):
    """A light marimba arpeggio with a soft bass note and an off-beat shaker, for a lively explainer bed."""
    if style not in MUSIC_STYLES:
        raise ValueError(f"Unknown music style {style}")
    track = [0.0] * round(duration * RATE)
    eighth = 60.0 / bpm / 2
    notes = {}
    shaker = _noise(0.05, 3, 3000, 9000, lambda p: (1 - p) ** 3)
    step = 0
    while step * eighth < duration:
        start = round(step * eighth * RATE)
        chord = _PROGRESSION[(step // 8) % len(_PROGRESSION)]
        hz = chord[_PATTERN[step % 8]] * 2
        if hz not in notes:
            notes[hz] = _tone(0.55, lambda p, hz=hz: hz, attack=0.003, decay=0.16, partials=((1, 1.0), (3.9, 0.22), (9.2, 0.05)))
        _add(track, start, notes[hz], 0.5 if step % 2 == 0 else 0.34)
        if step % 8 == 0:
            bass = chord[0] / 2
            if bass not in notes:
                notes[bass] = _tone(1.1, lambda p, bass=bass: bass, attack=0.01, decay=0.45, partials=((1, 1.0), (2, 0.2)))
            _add(track, start, notes[bass], 0.55)
        if step % 2 == 1:
            _add(track, start, shaker, 0.12)
        step += 1
    peak = max(abs(value) for value in track) or 1.0
    _write(path, [value * 0.5 / peak for value in track])
