# Campus 3D — browser third-person game website

A game-like 3D website: the visitor walks a character around a campus building
(gate, classrooms, gaming room, office, conference room) and an outdoor ground.
Interacting with objects opens 2D overlays (login, learning page, forms, slides)
or mini games. Built in phases — **stop after each phase and wait for the user's go-ahead.**

## Commands
- `npm run dev` — dev server on http://localhost:5173
- `npm run assets` — rebuild `public/models/` from `assets-src/` (run after adding/changing a model)
- `npm run build` — typecheck (`tsc -b`) + production build
- `npm run typecheck` — typecheck only
- `npm run preview` — serve the production build

## Stack (keep to this unless blocked)
Vite 8, React 19, TypeScript 7, three 0.186, @react-three/fiber 9, @react-three/drei 10,
@react-three/rapier 2, zustand 5, Tailwind CSS 4 (via `@tailwindcss/vite`, no config file).

## Key decisions
- **Custom character controller, not ecctrl.** `src/player/Player.tsx` uses a
  `kinematicPosition` RigidBody + capsule collider + Rapier's
  `KinematicCharacterController` (autostep 0.4 m for stairs, snap-to-ground, 50° max slope).
  Reason: full control over input locking, sitting, mobile joystick, and R3F v9 compatibility.
- **Physics `timeStep="vary"`** (one step per rendered frame) so the kinematic controller
  always reads the current position. Gravity is applied manually in Player (−20 m/s²).
- **Kinematic player needs `ActiveCollisionTypes.KINEMATIC_FIXED`** on its collider,
  otherwise fixed sensor colliders never fire intersection events. Already set in Player.
- **Per-frame data lives outside React/zustand**: `src/player/playerRuntime.ts`
  (player position + body). zustand only holds state that UI reacts to.
- **Camera-relative movement**: Player reads the camera's forward vector each frame.
  Camera (`ThirdPersonCamera.tsx`) is an orbit rig (drag to rotate, wheel to zoom 2–10 m)
  that sweeps a 0.3 m sphere head→camera (`world.castShape`, excluding the player body and
  sensors) and pulls in when blocked. A sphere, not a ray, so near-plane corners never clip walls.
- **Teleport**: `teleportTo(position, facing)` in `playerRuntime.ts` queues a move; Player
  applies it next frame and sets `cameraSnap` so the camera jumps behind the player.
  `facing` = radians around Y, 0 = +Z, π = −Z.
- **World layout is data-driven**: all dimensions live in `world/layout.ts`; zones
  (HUD label, teleport menu, minimap, spawn points) live in `world/zoneConfig.ts`.
  `ZoneTracker` polls the player position every 200 ms → `currentZone` / `currentFloor`.
  Zone order matters — first match wins, so specific zones come before broad ones.
- **Sun shadows follow the player** (`world/SunLight.tsx`): one 1024² shadow map covering
  ±25 m around the player instead of the whole campus.
- **Heavy zones are code-split**: `OutdoorGround` is `React.lazy` + `Suspense` in `World.tsx`.
- **Assets** (Phase 3): Kenney CC0 packs — Mini Characters (12 skinned characters),
  Furniture Kit, Nature Kit. Raw GLBs + licenses live in `assets-src/`;
  `scripts/build-assets.mjs` centers props (bottom-center pivot, facing +Z), sets
  `metallicFactor = 0` (Kenney nature kit ships metallic=1 → renders black), recolors teal
  leaves, strips animations from characters, and meshopt-compresses everything (~1.6 MB total).
  Scales: furniture ×2, nature ×3.5, characters ×2.5 (see `src/assets/models.ts`).
- **Characters**: all variants share one skeleton, so clips come from one
  `characters/animations.glb`. `characters/CharacterModel.tsx` clones with `SkeletonUtils.clone`
  (plain `.clone()` breaks skinning), owns its AnimationMixer, crossfades on `animation`
  change and skips updates beyond `cullDistance`. `characters/clips.ts` maps states → clips and
  builds composite poses: `study` = sit legs + `interact-right` arms (typing),
  `game` = sit legs + `holding-both` arms. `sit` puts hips 0.065 m above the origin, so a
  seated NPC's origin = seat height − 0.065 (`seatPosition()`).
- **NPCs**: `npc/StaticNpc` (seated/standing, no collider — surrounding colliders keep the
  player out), `npc/WalkingNpc` (kinematic capsule on a waypoint path; stops and faces the
  player within 1.8 m so they never overlap), routes in `npc/WalkingNpcs.tsx`,
  deterministic looks via `npcLook(index, salt)`.
