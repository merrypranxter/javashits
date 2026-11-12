# JAVASHITS

### The Psychedelic JavaScript Lab

Twelve interactive experiments in light, matter, geometry, and beautiful computational misbehavior.

**[Download the self-contained laboratory →](https://github.com/merrypranxter/javashits/raw/refs/heads/main/downloads/JAVASHITS.html)**

The HTML build embeds the application, fonts, and previews. It needs no external runtime assets. The source version below runs with Vite. A private hosted copy has been prepared; its publication requires authorization.

Everything in the artwork is computed in the browser. There are no AI-generated artwork assets, remote rendering services, API keys, or backend. The experiment thumbnails are small captures of the real renderers.

## The specimens

| Experiment | Underlying mechanism | Things to pull apart |
|---|---|---|
| Iridescent membranes | Cellular thickness fields, surface gradients, spectral interference | Optical path length, film curvature, chamber density, field refraction |
| Chemical garden | Gray–Scott reaction–diffusion on a persistent GPU lattice | Feed, decay, relative diffusion, concentration relief |
| Photon caustics | Forward ray transport through an analytic refractive sheet | Receiver distance, surface curvature, spectral dispersion, wave count |
| Ferrofluid cathedral | Ray-marched, magnetic-pole-inspired height field | Field strength, pole density, tip instability, reflectance |
| Quasicrystal | Plane waves at incommensurate angles and wavelengths | Symmetry order, frequency, faceting threshold, harmonic coupling |
| Chromatic loom | Deformed warp/weft geometry with computed crossing order | Thread count, geometric deflection, twill repeat, filament width |
| Mycelium circuit | Nutrient competition and space-colonization branching | Attraction radius, consumption radius, branch persistence, target population |
| Crystal accretion | Vapor diffusion and deposition on a hexagonal lattice | Saturation, attachment threshold, growth anisotropy, lattice magnification |
| Elastic topology | Ray-marched implicit gyroid geometry | Wall thickness, unit-cell density, coordinate strain, section depth |
| Strange attractor | Clifford recurrence accumulated into a density field | Four coefficients that change the actual dynamical system |
| Excitable matter | Cyclic cellular automaton with a discrete neighborhood rule | State count, excitation threshold, neighborhood radius, boundary contrast |
| Diffraction atlas | Complex amplitudes from a coherent ring of apertures | Aperture count, source separation, spectral bandwidth, phase disorder |

These are artistic computational models. The membrane is a prescribed optical field, not a fluid solver. The ferrofluid is a Rosensweig-inspired field, not magnetohydrodynamics. The diffraction renderer samples three spectral bands. The crystal uses a finite hexagonal chamber, and the mycelium has a finite nutrient and branch budget.

## Play

- Select a specimen. Drag or touch directly on its surface.
- The four mechanism sliders change the underlying computation. Focus a slider to reveal what it does.
- **Mutate** explores different initial conditions and mechanism settings. Chemical and chaotic systems use curated viable neighborhoods as a starting point; extreme manual settings can still extinguish or collapse a system.
- Five color systems reinterpret the material. **Hide panels** clears the instrument bench.
- Settings save automatically on your device. **Copy recipe** shares a link containing the seed, parameters, and palette. It preserves initial conditions, not the evolved simulation history or touch gestures. If clipboard access is unavailable, a JSON recipe containing the link downloads instead.
- Keyboard: **Space** play/pause, **M** mutate, **H** hide panels, **← / →** switch experiments, **Esc** close panels. Reduced-motion preferences start the artwork paused.

### Capture

**PNG:** 1920px or 3840px on the long edge. Choose original, square, portrait 4:5, or landscape 16:9 framing. Analytic geometry is rendered again at export size. Simulation lattices and density buffers retain their underlying resolution; a 4K file does not imply a 4K simulation.

**Video:** Records one 6, 12, or 24 second cycle/clip at the current preview resolution, using the browser's supported MP4 encoder or WebM fallback. The button reports the available format. No GIF encoder or MP4 transcoding is included. Hiding the tab cancels recording. The seven analytic systems are phase-periodic; chemical, cellular, chaotic-density, and growth simulations evolve continuously. Real-time recordings can drop frames on slower devices, so frame-perfect seamless video encoding is not promised.

## Run locally

Requires Node.js 22+ and npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. There is no external runtime dependency; fonts are bundled locally.

```sh
npm run build
npm run preview
```

The production output is `dist/`. Vite uses relative asset paths, so it can be hosted at a subdirectory such as GitHub Pages.

`npm run build:standalone` also produces `dist/JAVASHITS.html`, a self-contained build with inline JavaScript, styles, fonts, and procedural previews. Its embedded document was checked in Chromium and WebKit with no HTTP requests. Direct file-URL navigation is blocked by this execution environment, so that launch path remains unverified here.

## Browser support and performance

The interface and all five Canvas 2D systems work without WebGL. The other seven systems require WebGL 2, available in modern Safari, Chrome, and Firefox when enabled by the device. A failed or lost graphics context produces an explicit recovery message. Device-specific encoder and download behavior varies; this app detects capabilities instead of assuming MP4 support.

The renderer caps interactive pixel count and device-pixel ratio. Stateful GPU grids use double-buffered RGBA8 textures with 16-bit chemical packing, so no float-render-target extension is required. Canvas simulation, branching, and weaving use CPU-backed raster buffers. Only the active renderer runs. Pause stops simulation advancement and redraws only when the input changes. Growth systems have finite resource budgets.

Mobile layouts put the experiment library and mechanism controls in touch drawers. Native fullscreen is optional; panel-free viewing works without it.

## Implementation

React + TypeScript + Vite provide the instrument bench. The art engines use the browser's WebGL 2 and Canvas 2D APIs directly: no rendering framework disguises a common effect as twelve different systems.

- `src/art/catalog.ts` — mechanism definitions, parameter bounds, explanations, palettes.
- `src/art/shaders.ts` — distinct optical/implicit shaders and persistent simulation update rules.
- `src/art/webgl.ts` — shader lifecycle, byte-packed simulations, ping-pong framebuffers.
- `src/art/canvas.ts` — ray splatting, real over/under weaving, space colonization, hexagonal deposition, chaotic density accumulation.
- `src/components/ArtStage.tsx` — animation clock, touch coordinates, resizing, loss handling, still capture.
- `src/App.tsx` — instrument state, validated recipes, persistence, native video recording, responsive controls.

## Verification

```sh
npx playwright install --with-deps chromium webkit
npm test
```

To use a system Chromium: `CHROMIUM_PATH=/usr/bin/chromium npm run test:chromium`.

The browser suite covers all twelve renderers and mutations, pixel diversity, mechanism/palette changes, reset, saved settings, shared recipes, touch input, pause, unobstructed viewing, aspect ratios, actual 3840px PNG downloads, browser-decoded video downloads, and closure of every analytic phase cycle. It runs desktop Chromium and mobile-emulated WebKit. Both engines passed renderer, mutation, control, touch, storage, sharing, and phase-cycle checks. Actual 3840px PNG files were verified in both engines. An H.264 MP4 was recorded and decoded in Chromium; this Linux WebKit build exposes no video encoder, so video capture was skipped there. Mobile emulation is not a substitute for testing physical iPhones.

A private Sites copy is prepared but is not published while hosting authorization is pending. The complete source is in this repository. GitHub Pages creation was refused by the connected integration (HTTP 403). To use Pages, a repository administrator can enable **Settings → Pages → GitHub Actions**; the included deployment workflow will then publish on pushes to `main`. Until enabled, the workflow builds the app and reports that publication is skipped. A separate workflow runs the browser checks.
