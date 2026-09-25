<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# The flight is a comic

`/` is not a scrolling portfolio with a space theme on top of it. It is one
continuous journey, and every screen is a panel of it. Written down here
because none of it is derivable from the code: the code can tell you a card
fades between two progress values, not that the card is a place the traveller
arrives at.

**The story is Umar's, and Umar writes it.** This section records the frame it
gets written into and the facts already fixed by the build. Do not invent
plot, dialogue or captions — if a panel needs words that are not yet written,
leave the placeholder and say so.

## The panels, in order

The route is fixed by `sectionProgressMap` in `app/data/sections.ts`. Progress
is flight *time*, normalised 0..1, and every visual in the flight is a pure
function of it. How much scrolling each leg of that time costs is a separate
question, answered in `app/data/flightTimeline.ts` — see "Two clocks" below.

| # | id | progress | scene | portal motif | accent | hue | space region |
|---|----|----------|-------|--------------|--------|-----|--------------|
| 01 | `home` | 0.00 | the mark, then the astronaut | earth | `#7dd3fc` sky | 199° | `departure` |
| 02 | `skills` | 0.17 | `rocket` — under power, alone | nodes | `#2dd4bf` teal | 172° | `teal` |
| 03 | `projects` | 0.62 | `saucer` — another crew passes | worlds | `#60a5fa` blue | 217° | `azure` |
| 04 | `experience` | 0.74 | `crew` — the two of them, flag between | timeline | `#a78bfa` violet | 255° | `violet` |
| 05 | `contact` | 0.92 | `landing` — down, flag planted, waving | calm | `#7dd3fc` sky | 199° | `void` |

The hues sweep outward and come home — sky, teal, blue, violet, sky — and
stay in the cold half of the wheel throughout, because the sky the flight
travels through is cold. Contact returning to the departure accent is the
same gesture as the flight's loop.

The corridor passes through coloured volumes of space (`SPACE_REGIONS` in
`MultiverseFlight.tsx`) anchored to those same stops, each taking its hue from
the section's own portal accent. The colour of the sky around a card and the
colour inside its window are the same decision. Keep them that way: a new
section means a new region *and* a new atmosphere, or the panel will read as
belonging to someone else's story.

`dusk` at 0.81 is a region with no card — a stretch of travel between
Experience and Contact, indigo, reading as Experience's violet cooling toward
the void. It is deliberate breathing room, not an oversight.

The stretch between Skills and Projects (0.35–0.51, derived from those two
stops rather than hard-coded) is travel too, but it is
lined: `TechnologyLayover.tsx` hangs the toolkit on a helix *inside* the
corridor's own perspective group, one tool per technology focus stop, each
parked at the depth its stop occupies. Nothing there scales itself — a tool
looks bigger because it is nearer — and clicking one flies the flight to it.
It has been rebuilt from a screen-space panel three times; if it is ever
rebuilt again, it stays in the corridor. A section that pauses the journey to
show a diagram reads as a different website wearing the same colours.

The layover owns that stretch outright, and the two cards either side are
clamped out of it — `getDepartWindow` pulls the Skills card's fade forward so
it is gone before the first tool lights, and `getRevealWindow` holds the
Projects card back until after the last one fades. Skills and Projects sit at
0.17 and 0.62 rather than 0.22 and 0.56 to make that room. Without the clamps
the generic depart maths ran the Skills billboard's fade to 0.509, leaving it
on screen at pass-through size across most of the toolkit — which is what
"the tools are gone before I see them" actually was: they were behind a card.

`atmospheres` in `CardPortal.tsx` is indexed by card index and must stay the
same length and order as `cards`. It once carried a sixth `resume` entry for a
deleted card, which silently handed Contact the wrong grade and made the last
entry unreachable.

## Where a panel's parts live

- **The words** — `app/data/sections.ts`. `eyebrow` carries the panel number
  (`"02 / Skills"`), and the dial, the cards and this table all agree on that
  numbering. Comic copy for a panel belongs here, not inlined in a component.
- **The window** — `CardPortal.tsx`. Each panel looks out at its own scene:
  `atmospheres` sets the tint and motif, `Space` draws the starfield behind
  it, and the drawn `PortalMotif` is the fallback where a panel has no art.
- **The sky** — `SPACE_REGIONS` in `MultiverseFlight.tsx`.
- **The cast** — `public/space/` (the astronaut, his rocket and the aliens
  he meets), `public/astr.svg`, and the `US` mark in `public/us.png`. The
  astronaut opens the story in the loader (`oastr.svg`) and reappears in the
  Home portal when the bio expands. Treat them as recurring characters: the
  same figure, not decoration chosen per panel.
