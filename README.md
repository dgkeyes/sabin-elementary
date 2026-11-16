# Sabin Elementary

A game about Sabin Elementary made by Leila (and Claude).

A 3D game about the everyday life of a 5th grader, made for iPad Safari (landscape, touch, add to home screen). Every day you wake up in your bedroom, get dressed, eat breakfast, walk to school, go to class, play at recess, eat lunch, go to soccer practice, and head home for homework, dinner, and bed. Then the next day starts.

## Play

```sh
pnpm install
pnpm dev        # http://localhost:5173
pnpm build      # static site in dist/ (works from any folder, base is './')
```

**Live site:** https://sabinelementary.leilakeyes.com (also reachable from leilakeyes.com/sabinelementary). It's a Cloudflare Worker serving `dist/` as static assets; deploy with `pnpm build && npx wrangler deploy` (config in `wrangler.jsonc`, needs a Cloudflare token with Workers access in `CLOUDFLARE_API_TOKEN`).

On an iPad: open the site in Safari, tap Share → Add to Home Screen, and launch it from the icon for full screen.

**Controls:** touch the left side of the screen for a joystick (push all the way to run), drag anywhere else to turn the camera, pinch to zoom, **Jump** at bottom right. Yellow buttons above Jump do things nearby (Get dressed, Take your seat, Kick). On a computer: WASD or arrows, Space to jump, E for the yellow button.

## What's in the game

- **Morning:** avatar creator on first launch, then get dressed (wardrobe with saved outfits), breakfast, and the walk to school.
- **Classes:** math, reading, science, social studies, and writing are short multiple-choice lessons. The special rotates by weekday:
  - **PE:** Coach Says (swipe or tap for each move), then pick four moves in the move picker and perform your routine.
  - **Art:** paint a picture with brushes, fill, and stamps. It hangs in the art room and your bedroom.
  - **Music:** echo rhythms on drum, clap, bell, and bass pads, then two quick questions.
- **Recess:** soccer on the field, monkey bars, and kickball on the playground diamond.
- **Lunch, soccer practice, evening:** homework at your desk (before or after school), Starbucks treats that give a speed boost, dinner, and bed.
- **Cash:** finishing tasks earns cash for clothes, hairstyles, and upgrades (Speedy Shoes, Spring Socks, Power Kick, Piggy Bank, Lucky Pencil, Starbucks Card). Nothing costs real money.
- **Time at school:** classes have a 10-minute passing period (`PASSING_MINUTES` in `src/config.ts`). The clock stops while you're doing a class or have a menu open, and class lets out at its end time when you finish. Before the bell you can tap 👕 Change outfit at your desk.
- **People:** anyone with nothing to do fidgets, gestures, and (adults) strolls around their spot (`ambientUpdate` in `characters/npc.ts`).
- **Sound:** small synthesized sound effects; turn them off in the 📅 schedule panel.

## How the code is organized

| Folder | What lives there |
| --- | --- |
| `src/config.ts` | Tuning knobs. `GAME_MINUTES_PER_REAL_SECOND` sets how fast the clock runs. |
| `src/content/` | Data you can edit without touching game code: clothing and hair, schedule, lunch menu, upgrades, and question banks for each subject (`content/subjects/`). |
| `src/core/` | Game loop, save file (localStorage), touch input, camera. |
| `src/world/` | The map: home, neighborhood, Starbucks, school, playground, field, plus collision and walking paths. |
| `src/characters/` | Rigged characters: animations, clothing shader, hats, backpacks, hair; the player and NPCs. |
| `src/game/` | The day: schedule director, task checklist, cast of people, classmates. |
| `src/activities/` | Things that happen during the day: classes, recess (soccer, monkey bars), lunch, practice, home life. |
| `src/ui/` | HUD, avatar creator and wardrobe, quiz, schedule, shop, sleep screen. |

**Add a class:** write a subject in `src/content/subjects/`, list it in `subjects/index.ts`, and give it a block in `content/schedule.ts`.
**Add clothes:** add a row to `CLOTHING` in `content/clothing.ts`. Give it a `price` to make it a shop unlock.
**Add a recess game:** implement `RecessGame` and add it to `RECESS_GAMES` in `activities/recessGames.ts`.
**Add a PE move:** add a row to `MOVES` in `activities/pe.ts`; `gesture` is the swipe Coach Says asks for.
**Add a class game:** write a `ClassGame` and register it for the subject's `mode` in `activities/classGames.ts` (`QUIZ_AFTER` adds a short quiz afterward).
**Add a Starbucks item:** add a row to `CAFE_MENU` in `content/cafe.ts`.
**Add an upgrade:** add a row to `UPGRADES` in `content/upgrades.ts` and read `save.upgrades[id]` where it applies.
**Add an after-school activity:** write an `Activity` (see `activities/activity.ts`) and create it in `game/director.ts`.

## Art and licenses

All 3D characters and animations are by [Quaternius](https://quaternius.com) and released under **CC0 1.0** (public domain, free for any use, no attribution required, credited here anyway):

- [Universal Base Characters](https://quaternius.itch.io/universal-base-characters): body meshes and hairstyles
- [Universal Animation Library](https://quaternius.itch.io/universal-animation-library) and [Universal Animation Library 2](https://quaternius.itch.io/universal-animation-library-2): walk, run, idle, jump, sit, and other animations

`public/models/*.glb` are built from those packs by `scripts/build-assets.mjs` (smaller textures, only the clips the game uses). To rebuild them, download the free Standard zips, unzip them into one folder, and run `ASSET_SRC=/that/folder node scripts/build-assets.mjs` (needs ImageMagick).

Everything else (buildings, props, clothing patterns, the app icon) is made in code or generated for this project and is covered by this repository's license.