- **Static batching** (`world/parts/Batch.tsx`): inside `<BatchProvider>` (wraps all zones in
  World.tsx), `Block`, `Floor`, `Model` and `ModelInstances` don't draw themselves — they register
  their world matrix and `BatchRenderer` draws one InstancedMesh per color / per prop sub-mesh.
  Colliders are unaffected. Only for things that never move. Cut draw calls ~630 → ~340.
- **Windows have invisible colliders** (in `Wall`) so the camera sphere and player can't pass.
- **Focus state** (Phase 4): `store.focus` = the player is locked into something —
  `seat` (Player pins the body to the seat, plays `sit`/`study`, and on exit returns to where
  they stood), `camera` (ThirdPersonCamera smoothstep-blends 0.8 s from orbit to this shot and
  back), `hidePlayer`, `exitWithOverlay` (closing the overlay also stands up), `hint` (HUD).
  Esc: closes the overlay first, then leaves focus. E, T and the minimap are disabled while
  focused. `isInputLocked()` = overlay open OR focused.
- **Auth** (`services/auth.ts`): the UI only talks to the `AuthService` interface; the current
  implementation is a localStorage mock (no passwords stored). Session restored on load in
  `App.tsx`. `store.setUser` also sets `playerAvatar` from the account (avatar picked at
  signup, changeable in the account panel). TODO(Supabase) mapping is written in the file.
- **Forms** (`services/forms.ts`): `submitDemoRequest` is a mock with a TODO for a serverless
  endpoint + email provider. Validation helpers in `utils/validation.ts` (client-side only —
  the real endpoint must re-validate).
- **Slides on the 3D screen**: `world/zones/PresentationScreen.tsx` uses drei
  `<Html transform>`; CSS px → meters = px × distanceFactor / 400 (920 px ↔ 4.6 m at
  distanceFactor 2). Html draws above the canvas, so it is only mounted while the player is in
  the conference zone. Content lives in `src/content/` (courses, pricing, slides) — placeholders.
- **Mini games** (Phase 5): `minigames/registry.ts` lists games; each is a `React.lazy` chunk
  implementing `GameProps { onGameOver(score) }` (call once per run). `ArcadeOverlay` hosts them:
  launcher → game → result panel (new-best badge, play again). Games own their keyboard
  listeners and must `preventDefault` handled keys. Scores go through `services/scores.ts`
  (`ScoreService`: best score per game per user, guests share `userId: 'guest'`; localStorage
  mock with a TODO(Supabase) schema). The console opens the launcher; each arcade cabinet opens
  its own game via `openOverlay('arcade', { game })`.
- **Outdoor sports** (Phase 6, `minigames/sports/`): each court's Interactable calls
  `startSport(id)` → focus (player pinned to `SPORTS[id].spot`, camera shot) + `useSportStore.start`.
  `SportController` (mounted in App) runs the 3-2-1 countdown, the timer, and submits the score
  via `services/scores.ts` (gameIds `basketball` / `football` / `cricket`); Esc (leaving focus)
  stops the sport. The 3D game components live inside `OutdoorGround` (lazy chunk) and render
  nothing unless active. `sportRuntime` holds per-frame meter values (aim, power, zones, prompt,
  cricket `eta`) read by `ui/hud/SportHud.tsx` in rAF. Input: `useSportAction` (Space / Enter /
  left click on the canvas).
  - Basketball: Rapier dynamic ball; rim = 12 box colliders tagged `rim` (swish detection).
    Baskets are detected by a ballistic interpolation of the ball crossing the rim plane (a thin
    sensor tunnels at low fps). Sweet zones (aim ±0.075, power 0.4–0.6) were tuned with a
    headless Rapier sim of this hoop; re-tune if the hoop, gravity or launch changes.
    Read ball positions from the mesh (synced by RigidBody), never from removed wasm bodies —
    touching a freed body traps the whole Rapier wasm instance.
  - Football: dynamic ball + kinematic keeper collider that guesses (45 %) and dives; invisible
    net colliders; goal = sensor behind the line. Power sets the target height (over the bar ≈ miss).
    No linear damping on the ball (it would break the aim maths).
  - Cricket: hand-rolled ball trajectory (release → bounce → batter) for consistent timing;
    swing timing windows 0.06 / 0.12 / 0.2 s → SIX / FOUR / edge; 12 balls per round.
