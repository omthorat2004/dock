---
name: design-system
description: Dock's visual language — palette, type scale, spacing, component patterns, and the canvas grid. Load before writing or reviewing any UI, CSS, Tailwind class, or page layout in the frontend.
---

# Dock design system

Dock is a study tool students open for hours at a time, often the night before an
exam. The interface must read as calm, credible and boring-in-a-good-way — closer
to Stripe, Linear or Notion than to a crypto landing page.

## Non-negotiables

Never use, anywhere in the product:

- Neon or fluorescent accents (`#7c5cff`, cyan `#22d3ee`, lime, magenta). The
  brand accent is a *deep* violet; the ban is on the glowing ones next to it.
- Gradient text, glowing blur "blobs", or coloured drop shadows.
- More than **one** accent hue on a screen.
- Dark-by-default marketing pages. Light is the default; dark mode is a mirror.
- Decorative animation. Motion exists to explain a state change, nothing else.

## Palette

Light is the source of truth; every token has a dark counterpart. Defined once in
`src/app/globals.css` as CSS variables and exposed to Tailwind via `@theme inline`.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `background` | `#ffffff` | `#0b0d10` | Page base |
| `surface` | `#ffffff` | `#12151a` | Cards, panels |
| `subtle` | `#f7f8fa` | `#171b21` | Alternating section bands, inputs |
| `border` | `#e4e7ec` | `#252a32` | 1px hairlines |
| `foreground` | `#101828` | `#f2f4f7` | Body and headings |
| `muted` | `#5b6472` | `#98a2b3` | Secondary text — must hold 4.5:1 |
| `accent` | `#6538c9` | `#b39bf5` | One brand violet: links, primary fill, focus |
| `accent-hover` | `#542eaa` | `#c6b4f8` | The hover state of a primary fill, nothing else |
| `accent-subtle` | `#f4f0ff` | `#241a3d` | Accent-tinted backgrounds only |
| `success` / `danger` | `#067647` / `#b42318` | `#3ccb7f` / `#f97066` | State only, never decoration |
| `danger-subtle` | `#fef3f2` | `#2a1512` | The fill behind an error message |

Rules:

- Accent is for *action and focus*, not for atmosphere. If a screen has more than
  a few accent pixels outside buttons and links, it is over-used.
- Text on a coloured fill must pass 4.5:1. `muted` on `subtle` is the tightest
  pairing allowed — do not go lighter.
- Semantic colour never carries meaning alone; pair it with a label or icon.

## Typography

- One family: Geist Sans (`--font-sans`). Geist Mono only for numerals, code and
  step labels.
- Scale: `text-sm` (14) body-secondary, `text-base` (16) body, `text-lg` lead,
  then `text-2xl` / `text-3xl` / `text-4xl` / `text-5xl` for headings.
- Headings: `font-semibold` + `tracking-tight`. Never `font-bold` above `text-2xl`
  — it reads as shouting at display sizes.
- Body copy: `leading-relaxed`, max `65ch`. Use `text-balance` on headings and
  `text-pretty` on paragraphs.
- Eyebrows: `text-xs font-semibold uppercase tracking-widest text-muted` — not
  accent-coloured.

## Spacing and layout

- Container: `mx-auto w-full max-w-6xl px-6`. Prose blocks cap at `max-w-2xl`.
- Section rhythm: `py-16` mobile, `sm:py-24` desktop. Separate sections with a
  `border-t border-border` hairline or a `bg-subtle` band — not both.
- Radii: `rounded-lg` (8px) for controls, `rounded-xl` (12px) for cards. Nothing
  larger except pills.
- Elevation: borders first. At most `shadow-sm`; reserve `shadow-md` for elements
  that genuinely float (popovers, dragged canvas cards).

## Components

**Buttons** — three variants only:
- Primary: `bg-accent text-white hover:bg-accent/90`
- Secondary: `border border-border bg-surface hover:bg-subtle`
- Ghost: `text-muted hover:text-foreground`
All: `rounded-lg px-4 py-2.5 text-sm font-medium`, visible `focus-visible:ring-2
ring-accent/40`, and a `disabled:opacity-60 disabled:cursor-not-allowed` state.

**Cards** — `rounded-xl border border-border bg-surface p-6`. Hover state changes
the border, not the background.

**Inputs** — `rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm`,
focus `border-accent ring-2 ring-accent/20`. Every input has a real `<label>`.
Errors set `aria-invalid` and are announced via `aria-describedby`. A reveal toggle
(e.g. an API key) is a ghost icon button inside the field's right padding, with a
dynamic `aria-label` / `aria-pressed`.

**Modal** (`components/ui/modal.tsx`) — a labelled `role="dialog"` panel:
`rounded-xl border border-border bg-surface p-6 shadow-md` over a `bg-black/50`
backdrop. Closes on Escape and backdrop click, locks body scroll, and moves focus
into the panel. No animation, no portal.

**Chips** — removable pills for a set of entered values (e.g. syllabus topics):
`rounded-full border border-border bg-subtle`, each with a cross button carrying
`aria-label="Remove {label}"`.

**Space card** (the list) — a whole-card `<Link>`, `rounded-xl border p-6`,
lesson name, topic count, then `Updated 3 days ago` / `Created 26 Jul 2026` in
`text-xs text-muted`. Relative times come from `formatRelativeTime()`.

## The canvas grid

The grid is Dock's one signature element. Keep it quiet.

- `.grid-surface` paints a 40px square grid using `--grid-line`
  (`rgba(16,24,40,0.05)` light / `rgba(255,255,255,0.05)` dark).
- On marketing pages always pair it with `.grid-fade` so it dissolves at the
  edges instead of ending in a hard line.
- The grid is background texture only: never place it behind body copy at full
  strength, and never tint it with the accent.

### A space's canvas

- The **lesson** sits at the centre in the one accent-tinted panel on the surface
  (`border-accent/30 bg-accent-subtle`). Everything around it stays neutral —
  that single tint is the accent budget for the screen.
- **Topic cards** are `w-[272px]`, neutral, `shadow-sm`, with a mono syllabus ref,
  the title, a progress bar, and two actions: *Videos* (secondary, expands the
  shelf in place) and *Chat* (primary, opens learn mode).
- Progress bars are **neutral** (`bg-foreground/60` on `bg-border`), never accent
  — six accented bars would drown the one thing the accent is for. Always pair the
  bar with its `role="progressbar"` and a text label ("60% revised").
- **Learn mode is a panel, not a modal**: a right-hand `<aside>` with a left
  hairline, so the topic stays visible while you read. Escape closes it.
- Zoom is instant — no transition. A card in motion is the only place `shadow-md`
  is allowed.

## Accessibility

- Every interactive element is keyboard-reachable with a visible focus ring.
- Decorative SVG and background layers get `aria-hidden`.
- Respect `prefers-reduced-motion` for anything that moves.
- Semantic landmarks: one `<h1>` per page, real `<header>`/`<main>`/`<footer>`.
