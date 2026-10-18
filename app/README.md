# Application architecture

The files under `app/` intentionally keep implementation code free of
explanatory comments. Durable reasoning belongs here; narrative and content
rules belong in the repository-level [`AGENTS.md`](../AGENTS.md). Required
tool directives, such as narrowly scoped ESLint suppressions, remain beside
the code they control.

Update this document whenever a change invalidates one of these constraints.
Do not add historical commentary back to source files.

## Canonical sources

- `../AGENTS.md` defines the story, panel order, visual language, content
  ownership, and accessibility reading order. It wins over this document on
  narrative questions.
- `data/sections.ts` owns panel content, numbering, raw flight stops, accents,
  and section-specific data.
- `data/flightTimeline.ts` maps document scroll to flight progress.
- `data/flightStops.ts` derives readable card slots, technology focus stops,
  and card reveal/departure windows.
- `lib/camera.ts` owns the corridor depth model.
- `lib/smooth-scroll.ts` is the only abstraction that may write scroll
  positions while Lenis is active.
- `lib/starfield.ts` defines the shared particle handoff contract.
- `globals.css` owns global themes and named visual states; components own
  component structure and dynamic values.

## Route and rendering structure

`layout.tsx` is the root Server Component. It installs fonts, metadata,
structured data, the service-worker provider, the loader, and shared chrome.
Interactive chrome is split through client wrappers so browser-only controls
can load with `ssr: false` without moving the whole layout into the client
bundle.

`page.tsx` statically imports `MultiverseFlight`. Keep the import static: the
home route needs server-rendered content, and dynamically importing a Client
Component from this Server Component does not create a useful route split.

`[section]/page.tsx` provides crawlable detail routes for the same data used by
the flight. `generateStaticParams` is the route inventory. The resume remains
a direct file download and does not receive a detail route.

`ChromeBeforeMain` mounts scrolling, cockpit controls, the skip control, and
the dial. `ChromeAfterMain` mounts the assistant. These components are shared
across routes, but flight-only controls must return nothing away from `/`.

## The three coordinate systems

The experience uses three related coordinate systems. They must not be
collapsed into one.

1. Flight progress is normalized `0..1`. Panel positions, card depth, portal
   scenes, atmosphere changes, and ending thresholds use this clock.
2. Document scroll is normalized over the track. It determines how long a
   visitor spends on each leg.
3. Corridor depth is CSS 3D `translateZ`. It determines apparent size and
   pass-through behavior.

`progressFromScroll` performs the only inbound scroll-to-flight conversion.
Anything that turns flight progress into a document position must use
`scrollFromProgress`. Direct multiplication by the track length is incorrect
because the timeline is piecewise linear.

The current timeline totals `3330svh`:

| Leg | Scroll length |
| --- | ---: |
| Home reading and pass-through | `380vh` |
| Approach to Skills | `340vh` |
| Skills to Projects toolkit | `1150vh` |
| Projects to Experience | `560vh` |
| Experience to Contact | `640vh` |
| Contact to closing beat | `260vh` |

Change these values only to alter pacing. Moving section progress changes the
meaning of every depth- and timing-based constant in the flight.

## Camera and billboard geometry

The corridor uses a `1100px` CSS perspective. Camera travel is `23400` on
compact viewports and `25200` on desktop. A card's authored depth is derived
from its readable slot and the applicable camera travel; do not restore
hand-authored per-card Z values.

Important depths are:

- reading depth: `80`;
- departure begins near `340`;
- pass-through stops at `82%` of the projection distance;
- departing objects stop approaching at `40%` of the projection distance.

The cap avoids crossing the CSS perspective plane, where projected content
inverts and expands without a useful bound. A passed card is parked three
screens above the viewport at very low opacity rather than hidden. Keeping its
layers painted preserves their reading-size raster and prevents a huge
re-rasterized flash when travelling backward.

Card opacity, straightening, portal depth, copy depth, visibility, and scene
movement all derive from the card's real life window. `getCardLifeWindow`
spans first approach, readable slot, and completed departure. Portal art must
not invent a second timing model.

