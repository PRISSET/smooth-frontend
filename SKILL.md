---
name: smooth-frontend
description: Rules and checks so a web frontend never jumps or stutters - zero layout shift on load and reload, smooth 60fps animations, stable sizes across loading/empty/logged-in states, smooth tabs, menus and theme switches. Use whenever building or changing frontend layout, components, animations, fonts, banners, skeletons, tabs, dropdowns or a theme toggle, and when the user says the page "дёргается", "прыгает", "лагает", "не плавно", jumps, flickers, shifts or stutters.
---

# Smooth frontend: nothing jumps, everything glides

Apply these while writing the code, not after. Then measure (end of file). The target: CLS 0.000 on every main
page (desktop and phone), no element changes size or position after first paint, animations on the compositor only.

## 1. Every state has the same box

An element that changes state must keep its width and height in every state: loading, empty, logged out, logged in, error.
- Session-dependent UI (account button, avatar, "Войти"): one fixed size for all states, e.g. a 40px circle. The
  placeholder is in the server HTML, never `null` on the server and a 100px button on the client. Icon-only buttons
  with `aria-label` keep the width constant; a text label that appears later is a shift.
- Skeletons match the final layout: same height, same grid, same radius. If the real block's height varies, give the
  container `min-h` equal to the skeleton.
- Counters and numbers: `tabular-nums` and a min width so 9 -> 10 does not push neighbours.
- Media: always an aspect-ratio box (`aspect-ratio`, or width/height attributes) before the image loads.

## 2. Render on the server what is above the fold

Anything that renders client-side after fetch (banners, promos, "for you" blocks) pushes the content below it.
Fetch it in the server component and pass it as an `initial` prop; the client may refresh it later in the same box.
If it truly must be client-only, reserve its exact box (aspect-ratio) in the server HTML.

## 3. Fonts must not reflow

- Self-host / `next/font`. If the font has no metric overrides (Next warns "Failed to find font override values"),
  set `adjustFontFallback: false` and write a fallback `@font-face` over a local font with `size-adjust`,
  `ascent-override`, `descent-override` computed from the real font's metrics (fontTools: unitsPerEm, hhea
  ascender/descender, average width ratio vs the local font).
- Icon fonts (Material Symbols etc.): subset to the glyphs used, preload, `font-display: block` - otherwise the
  ligature name ("favorite") shows as wide text, then collapses.
- Icon sizes: keep `container - icon` even (24/16, 32/20, 40/24), otherwise the glyph snaps half a pixel off-centre
  inside round badges.

## 4. Animate only transform and opacity

- Allowed: `transform`/`translate`/`scale`/`rotate`, `opacity`, `clip-path`. Never animate width, height, top, left,
  margin, padding, font-size, box-shadow blur radius.
- Height changes (tab panels, accordions): lock the old height with `min-height`, let the new content settle
  (ResizeObserver, ~300 ms quiet), then ease `min-height` to the new size and remove it.
- No `backdrop-filter` over anything that moves (animated background, video): it re-renders every frame and stutters
  without a GPU. Use a near-opaque surface (90-95%) instead - it looks the same.
- Fixed decorative backgrounds: `position: fixed; height: 100lvh` (not 100vh/dvh) so the mobile address bar does
  not resize them.
- Infinite background animations: slow (100 s+), transform only, paused under `prefers-reduced-motion`, and paused
  during heavy transitions.
- Springs: M3 `linear()` spring tokens or `cubic-bezier(0.2, 0, 0, 1)`; enter 250-500 ms, exit faster (100-200 ms).
- Lists: stagger 30-40 ms, cap at ~6 items; items further down animate by scroll timeline (`animation-timeline: view()`).
- Chrome bug: a reused element switching from a time animation to a scroll-timeline animation can get a startTime in
  the future and stay invisible. Key list containers by filter/page so React remounts them.

## 5. Interactions

- **Dropdowns / menus**: always mounted, toggled by a `data-open` attribute with CSS transitions (scale from the
  anchor corner + opacity, `visibility` delayed on close, `inert` while closed). Mount/unmount with `{open && ...}`
  cannot animate the close.
- **Tabs**: one indicator element moved with `transform: translateX() scaleX()`, measured from the active tab in
  `useLayoutEffect`; enable its transition only after the first placement. Content enters with a short shared-axis
  slide (+-32px + fade) in the direction of travel. Route tabs use `scroll={false}`.
- **Theme switch** with a View Transition circle: during the transition set a class on `<html>` that disables all
  CSS transitions (`transition: none !important`) and pauses background animations - otherwise every element
  re-colours over 200 ms under the live clip and frames drop. Render both theme icons and show one via CSS keyed on
  `data-theme` (set by an inline head script before paint), so hydration swaps nothing.
- **Hover**: no lift/translate on cards unless the user wants it; change colour or radius with a spring.
- **Route loading fallbacks** (`loading.tsx`): delay them ~350 ms with an animation-delay fade, so fast navigations
  and reloads never flash a skeleton.

## 6. Measure, do not guess

Run after every deploy of layout work (no screenshots needed - these read the DOM). Run from a directory where
`playwright` is installed (the project, or `npm i -D playwright` once):

```bash
node ~/.claude/skills/smooth-frontend/scripts/cls.mjs https://site/ https://site/page/ 
node ~/.claude/skills/smooth-frontend/scripts/cls.mjs https://site/ --mobile
node ~/.claude/skills/smooth-frontend/scripts/frames.mjs https://site/ 'button[aria-label="Тёмная тема"]'
```

`cls.mjs` prints each shift with the element and its rect before -> after (`y`, `w`, `h`): that tells exactly what
grew or appeared. Fix until every main page shows CLS 0.0000 on desktop and phone. Shifts of elements far below
the viewport (e.g. a streamed Suspense block swap) are artifacts - confirm with a per-frame rect trace before chasing
them. `frames.mjs` compares before/after for an interaction; headless Chrome has no GPU, so judge the change, not the
absolute number, and let the user confirm on real hardware.

## Checklist before saying "done"

- [ ] Every session/loading-dependent element has one fixed box in all states, present in server HTML
- [ ] Above-the-fold data rendered on the server (no client-only banners on top)
- [ ] Fonts: fallback metrics matched; icon font subset + preloaded + `block`
- [ ] Animations: transform/opacity/clip-path only; no backdrop-filter over moving layers; reduced-motion handled
- [ ] Menus/tabs/theme switch follow section 5
- [ ] `cls.mjs` = 0.0000 on main pages, desktop and `--mobile`
