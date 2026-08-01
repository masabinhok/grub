# Embedding the cards

The cards are plain SVG files committed to the repo. Point an `<img>` at the raw
URL and GitHub renders them anywhere images are allowed.

- [The cards](#the-cards)
- [Copy-paste blocks](#copy-paste-blocks)
- [A full layout](#a-full-layout)
- [What SVGs can't do here](#what-svgs-cant-do-here)

---

## The cards

The pet is the centrepiece, but the same state file themes a whole set of cards.
Every one of them reads GRUB's mood, so when he starves the entire README
desaturates together — and when he dies, **nothing on the page animates at all.**

| File | Size | What it shows |
| --- | --- | --- |
| `assets/banner.svg` | 840×120 | Name, location, mood-reactive status pips |
| `assets/marquee.svg` | 840×88 | CRT ticker — a new joke, quote or fact every day |
| `assets/divider.svg` | 840×12 | Dashed rule that drifts while alive, freezes when dead |
| `assets/pet.svg` | 540×300 | GRUB himself, asking to be fed |
| `assets/streak.svg` | 420×180 | A fire the size of your streak, one coal per day |
| `assets/eye.svg` | 420×180 | An eye that watches back. Lurkers vs. people who fed him |
| `assets/star.svg` | 420×180 | One glazed star holding every star you've earned |
| `assets/stats.svg` | 420×180 | Repos, stars, followers, contributions |
| `assets/languages.svg` | 420×180 | Top languages as a segmented bar |
| `assets/inventory.svg` | 420×196 | Tech stack as an RPG equipment screen |
| `assets/cta.svg` | 840×64 | An adoption button — "use this template", mood-themed |

`inventory.svg` grows with your slot list — 196px at four slots, +30px each after.

Three of them are deliberately single-minded — one number, one piece of art, no
supporting paragraph:

- **The eye** blinks on a loop, drifts its pupil around like it is reading over
  your shoulder, and takes the iris colour from GRUB's mood. When he dies it
  closes and stays closed. Beside it: `LURKERS`, everyone who turned up, and
  `FED`, the ones who did something about it. The gap is the point — see
  [What `LURKERS` actually counts](./feeding.md#what-lurkers-actually-counts).
- **The star** is a five-pointer under a highlight that sweeps across it on a
  loop, with rays turning slowly behind and sparkles firing off the points. Dead
  pet, dead star: grey metal, no sweep.
- **The streak** is a fire. It grows with every consecutive day and there is one
  coal in the bed per day of the current streak, so a ten-day streak is a tall
  flame over ten coals. Break the streak and you get a cold pile and a thread of
  smoke.

The 840-wide cards span a full row. The 420-wide ones pair up two to a line, and
`pet.svg` sits comfortably next to nothing, so give it its own row.

---

## Copy-paste blocks

Replace `USERNAME/REPO` in each. Use the **raw** URL, not a relative path —
relative paths only resolve inside the repo that holds the file, so they break the
moment you paste them into your profile README.

**Banner** — 840×120

```html
<img src="https://raw.githubusercontent.com/USERNAME/REPO/main/assets/banner.svg" width="840" alt="Profile banner">
```

**Marquee** — 840×88

```html
<img src="https://raw.githubusercontent.com/USERNAME/REPO/main/assets/marquee.svg" width="840" alt="Status ticker">
```

**Divider** — 840×12

```html
<img src="https://raw.githubusercontent.com/USERNAME/REPO/main/assets/divider.svg" width="840" alt="">
```

**Pet** — 540×300. Wrap it in a link to the feed issue so people can act on the
plea the card is making:

```html
<a href="https://github.com/USERNAME/REPO/issues/new?title=feed%20GRUB">
  <img src="https://raw.githubusercontent.com/USERNAME/REPO/main/assets/pet.svg" width="540" alt="GRUB, the tamagotchi of shame">
</a>
```

**Streak** — 420×180

```html
<img src="https://raw.githubusercontent.com/USERNAME/REPO/main/assets/streak.svg" width="420" alt="Commit streak">
```

**Eye** — 420×180

```html
<img src="https://raw.githubusercontent.com/USERNAME/REPO/main/assets/eye.svg" width="420" alt="Lurkers versus people who fed him">
```

**Star** — 420×180

```html
<img src="https://raw.githubusercontent.com/USERNAME/REPO/main/assets/star.svg" width="420" alt="Stars earned">
```

**Stats** — 420×180

```html
<img src="https://raw.githubusercontent.com/USERNAME/REPO/main/assets/stats.svg" width="420" alt="Profile statistics">
```

**Languages** — 420×180

```html
<img src="https://raw.githubusercontent.com/USERNAME/REPO/main/assets/languages.svg" width="420" alt="Most used languages">
```

**Inventory** — 420×196

```html
<img src="https://raw.githubusercontent.com/USERNAME/REPO/main/assets/inventory.svg" width="420" alt="Equipped skills">
```

**Adoption button** — 840×64. Wrap it in a link to the template's `/generate`
page, the same way the pet card wraps a link to the feed issue — the SVG cannot
carry the link itself:

```html
<a href="https://github.com/masabinhok/grub/generate">
  <img src="https://raw.githubusercontent.com/USERNAME/REPO/main/assets/cta.svg" width="840" alt="Use this template — adopt your own GRUB">
</a>
```

Point `cta.upstream` in `grub.config.json` at whichever repo the button should
advertise, and change the `href` to match. Left alone it sends people to the
original, which is how a fork pays rent.

---

## A full layout

[`PROFILE-README.md`](../PROFILE-README.md) is the finished version of this — a
complete profile page with the feeding call-to-action, real URLs and every card
in place. Copy it to `USERNAME/USERNAME/README.md` and change the two names.

The bare layout, everything at once, with the rows lined up:

```html
<p align="center">
  <img src="https://raw.githubusercontent.com/USERNAME/REPO/main/assets/banner.svg" width="840" alt="Profile banner">
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/USERNAME/REPO/main/assets/marquee.svg" width="840" alt="Status ticker">
</p>

<p align="center">
  <a href="https://github.com/USERNAME/REPO/issues/new?title=feed%20GRUB">
    <img src="https://raw.githubusercontent.com/USERNAME/REPO/main/assets/pet.svg" width="540" alt="GRUB, the tamagotchi of shame">
  </a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/USERNAME/REPO/main/assets/streak.svg" width="420" alt="Commit streak">
  <img src="https://raw.githubusercontent.com/USERNAME/REPO/main/assets/star.svg" width="420" alt="Stars earned">
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/USERNAME/REPO/main/assets/eye.svg" width="420" alt="Lurkers versus people who fed him">
  <img src="https://raw.githubusercontent.com/USERNAME/REPO/main/assets/stats.svg" width="420" alt="Profile statistics">
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/USERNAME/REPO/main/assets/languages.svg" width="420" alt="Most used languages">
  <img src="https://raw.githubusercontent.com/USERNAME/REPO/main/assets/inventory.svg" width="420" alt="Equipped skills">
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/USERNAME/REPO/main/assets/divider.svg" width="840" alt="">
</p>
```

---

## What SVGs can't do here

One limitation worth knowing: SVGs embedded via `<img>` cannot contain working
hyperlinks, so anything clickable has to be markdown around the image (or an
`<a>` wrapping the whole card). Same sandbox rules kill external fonts, external
CSS and any JavaScript, which is why the pixel type is drawn as rectangles and the
text uses a system monospace stack.

GitHub also proxies README images through its `camo` cache, so a freshly updated
pet can lag by a few minutes before it shows up on your profile.

---

← [Setup](./setup.md) · Next: [Configuration](./configuration.md)