Cards remain real 3D surfaces. Their bezel, wall, copy, and portal use separate
local depths, with smaller offsets on compact viewports. Promoted layers are
rasterized around reading size rather than at pass-through scale.

## Reveal, departure, and the toolkit layover

`getRevealWindow` keeps future cards dark until they are genuinely approaching.
Projects is held behind the technology layover, and Skills receives a wider
approach runway because it is the first distant billboard the traveller sees.

`getDepartWindow` is calculated from camera depth, not as a percentage of the
gap to the next panel. Its ceilings guarantee that:

- Skills clears before the toolkit begins;
- every regular card clears before the next readable slot;
- Contact clears by `LAST_CARD_CLEARED` before the ending appears.

The technology layover runs from `skills + 0.02` to `projects - 0.11`. Tool
stops tile that interval. `technologyFocusWindow` is the shared definition of
which tool is current; radar presence, labels, history, dial landings, and
autopilot must read it rather than track their own nearest-tool state.

The radar is part of the corridor perspective group. Its depth follows the
camera while parked at reading distance, so the surrounding sky and stars
continue travelling. The compact portrait layout may move supporting copy to
screen space, but the instrument itself remains in the journey.

## Scrolling and landings

Lenis is mounted once for the application. It animates the real document
scroll position and must never be replaced with a transformed content wrapper:
an ancestor transform would redefine the containing block for the flight's
sticky viewport and fixed overlays.

Wheel input is smoothed with a short `0.12` lerp. Touch synchronization stays
off so fingers retain compositor-driven native momentum. The Lenis instance
still runs on touch because its virtual-scroll signal allows the snap plugin
to observe the gesture. Reduced-motion mode constructs neither Lenis nor the
snap plugin.

Landings use `lenis/snap` with proximity behavior, a `45%` distance threshold,
`480ms` debounce, and a short settle. They do not use CSS mandatory snapping.
The flight publishes absolute pixel positions for every panel and tool, updates
them after relevant geometry changes, and clears them when the route unmounts.
There is deliberately no landing on the final frame because it would fight the
push that loops back to the beginning.

Autopilot and dial gestures suspend snapping because both write the position
themselves. All programmatic writes go through `flightScrollTo`; a bare
`window.scrollTo` is overwritten by Lenis on its next frame.

## Dial behavior

The dial is navigation, not a scroll-progress indicator. Its coordinate is a
section index plus fractional travel toward the next section. One full
revolution moves one section regardless of uneven flight-progress gaps. The
ring has 36 ten-degree detents.

Pointer capture keeps rotation continuous across the ring edge. Rotation is
unwrapped across the `-180/180` seam. Window-level pointer release, cancel, and
blur handlers prevent a missed release from leaving the dial in a dragging
state. Two-finger input resizes the dial; ordinary wheel input remains page
travel, while desktop control-wheel input may resize it.

The dial dispatches `flight-dial-turn` while held. The center button toggles
HoloChat through the shared event contract. The visible card above the dial
names the current location, while assistive text also exposes panel numbering.
At the end, the ring changes to loop-push progress and announces that the end
is the beginning.

## Responsive behavior

The flight renders at every viewport size. Width below `1024px` selects compact
geometry; portrait compact viewports stack portal and copy, while landscape
phones retain the side-by-side panel. The left/right card stagger scales from
the actual viewport width so it remains visible without pushing panels off
screen.

Only derived, quantized viewport facts belong in React state. Mobile browser
chrome can emit a resize storm during a scroll; storing raw width or height
would re-render every billboard and canvas. Orientation changes and meaningful
size changes are coalesced through one animation frame.

The track uses `svh` so browser-toolbar changes do not resize thousands of
viewport units during travel. Overlays and route chrome account for safe-area
insets. Interactive targets on compact layouts remain at least `44px` high.