- **Two experiences, one codebase** (Phase 7): `main.tsx` → `Root.tsx` picks the mode
  (`mode/mode.ts`): no WebGL → 2D; `?mode=2d|3d` URL param; saved preference; weak device
  (≤2 cores or ≤2 GB) → chooser; else 3D. `App3D.tsx` (Canvas, three, R3F, Rapier, models) is a
  `React.lazy` chunk, so the 2D site (`site2d/Site2D.tsx`, hash routes `#/learn` …) downloads
  ~80 KB gzip and never touches three.js. **Anything the 2D site imports must not import
  three / drei / R3F** — e.g. `assets/models.ts` is pure data and drei preloading lives in
  `assets/preload.ts`; the avatar 3D preview (`AvatarPreview`) is lazy. Overlay bodies are split
  into reusable `…Content` components (LearningContent, AuthContent, OfficeContent/DemoForm/Pricing,
  ArcadeContent) and the slides into `ui/slides/SlideDeck.tsx`, shared by 3D overlays and 2D pages.
  Sports are 3D-only. 3D sets `html.mode-3d` (no page scroll, `user-scalable=no`); 2D scrolls
  and allows zoom.
- **Loading**: inline CSS splash in `index.html` → `LoadingView` (indeterminate while the 3D
  chunk downloads) → progress from drei `useProgress` + `sceneReady` (set by `ReadySignal` after
  the first physics frame). `SlowDeviceBanner` measures real fps after load and offers 2D below 20 fps.
- **Adaptive quality**: drei `PerformanceMonitor` sets `graphicsQuality` 'low' when fps keeps
  dropping → DPR 1 and no sun shadows. Shadows use PCF (`shadows="percentage"`), static NPCs
  don't cast shadows, sign boards and hedges go through the static batch.
- **Touch** (`ui/touch.ts`, `?touch=1` forces it): `TouchControls` = joystick (writes
  `externalInput`, push fully to run) + Jump + an Interact button labelled from the prompt;
  one-finger drag rotates, two-finger pinch zooms (ThirdPersonCamera tracks pointers);
  FocusHint is a tappable "leave" button. Minimap is hidden on touch.
- **Deploy**: static build (`dist/`), `vercel.json` sets long-cache headers for hashed
  `/assets` and a 1-day cache for `/models` (not content-hashed — bump filenames if a model
  changes a lot). Hash routing, so no SPA rewrites are needed.
- **Mount order matters**: in `World.tsx`, `<Player />` is before `<ThirdPersonCamera />`
  so the camera follows the same frame's position.
- **Player visuals are separate from physics**: `PlayerModel.tsx` (origin at feet,
  faces +Z) reads `playerAnimation` from the store. Swap the placeholder capsule for a
  GLB character without touching Player.tsx.
- **Dev handle**: in dev builds `window.__game = { store, playerRuntime, teleportTo, renderer }`
  (see `main.tsx`, `App.tsx`) for debugging, draw-call checks (`renderer.info.render.calls`)
  and automated browser checks.

## Map (meters; −Z is "into the campus", spawn faces −Z)
```
z=45     boundary hedge
z=38     spawn
z=30     Entrance Gate (arch + login booth at x≈8.6), hedge fence across the map
z=24…10  Front Plaza (path to the building)
z=10…−14 Building 36×24 m, x −18…18, 2 floors (slab top y=4.3, roof y=8.3)
         ground: Classrooms (x<−4) | Main Hall + stairs (x −4…4) | Gaming Room (x>4)
         first:  Office (x<−4)     | Corridor + stairwell         | Conference Room (x>4)
         front door z=10, back door z=−14 (both at x −2…2)
z<−14    Outdoor Ground: Basketball (−30,−40), Football (0,−52, goal z=−70), Cricket (32,−50)
z=−85    boundary hedge   (x boundary ±55)
```

