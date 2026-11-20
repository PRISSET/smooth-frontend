# smooth-frontend

A Claude Code skill: rules and checks so a web frontend never jumps or stutters — zero layout shift on load and
reload, stable sizes in every state, transform/opacity-only animation, smooth tabs, menus and theme switches.

- `SKILL.md` — the rules and the checklist (Claude loads it automatically for frontend work).
- `scripts/cls.mjs` — layout shifts on page load with the element that moved: `node cls.mjs <url>... [--mobile] [--light]`.
- `scripts/frames.mjs` — slow frames during a click (theme switch, menu): `node frames.mjs <url> "<selector>"`.

Scripts need `playwright` in the current directory and Chrome (`CHROME` env overrides the binary path).

Install: clone into `~/.claude/skills/smooth-frontend`.
