# Configuration

`grub.config.json` holds everything you'd want to change. It is **read only** —
the bot never writes it, so your edits survive every run. Delete the file and the
built-in defaults produce byte-identical output.

- [The keys](#the-keys)
- [Your own snacks, quotes and insults](#your-own-snacks-quotes-and-insults)
- [Writing your own copy](#writing-your-own-copy)
- [The daily quote](#the-daily-quote)

---

## The keys

Abridged — see [`grub.config.json`](../grub.config.json) for every key:

```json
{
  "petName": "GRUB",
  "tagline": "// THE TAMAGOTCHI OF SHAME",
  "timezone": "Asia/Kathmandu",
  "github": { "username": null, "includePrivate": false, "repo": null },
  "components": { "banner": true, "cta": true, "eye": true, "marquee": true },
  "marquee": { "text": null, "mode": "scroll", "separator": "   ·   " },
  "cta": { "upstream": "masabinhok/grub" },
  "copy": { "replace": false, "lines": {}, "quotes": [], "snacks": [] },
  "inventory": {
    "slots": [
      { "slot": "Primary", "item": "NestJS" },
      { "slot": "Companion", "item": "GRUB" }
    ]
  },
  "labels": { "eye": { "lurkers": "LURKERS", "fed": "FED" } },
  "taglines": {},
  "palette": {}
}
```

| Key | Effect |
| --- | --- |
| `petName` | Renames the creature everywhere, including the tombstone |
| `tagline` | The `//` subtitle beside his name on the pet card |
| `timezone` | IANA zone whose midnight ends a day. Change the cron in `pet.yml` to match |
| `github.username` | Whose profile to track. `null` auto-detects from CI or the git remote |
| `github.includePrivate` | Let private contributions feed him ([the trade-off](./setup.md#feeding-it-on-private-repos)) |
| `github.repo` | `owner/name` whose traffic the eye watches. `null` auto-detects |
| `components.*` | Set any to `false` and that SVG is never written |
| `cta.upstream` | `owner/name` the adoption button points at. Left alone, your fork advertises the template it came from |
| `copy.lines` | Extra insults, per mood. Added to the built-in pools |
| `copy.quotes` | Extra marquee lines. Added to the built-in rotation |
| `copy.snacks` | Extra things people can feed him. Added to the pantry |
| `copy.replace` | `true` drops the built-in pools entirely and uses only yours |
| `labels.pet.feedMe` | The plea on the placard above his head. Long strings shrink to fit |
| `labels.pet.fedBy` | What the placard says instead once somebody has fed him |
| `marquee.text` | A string, or an array joined with `separator`. `null` runs the daily quote rotation |
| `marquee.mode` | `"scroll"` or `"type"` |
| `inventory.slots` | Any number of `{ slot, item }` rows. The one matching `petName` becomes the live companion |
| `labels.*` | Every fixed string on every card |
| `taglines` | The banner subtitle, per mood. All four say `what i do is art` out of the box; give one mood a different string and the others keep theirs |
| `palette` | Per-mood colour overrides, e.g. `{ "feral": { "accent": "#ff0000" } }` |

---

## Your own snacks, quotes and insults

Everything the creature can say or be handed is extensible from the config,
without touching `scripts/lib/` at all. One block:

```json
{
  "copy": {
    "replace": false,
    "lines": {
      "feral": ["I have eaten the LICENSE. It was permissive."],
      "deceased": ["Cause of death: one more refactor."]
    },
    "quotes": ["Weeks of coding can save you hours of planning."],
    "snacks": [
      {
        "id": "mango",
        "name": "a mango",
        "tint": "t",
        "cell": 3,
        "response": "Seasonal, sticky, and gone in four seconds.",
        "art": [".##.", "#o##", "####", ".##."]
      }
    ]
  }
}
```

**Yours are added to the built-ins, not swapped for them.** These are pools of
things he can say, and one more is almost always what people mean. Set
`copy.replace` to `true` to start from an empty mouth and use only your own — a
mood you never mention still keeps its built-ins either way, because an empty
pool would leave him silent at exactly the moment the card needs a line.

### The snack schema

| Field | Required | Rules |
| --- | --- | --- |
| `id` | yes | Lowercase `a-z0-9-`, max 24. Reusing a built-in id **replaces** that snack |
| `name` | yes | Reads mid-sentence: "fed GRUB **a mango**" |
| `response` | yes | One line of GRUB reacting, in the issue reply |
| `art` | yes | 1–12 rows, all the same width, max 12 wide. `.` transparent, `#` the tint, `o` the highlight |
| `tint` | no | Palette key: `m`, `t`, `w`, `x`, `d`, `ink`, `accent`. Defaults to `m` |
| `cell` | no | Pixels per art cell, 1–6. Defaults to 3 |

A snack that breaks any of those is **dropped with a warning in the job log** and
the run continues. A card that renders is worth more than a strict parse, so a
typo in your config costs you one snack rather than the whole profile.

Which snack a given feed gets is derived from the feeder's login and the date, so
`feed_grub.js` and the renderer independently agree — the issue reply says "a
mango" and the card genuinely rains mangoes, with nothing passed between the two
but the id in `pet-state.json`.

Want yours in everybody's fork instead of just your own? That is a PR —
[Add a snack](../CONTRIBUTING.md#add-a-snack).

---

## Writing your own copy

Rename the pet and write your own insults — the defaults are calibrated for me,
not you. Everything he says lives in `scripts/lib/copy.js`: the insult pool, the
banner subtitle, and `QUOTES`, the marquee's rotation. The food lives next door in
`scripts/lib/snacks.js`.

Editing those files replaces the defaults for your fork; the `copy` block above
adds to them without touching the source, which is the easier thing to keep in
sync when you pull upstream changes.

---

## The daily quote

Leave `marquee.text` at `null` and the ticker runs one line a day from `QUOTES` —
jokes, a few genuinely-attributed quotes, and facts that are worth a second look.
Thirty of them, indexed by whole UTC days, so it turns over at midnight and does
not repeat inside a month. Add your own to the array; the ticker takes any length
and scrolls it. Set `marquee.text` to a string or an array and yours wins instead.

---

← [Embedding the cards](./embedding.md) · Next: [Feeding him](./feeding.md)