## Folder structure
```
src/
  main.tsx → Root.tsx    mode switch: ModeChooser | Site2D | lazy App3D (+ session restore)
  App3D.tsx              KeyboardControls → <Canvas><World/></Canvas> + InteractionManager + UILayer
                         + LoadingScreen + SlowDeviceBanner (+ dev handle window.__game)
  mode/                  mode store, WebGL / weak-device detection
  site2d/                Site2D: header/nav, hash router, pages (reuses …Content components)
  index.css              Tailwind import, full-screen canvas, keyframes
  store/useGameStore.ts  zustand: activeOverlay (typed via OverlayPropsMap), focus (seat /
                         screen), nearby interactables, playerAnimation, playerAvatar,
                         currentZone/currentFloor, showControlsHint (localStorage), user.
                         Helpers: isInputLocked(), selectActiveInteractable(), openInfo()
  player/                Player (physics+movement+teleport), PlayerModel (visuals),
                         ThirdPersonCamera, controls (key map + externalInput for joystick),
                         playerRuntime (shared per-frame refs, SPAWN_*, teleportTo)
  world/                 World (lights, sky, <Physics>, composes zones), Ground, SunLight,
                         ZoneTracker, layout.ts (dimensions), zoneConfig.ts (zones)
  assets/models.ts       model names, URLs, pack scales, preloadModels()
  characters/            CharacterModel (animated skinned model), clips (state → clip map)
  world/parts/           Batch (static instancing), Block (box + collider), Wall (auto-split
                         around doors/windows + window colliders), Model / ModelInstances (GLB
                         props), BoxColliders (invisible static boxes), Sign (board + text),
                         Hedge (boundary), Trees (nature-kit), Props (Plant, SignPost, Floor)
  world/zones/           Campus (boundary, paths, trees), Gate, Building (shell, stairs,
                         slab, roof, signs), Classroom, GamingRoom, Office, ConferenceRoom,
                         OutdoorGround (lazy)
  interactables/         Interactable (reusable trigger + prompt), InteractPrompt,
                         InteractionManager (global E / Esc)
  ui/                    UILayer (HTML over canvas), OverlayRoot
  ui/hud/                HUD (location, user chip, buttons, T/H hotkeys), Minimap, ControlsHint,
                         SportHud (scoreboard, countdown, meters, results)
  ui/overlays/           OverlayShell (modal frame), registry (id → component), controls
                         (Field, PrimaryButton, Tabs, Alert), AvatarPicker (live 3D preview),
                         InfoOverlay, TeleportOverlay, AuthOverlay, LearningOverlay, OfficeOverlay,
                         ArcadeOverlay (launcher + game host + results)
  utils/                 dom helpers (isTypingTarget), validation (form rules)
  services/              auth (AuthService + localStorage mock), forms (mock demo submit),
                         scores (ScoreService + localStorage mock)
  content/               courses, pricing plans, slides — placeholder copy, edit freely
  npc/                   StaticNpc (+ seatPosition), WalkingNpc, WalkingNpcs (routes), variants
  minigames/             registry (GameId, GameProps, lazy components), snake/, puzzle/
                         (sliding 3×3 / 4×4), paint/ (paint-by-numbers + pictures)
  minigames/sports/      sportStore (+ sportRuntime), config (spots, cameras, hoop/goal/pitch),
                         SportController (lifecycle, startSport, useSportAction),
                         Basketball, Football, Cricket (3D, mounted in OutdoorGround)
assets-src/              raw CC0 GLBs + licenses (Kenney packs) — inputs to `npm run assets`
scripts/build-assets.mjs asset pipeline (gltf-transform)
public/models/           generated, compressed GLBs (characters/, furniture/, nature/)
```

## Recipes
**Add an interactable** — wrap any object:
```tsx
<Interactable id="gaming-tv" prompt="Press E to play" position={[x, 0, z]}
  triggerSize={[1.5, 1.5, 1.5]} onInteract={() => openOverlay('minigames')}>
  <Block position={[0, 0.5, 0]} size={[1, 1, 1]} />
</Interactable>
```
`id` must be unique. `triggerSize` is half-extents; the trigger is offset +1 m in Y by default.
The most recently entered trigger wins when several overlap. Only the active interactable
shows its prompt. Text "E" in the prompt renders as a key cap.
Placeholder interactables (features from later phases) use `openInfo(title, body)` —
replace those calls when the real feature lands.

**Add an overlay** — 1) add the id + its props type to `OverlayPropsMap` in `useGameStore.ts`,
2) create `ui/overlays/MyOverlay.tsx` wrapped in `<OverlayShell title=…>`,
3) register it in `ui/overlays/registry.ts`, 4) open with `openOverlay('my-id', props)`.

**Add a sit-down / look-at interaction** — call
`useGameStore.getState().enterFocus({ id, camera: { position, target }, seat?, hidePlayer?,
exitWithOverlay?, hint? })` from an Interactable's `onInteract`; open an overlay afterwards if
needed (see `sitAtLaptop` in Classroom.tsx, `watchPresentation` in ConferenceRoom.tsx).

