"""The beat table: reveal phrases turned into seconds on the film's timeline.

One table drives both what moves on screen and when a sound effect plays, so they cannot drift apart.
"""


def _letters(text):
    return sum(char.isalnum() for char in text)


def phrase_time(narration, cues, phrase, timing):
    """Seconds from the scene's start at which `phrase` is spoken.

    `cue` timing is the start of the subtitle cue holding the phrase; `word` timing is the phrase's own
    first character when the narration has per-character times, and the cue start otherwise.
    """
    at, position = narration.index(phrase), 0
    for cue in cues:
        if at < position + len(cue["text"]):
            starts = cue.get("char_starts")
            if timing == "word" and starts:
                return starts[min(_letters(cue["text"][:at - position]), len(starts) - 1)]
            return cue["start"]
        position += len(cue["text"])
    raise ValueError(f"Phrase {phrase!r} is not inside the subtitle cues")


def beats(resolved, timeline):
    """{scene id: {reveal key: seconds on the film's timeline}} for every scene."""
    table = {}
    for scene, timed in zip(resolved["scenes"], timeline["scenes"]):
        table[scene["id"]] = {key: timed["start"] + phrase_time(scene["narration"], timed["subtitles"], phrase, resolved["reveal_timing"])
                              for key, phrase in scene["reveals"].items()}
    return table


def sound_events(resolved, timeline):
    """[(seconds, sound name)] in timeline order; the anchor `start` is the scene's first frame."""
    table, events = beats(resolved, timeline), []
    for scene, timed in zip(resolved["scenes"], timeline["scenes"]):
        for anchor, sound in scene["sfx"].items():
            events.append((timed["start"] if anchor == "start" else table[scene["id"]][anchor], sound))
    return sorted(events)
