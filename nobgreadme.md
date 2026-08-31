<!--
  EXPERIMENT — the same profile page with no card backgrounds.

  Identical to PROFILE-README.md except every image points at assets/bare/, which
  is rendered by `node scripts/update_pet.js --bare`. Same art, same numbers, no
  panel and no border behind any of it.

  Read this on GitHub to judge it. Two things to know before you do:

  1. It only works on a dark page. The palettes use near-white type and the card
     background was the only thing making it legible — on GitHub's light theme
     the artwork survives but most of the numbers and labels vanish. Switch your
     theme to see both. docs/development.md has the detail.

  2. assets/bare/ is a one-off render. Nothing regenerates it, so it freezes at
     whatever the numbers were when it was made, while the real cards keep
     updating daily. Wiring it into pet.yml is a one-line change if this is
     worth keeping.

  Nothing here is referenced by the real profile. Deleting this file and
  assets/bare/ removes the experiment completely.
-->

# No-background experiment

<sub>The live version is <a href="./PROFILE-README.md">PROFILE-README.md</a>.
This is the same page with the panels taken off.</sub>

---

<p align="center">
  <img src="https://raw.githubusercontent.com/masabinhok/grub/main/assets/bare/banner.svg" alt="Profile banner" width="840">
</p>





<p align="center">
  <img src="https://raw.githubusercontent.com/masabinhok/grub/main/assets/bare/divider.svg" width="840">
</p>



<p align="center">
  <a href="https://github.com/masabinhok/grub/issues/new?title=feed%20GRUB%20%F0%9F%8D%93&body=%F0%9F%8D%93%20**A%20snack%20has%20been%20prepared%20for%20GRUB.**%0A%0A-%20**Ration%3A**%20one%20%281%29%20suspiciously%20ripe%20strawberry%0A-%20**Delivered%20by%3A**%20a%20passing%20stranger%20with%20good%20intentions%0A-%20**Nutritional%20value%3A**%20none%20%E2%80%94%20purely%20emotional%0A%0A%3C!--%20Submit%20this%20issue%20to%20feed%20the%20pet%20and%20your%20name%20will%20be%20displayed%20on%20his%20card.%20--%3E%0A%0A**Just%20press%20%60Submit%20new%20issue%60.**%20GRUB%20will%20chew%2C%20sparkle%20and%20wear%20*your%20username*%20on%20his%20card%20for%20the%20next%2024%20hours%2C%20then%20close%20this%20issue%20himself.%0A%0A_Snacks%20are%20cosmetic%20%E2%80%94%20they%20cannot%20keep%20him%20alive.%20Only%20commits%20do%20that%2C%20and%20that%20is%20my%20problem%2C%20not%20yours._">
    <img src="https://raw.githubusercontent.com/masabinhok/grub/main/assets/bare/pet.svg" alt="GRUB, the tamagotchi of shame — click to feed him" width="540">
  </a>
</p>


<p align="center">
  <img src="https://raw.githubusercontent.com/masabinhok/grub/main/assets/bare/divider.svg" width="840">
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/masabinhok/grub/main/assets/bare/streak.svg" width="420" alt="Commit streak">
  <img src="https://raw.githubusercontent.com/masabinhok/grub/main/assets/bare/star.svg" width="420" alt="Stars earned">
</p>

<!--
  On the real profile this comes from the Worker, which counts the fetch. Here it
  is the static bare card instead, because the Worker serves the backgrounded one.
  So this page shows the look but does not move the counter — which is what you
  want from a preview.
-->
<p align="center">
  <img src="https://raw.githubusercontent.com/masabinhok/grub/main/assets/bare/eye.svg" width="420" alt="Profile views, and people who fed him">
  <img src="https://raw.githubusercontent.com/masabinhok/grub/main/assets/bare/languages.svg" width="420" alt="Most used languages">
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/masabinhok/grub/main/assets/bare/divider.svg" width="840">
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/masabinhok/grub/main/assets/bare/marquee.svg" width="840" alt="Status ticker">
</p>
<p align="center">
  <img src="https://raw.githubusercontent.com/masabinhok/grub/main/assets/bare/divider.svg" width="840">
</p>

<p align="center">
  <sub>Experiment. The real page is
  <a href="./PROFILE-README.md">PROFILE-README.md</a> — these cards are a
  one-off render and do not update.</sub>
</p>