- **The scene in a window** — `scenes` in `CardPortal.tsx`, one entry per
  panel that has one, keyed by card index. Read in order the four are a
  departure, an encounter, a partnership and an arrival, which is the shape
  the sections already had. The art is full-colour and composited normally —
  the accent reaches it as `sceneTintStyle`, the section's light masked to
  the figure's own silhouette and screened over it, which is how rule 3 is
  satisfied without hue-rotating the cast into different people per panel.
  The drawn `PortalMotif` stays *behind* every scene, so a panel keeps its
  signature; a panel with no scene shows the motif alone.

## The opening panel

`PageLoader.tsx` is panel zero and should be read as part of the story rather
than as chrome. It opens on `public/bg.jpg` behind a scrim that grades into
the page gradient, with the astronaut drifting above the title. Its status
lines are in Umar's voice and count the reader in:

> Initializing thrusters… → Setting up React state… → Bootstrapping
> environment. → Loading his world. Thanks for visiting.

They are tied to progress bands, not to a timer, so the words report something
real. The lower half of the scrim *is* the flight's opening gradient, so
lifting the loader is a dissolve into panel one rather than a cut.

The flight also loops: pushing past the end wraps back to the beginning
(`runLoop`). The story closes where it opened.

## Two clocks

Progress is flight time. The timeline is scroll distance. They are separate on
purpose, and `app/data/flightTimeline.ts` is the only place they meet.

Everything tuned in the flight — where a panel sits, each card's depth, the
slot lead, reveal and depart windows, the closing beat's arming thresholds —
is priced in progress. So lengthening the track changes the *meaning* of every
one of those constants at once. That was tried: to give the technology helix
room, the track went to 2200svh and Skills moved 0.22 → 0.18. It worked for
the helix and broke everything else — cards read from 22% further away, fades
spread over 22% more depth, the closing beat out of step with the card it was
tuned against.

The timeline gives a leg more scroll without moving any panel. Skills to
Projects is 2200vh against the ~600vh it would get from an even split, which
is ~41vh of scroll per tool; the camera still crosses the same depth there, so
the tools are the same size and the same distance apart and you simply spend
longer travelling between them. Every other leg keeps its original length.

The conversion runs one way at the top of `MultiverseFlight` (scroll →
progress, once) and the other way in everything that *writes* a scroll
position from a progress: nav and dial flights, the autopilot's rAF clock, the
route-map drum, and the snap markers, which are laid out down the document and
therefore live in scroll. Anything new that turns a progress into a scrollTop
needs `scrollFromProgress`; forgetting it lands you at the right moment of the
flight in the wrong place in the page.

## How the traveller moves

Two inputs move the flight and they are deliberately not the same instrument.
The wheel is travel; the dial (`ScrollDial.tsx`) is navigation — a bezel you
turn, where one gear's worth of rotation is one section and the detents count
out the distance on the way.

Both read one gearbox, `app/lib/travel-gear.ts`, which answers a single
question: how much ground does one gesture cover?

| gear | wheel | dial |
|------|-------|------|
| 1 | no snapping at all — free, smooth scrolling | 1080° per section |
| 2 (default) | three landings per section | 360° per section |
| 3 | one landing per section | 120° per section, settles on a stop |

The landings are `buildSnapPoints` in `app/data/flightStops.ts`, rendered as
snap markers down the track. `scroll-snap-stop: always` on each is what makes
"three landings" mean *at least* three scrolls — a fling cannot pass one.
Snapping is suspended while the autopilot runs and while a hand is on the
dial (`flight-dial-turn`), because both of those drive the scroll position
themselves and mandatory snapping pulls against them every frame.

The gear sits in the middle of the dial face (`DialGearButton.tsx`), where
the page number used to be — one button, showing the gear you are in, and a
three-second hold steps to the next one (1 → 2 → 3 → 1). It is a hold rather
than a click because it changes how far every gesture travels, mid-journey,
under someone who is reading. The panel number is still spoken in the dial's
`aria-valuetext`; on screen it is the card above the dial that names where
you are.

## Rules for adding to it

1. **A panel is a place.** New content goes in an existing panel, or it gets
   its own stop, region and atmosphere. Nothing lives between panels except
   travel.
2. **Numbering is shared.** `eyebrow`, the dial's page number and the table
   above must not drift.
3. **Comic, not clip art.** Art is a window onto the scene the traveller is
   passing, tinted to that section's accent. No per-panel illustration that
   ignores the colour it sits in.
4. **The copy is the narration.** It is spoken by someone travelling, and the
   Home panel's `description` is literally the narration script (see
   `app/data/narration.ts`, which splits it into timed spans). Copy written
   for Home has to survive being read aloud.
5. **Reading order is the DOM order.** The portal leads visually but comes
   last in markup on purpose, so screen readers and search engines get the
   words first. Keep it that way when laying out a new panel.