**Add a mini game** — create `src/minigames/<name>/<Game>.tsx` with a default export taking
`GameProps`; call `onGameOver(score)` once when the run ends (higher = better); add a `GameMeta`
entry (lazy import) to `GAMES` in `minigames/registry.ts` and its id to `GameId`. The launcher,
high scores and leaderboard pick it up automatically.

**Add a zone / room** — add dimensions to `layout.ts`, a component in `world/zones/`
(mount it in `World.tsx`), and a `ZoneDef` in `zoneConfig.ts` (with `spawn` to appear in the
teleport menu; add it to `TeleportOverlay` GROUPS and the Minimap zone lists).
Use `Wall` for walls with openings, `ModelInstances` for repeated furniture, `BoxColliders`
for their collision boxes.

**Add a model** — copy the CC0 GLB into the right `assets-src/` pack folder, run
`npm run assets`, add its name to `FURNITURE`/`NATURE` in `src/assets/models.ts`, then place it
with `<Model name=… position rotationY />` (+ a `BoxColliders` box). Check facing in-game: props
face +Z at rotationY 0.

**Add an NPC** — `<StaticNpc variant position facing animation />` (seated: position from
`seatPosition(x, seatHeight, z)`), or add a route to `ROUTES` in `npc/WalkingNpcs.tsx`.
Wrap in `<Suspense fallback={null}>` so loading never blocks colliders.

## Rules
- **Input lock**: while `activeOverlay` is set, `isInputLocked()` is true → no movement,
  jump, E, or camera drag/zoom. Any new input source must check it. (Sitting will extend it.)
- Text inputs inside overlays must not trigger game keys — InteractionManager ignores E when
  typing, and movement is locked while an overlay is open anyway.
- UILayer container is `pointer-events-none`; interactive HTML must add `pointer-events-auto`.
- **Colliders**: boxes/capsules only (`Block`, `CuboidCollider`, `CapsuleCollider`).
  Never mesh/trimesh colliders.
- **Assets**: CC0 only (KayKit / Quaternius / Kenney), GLB, compressed with
  gltf-transform (Draco/meshopt), in `public/models/`. Initial load < ~15 MB.
  Keep placeholders swappable (visual component separate from physics).
- **Performance**: target 60 fps on a mid-range laptop. Instancing for repeated
  furniture, one shadow-casting directional light (1024 map), bake lighting where possible,
  lazy-load heavy zones with `Suspense`. No allocations inside `useFrame` (reuse vectors in refs).
- Don't write to zustand every frame — only on change (see animation state in Player).

## Phases
- [x] **Phase 1** — setup, ground, capsule player + movement, third-person camera with
      collision, physics, test Interactable → overlay.
- [x] **Phase 2** — placeholder building layout (gate, classroom, gaming room, office,
      conference room, stairs, outdoor ground), HUD, teleport menu, controls hint.
- [x] **Phase 3** — GLB assets, animated character (idle/walk/run/sit), NPC students, walking NPCs.
- [x] **Phase 4** — classroom sit + laptop learning page, gate login/signup (mock → Supabase),
      office forms (mock submit, TODO backend), conference room slides via drei `<Html>`.
- [x] **Phase 5** — gaming room mini games (Snake, Puzzle, Paint-by-Numbers) + per-user high scores.
- [x] **Phase 6** — outdoor sports mini games (basketball, football, cricket), 30–60 s rounds.
- [x] **Phase 7** — mobile joystick (writes `externalInput`), 2D fallback mode, performance pass,
      loading screen, Vercel deploy, code-splitting (bundle is ~1.2 MB gzip, mostly Rapier WASM).

## Known limits / TODO
- Auth, scores, learning progress and the demo form are localStorage / console mocks
  (see TODOs in `src/services/*`); content in `src/content/*` is placeholder copy.
- On the dev laptop's Intel UHD GPU (1280×720, DPR 1) high quality measures ~35–60 fps
  depending on the view (noisy); the PerformanceMonitor falls back to low quality below ~50 fps.

## Environment notes
- Project lives in OneDrive; if installs or the dev server hit file-lock errors,
  move it outside OneDrive.
- Headless Chrome: launch with `--use-angle=d3d11 --enable-gpu --ignore-gpu-blocklist` to use
  the real GPU (Intel UHD here → 60 fps). SwiftShader (`--use-angle=swiftshader`) runs at ~3 fps,
  which breaks physics-timing tests (huge steps). Either way, wait on conditions, not fixed
  durations; for timing games, press keys from a rAF loop inside the page.
