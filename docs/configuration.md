# Configuration

`grub.config.json` holds everything you'd want to change. It is **read only** —
the bot never writes it, so your edits survive every run. Delete the file and the
built-in defaults produce byte-identical output.

- [The keys](#the-keys)
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
  "components": { "banner": true, "eye": true, "star": true, "marquee": true },
  "marquee": { "text": null, "mode": "scroll", "separator": "   ·   " },
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
| `labels.pet.feedMe` | The plea on the placard above his head. Long strings shrink to fit |
| `labels.pet.fedBy` | What the placard says instead once somebody has fed him |
| `marquee.text` | A string, or an array joined with `separator`. `null` runs the daily quote rotation |
| `marquee.mode` | `"scroll"` or `"type"` |
| `inventory.slots` | Any number of `{ slot, item }` rows. The one matching `petName` becomes the live companion |
| `labels.*` | Every fixed string on every card |
| `taglines` | The banner subtitle, per mood. All four say `what i do is art` out of the box; give one mood a different string and the others keep theirs |
| `palette` | Per-mood colour overrides, e.g. `{ "feral": { "accent": "#ff0000" } }` |

---

## Writing your own copy

Rename the pet and write your own insults — the defaults are calibrated for me,
not you. Everything he says lives in `scripts/lib/copy.js`: the insult pool, the
banner subtitle, and `QUOTES`, the marquee's rotation.

---

## The daily quote

Leave `marquee.text` at `null` and the ticker runs one line a day from `QUOTES` —
jokes, a few genuinely-attributed quotes, and facts that are worth a second look.
Thirty of them, indexed by whole UTC days, so it turns over at midnight and does
not repeat inside a month. Add your own to the array; the ticker takes any length
and scrolls it. Set `marquee.text` to a string or an array and yours wins instead.

---

← [Embedding the cards](./embedding.md) · Next: [Feeding him](./feeding.md)
