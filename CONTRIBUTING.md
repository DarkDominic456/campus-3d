# Contributing to Campus 3D

Thanks for wanting to add to the campus! New zones, mini games, art, NPC behaviour, a real
backend, accessibility and mobile polish are all welcome.

## Workflow

1. **Fork** the repo and create a branch: `git checkout -b feature/my-idea`.
2. `npm install` and `npm run dev`, then open http://localhost:5173.
3. Make your change. For anything bigger than a small fix, skim [CLAUDE.md](CLAUDE.md) first.
   It explains the architecture and has recipes for common additions.
4. Before opening a PR, run `npm run build`. It typechecks and builds, and CI runs the same
   command on every pull request.
5. Open a **pull request** with a short description and a **screenshot or short clip**
   (it's a visual project, so this helps a lot). Vercel posts a preview link on the PR so
   reviewers can try it.

Not sure where to start? Open an issue describing your idea first. Big changes, like a new
zone or a new dependency, are easier to agree on before the code exists.

## Ground rules

- **Assets must be CC0 or your own work** (code-generated assets from permissively licensed
  tools, like EZ-Tree, are fine), as GLB. Small packs go in `assets-src/<pack>/` with their
  license; large downloadable sources go in `scripts/fetch-sources.mjs` (git-ignored, with a
  SOURCE.txt). Run `npm run assets`, and never commit unlicensed models or textures.
- **Colliders are boxes or capsules**, never mesh colliders (performance).
- **Keep it fast**: target 60 fps on a mid-range laptop. Compare `?bench=1` before and after
  visual or performance changes (plugged in, on a production build) and put the table in the PR. Instance repeated props
  (`ModelInstances`), don't allocate inside `useFrame`, don't write to zustand every frame.
- **The 2D site must stay light**: nothing imported by `src/site2d/` may import three.js,
  drei or R3F. Lazy-load anything 3D.
- **Input lock**: any new input source must respect `isInputLocked()` (overlay open or focused).
- **No secrets in the repo.** Backends go behind server-side endpoints; use `.env` locally
  (git-ignored) and provide a `.env.example`.

## Recipes (details in CLAUDE.md)

| I want to… | Start here |
|---|---|
| add something the player can press E on | `<Interactable>`, see "Add an interactable" |
| add a 2D panel / form | "Add an overlay" |
| add a room or area | `src/world/layout.ts`, `zoneConfig.ts`, "Add a zone / room" |
| add a 3D model | "Add a model" (`assets-src/` → `npm run assets`) |
| add an NPC | "Add an NPC" |
| add an arcade game | "Add a mini game" (`src/minigames/registry.ts`) |

## Code style

TypeScript strict, function components, and comments that explain *why* rather than *what*.
Match the style of the surrounding files.