Coarse-pointer detection describes the primary input. Touch keeps native
momentum and uses a tighter camera follow; trackpads receive Lenis wheel
smoothing. A touchscreen laptop with a fine primary pointer remains in the
desktop path.

## Opening, starfield, closing, and loop

`PageLoader` is story panel zero. Its mark assembly follows real readiness
milestones: parsed markup, fonts, and all requested assets. Progress is capped
to a readable assembly speed and has a failsafe so a failed resource cannot
trap the visitor behind the overlay.

When the mark shatters, the loader sends normalized screen positions, depth,
and apparent pixel size through `starfield-seed`. `SpaceParticles` installs
stars at those positions before the loader canvas fades. The shared camera,
field depth, point size, and projection math live in `lib/starfield.ts`.

At the ending, `starfield-gather` asks for currently visible stars within the
closing canvas bounds. The field hides the selected stars and the mark begins
from their exact viewport coordinates. `starfield-release` restores them if
the mark disperses. Components communicate through window events because the
loader, field, and closing mark live in separate React trees.

The closing sequence arms only after Contact clears. Its steps are ordered:
void, gathered mark, hold, push, dispersal, dawn, wrap, and arrival rush. The
loop push is a real distance, not a timer. Hysteresis prevents the ending from
flickering near thresholds, and a running guard prevents duplicate wraps.
Returning to progress zero must reset story state as well as scroll state,
including the expanded Home copy and headline cycle.

## Particle and canvas rules

`HeroLogo` draws into the box provided by its caller. Do not add inline width
or height that overrides a caller's layout classes. The closing mark uses a
viewport-covering transparent canvas but a separately sized ink mark so stars
from anywhere on screen can gather without enlarging the logo itself.

Pointer coordinates are converted into canvas coordinates before affecting
particles. Hover produces local pressure, clicks produce a shockwave and
particle impulse, shimmer scheduling is updated once per frame, and shatter
particles either leave the viewport or settle into supplied star positions.
Particles below a useful subpixel size are not drawn.

Canvas loops must stop or reduce work when their content is off screen,
inactive, hidden, or under reduced motion. Use refs and motion values for
frame-by-frame data; do not route animation frames through React state. Cap
device-pixel ratio and avoid reallocating a WebGL drawing buffer for minor
mobile-toolbar height changes.

`SpaceParticles` treats a large instantaneous scroll delta as a jump, not
travel, so route changes and loop resets do not create a false warp. Manual
wheel/touch movement supplies transient speed; autopilot supplies a quieter
time-based drift. The field's color and opacity remain compatible with both
the opening handoff and the closing gather.

## Portal scenes and atmospheres

`CardPortal` keeps one atmosphere entry per card in exactly the same order as
`cards`. The portal accent and surrounding `SPACE_REGIONS` color are one
decision. Scene movement uses each card's life window: entering at first
light, crossing at the readable slot, and leaving during departure.

The portal motif remains behind normal scene art. A scene with a photographic
backdrop replaces the motif and receives the section overlay. Accent tint is
masked to scene silhouettes and screened over the original colors rather than
hue-rotating the cast.

Raw `<img>` elements are intentional for tiny SVG layers used in portal
streaks and radar artwork. They avoid optimizer wrappers and unsupported
optimization requests; the local ESLint directives stay narrowly attached to
those elements.

## Autopilot, narration, and audio

Autopilot flies to the same readable slots used by manual navigation. Its
animation clock writes scroll through `flightScrollTo`, refreshes geometry
when the viewport meaningfully changes, and yields immediately to real wheel,
touch, or keyboard input. The Home leg waits for actual narration completion
rather than a guessed duration.

Audio starts only from a qualifying user gesture. The cockpit owns narration
and soundtrack playback, mute state, pause/resume, and optional fullscreen.
Fullscreen is offered rather than forced and is skipped where the API is not
available. A paused tour preserves audio position; a completed or cancelled
tour tears playback down.

Short dial ticks share a round-robin audio pool so close ticks can overlap.
The pool and externally owned burst clips are primed muted on the first
qualifying gesture because wheel and touchmove events cannot unlock audible
playback. Provider or browser playback failures are non-fatal.

Narrated copy is split by the spans in `data/narration.ts`. Word highlighting
listens to `narration-progress`; if no timing map exists, it renders the plain
text. The narration source is compressed AAC, while the timing table preserves
the authored segment boundaries.

## Chrome, assistant, and expandable copy

The cockpit tray, dial, assistant, and route controls are separately mounted
siblings and communicate through named window events. Event dispatch must not
occur from a React state updater because listeners may synchronously update a
different tree during render.

HoloChat remains mounted while closed but parks its continuous visual loops.
Opening focuses the input, Escape closes it, new messages scroll into view,
and suggestion chips avoid unnecessary typing on phones. API failures return a
clear retry message rather than breaking the panel.

Expandable text may synchronize to a rising external expansion signal during
render so there is no extra committed frame. Inline callback props are
intentionally excluded from the notification effect dependency list; the
effect reports actual expansion changes only. Loop resets close expanded Home
copy through a reset key.

## Data and content

All story copy belongs in `data/sections.ts`; do not inline new narration in a
component. `eyebrow` numbering must stay aligned with the dial and root
`AGENTS.md` table. Home descriptions must remain suitable for spoken
narration.

Skill details are parsed by `data/skillGroups.ts` and converted into the tool
stops used throughout the layover. Keep display labels, icon registry keys,
group names, and historical milestones in the data layer.

The "Telecom Transaction Monitoring Dashboard" entry currently carries
placeholder description and stack content. Umar must confirm it before it is
treated as final copy; do not invent the replacement.

## Styling and themes

The flat root color paints before other layers. The page sky is a fixed
`body::before` layer rather than `background-attachment: fixed`, which avoids
repainting the full long document on every mobile scroll frame. Flight, dark,
and light themes set variables on the root element; portal art preserves its
story palette across mission UI themes.

Base typography is declared inside Tailwind's base layer so utility classes
can override it. Marvel provides only weights `400` and `700`; intermediate
utility weights resolve to the real bold face rather than a variable axis.
Signature faces use block display because a fallback swapping mid-signature
reads as an animation glitch.

Static gradients should be cross-faded as compositor layers rather than
interpolated as changing gradient strings. Full-frame filters, large blurred
backdrops, and SVG filter trees are expensive on weak GPUs and should be
absent or reduced in compact mode. Continuous CSS animations need an inactive
class or visibility gate.

## APIs, security, and offline behavior

`api/chat` performs retrieval before calling configured model providers and
keeps provider credentials on the server. Never log provider payloads because
they may contain credentials or user content. Input size, history length, and
prompt-injection patterns are bounded before generation.

`api/callback-request` validates required fields and stores normalized values
in MongoDB. Database names and provider keys come from environment variables.

Serwist precaches build assets and serves `~offline` for failed document
navigations. Its route includes a build revision so deploys invalidate stale
precache entries. Offline UI must remain small and independent of runtime
data.

## Performance and accessibility checklist

- Keep copy before portals in DOM order.
- Preserve semantic buttons, focus visibility, dialog labels, live status
  text, and keyboard alternatives.
- Honor reduced motion in JavaScript and CSS, including scrolling and canvas
  effects.
- Do not autoplay audible media.
- Keep touch scrolling native and avoid non-passive global listeners unless a
  gesture genuinely requires cancellation.
- Avoid React state updates on scroll or animation frames when a ref, motion
  value, attribute, or style write is sufficient.
- Stop intervals, animation frames, observers, audio, and event listeners on
  cleanup.
- Keep card, radar, particle, and ambient loops dormant when off screen.
- Test narrow portrait, short landscape, coarse-pointer, keyboard, VoiceOver
  or TalkBack, reduced-motion, reverse travel, restored deep scroll, and route
  transitions.
- Run lint and a production build after changing timing, routing, client/server
  boundaries, or canvas behavior.
