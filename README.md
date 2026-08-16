# Fish Rain - Phaser 4 + TypeScript

A browser game built with Phaser 4 and Vite. Catch raining fish in your basket, then feed them to a hungry bear before its hunger bar reaches zero. Choose from animated harbors, collect silver nickels, bank points, and buy new fish and baskets from the Points Shop.

## Levels

- Gentle Bay (Easy): feed 8 fish; up to 7 misses
- Coral Crossing (Easy+): feed 10 fish; up to 7 misses
- Sunset Shoals (Normal): feed 12 fish; up to 6 misses
- Moonlit Marina (Normal+): feed 14 fish; up to 6 misses
- Frostfin Fjord (Hard): feed 16 fish; up to 5 misses
- Thunder Harbor (Hard+): feed 18 fish; up to 5 misses
- Typhoon Trench (Extreme): feed 20 fish; up to 4 misses
- Abyssal Monsoon (Extra Hard): feed 24 fish; up to 4 misses
- Pirate's Passage (Master): feed 26 fish; up to 4 misses
- Ember Reef (Master+): feed 28 fish; up to 4 misses
- Aurora Inlet (Legendary): feed 30 fish; up to 3 misses
- Cosmic Cascade (Impossible): feed 34 fish; up to 3 misses
- Sunken Cathedral (Nightmare): feed 38 fish; up to 3 misses
- Kelp Forest (Nightmare+): feed 42 fish; up to 3 misses
- Crystal Atoll (Legendary+): feed 46 fish; up to 2 misses
- Last Light Lagoon (Ascended): feed 50 fish; up to 2 misses

Each harbor has its own colors, animated rain, water, themed decoration, music, and a difficulty face that changes from friendly to angry. The menus, previews, fish, baskets, bear, messages, weather, and scene transitions are animated too. Press the large center Play button to open the Main Levels screen, then choose a harbor. Press `1`-`9` for a quick start.

## Points and the shop

- Caught fish are stored in your basket and do not award points immediately.
- Press `F` to feed one stored fish to the bear and add 1 unbanked run point.
- A collectible silver nickel appears during each level and adds 5 unbanked run points.
- Nickels do not count as misses if they fall past the basket.
- Run points are only added to your permanent total after clearing the level.
- Restarting, returning to the menu, or losing the level discards unbanked points.
- Open the **Points Shop** from the level menu or press `P` to buy fish and baskets.
- Buying an item subtracts its price from your bank. Purchased items normally stay owned permanently, except baskets removed by a failure penalty on the first eight levels.
- Open **Skins** beside Play after buying an item to equip fish, baskets, nets, or ships. Settings contains display and audio options.
- Total points, purchases, selected styles, hitbox visibility, and sound settings are saved in browser storage.
- Mara sells multiple nets, plus a **Starter Sloop** ship mode for 250 points. Nets move 45% faster and make missed fish harmless, but the bear gets hungry 5x faster while a net is active. Ships move 85% faster and have a much larger catch zone.
- If you run out of misses or the bear reaches 0% hunger, the first twelve levels can remove owned baskets, but banked points are always safe. Only unbanked run points are discarded. The final four levels are protected from the basket penalty.
- Cleared levels are saved and shown with a green check mark in the level menu.
- Mara, the shopkeeper, offers an expanded catalog of fish and baskets.
- The Achievements screen tracks ten milestones and shows a pop-up the first time each one is completed.
- Settings includes a **RESET DATA** button with a confirmation warning. Confirming removes this game's saved points, unlocks, levels, skins, and achievements.

## Hungry bear

The bear has its own **Feed the Bear** tab beside Settings on the level menu. During a level, press `F` to pause and open this tab. Feeding a stored fish restores the hunger bar and adds run points.

The hunger bar drains by exactly 2% per second on every level, or 10% per second while a net is active. A full bar lasts 50 seconds without feeding normally. If it reaches zero, the game automatically opens the Feed the Bear tab and stays paused until you feed the bear or restart the level. Feeding from the menu remains in the menu and never opens a level-clear screen.

## Chat

Open **CHAT** from the main menu. The game creates a player ID and remembers it in browser storage. You can change it with **NEW ID**, copy it, paste a friend's ID into **FRIEND ID**, and send messages. Messages are limited to 240 characters and the latest 100 messages are kept locally.

The current game has no network backend, so chat uses the browser's `BroadcastChannel` API and works between open game tabs on the same origin. IDs alone cannot connect different devices over the internet. Cross-device chat requires adding a server relay and configuring it to authenticate IDs and route messages.

## Accounts and profiles

The game asks you to **CREATE ACCOUNT** or **SIGN IN** when it opens. You may continue as a guest for the main levels and Challenges; Stats still requires a signed-in account. Passwords are hashed before being stored in this browser. When the hosted server worker is used, admin bans are shared with every browser using that deployment; the current worker keeps the ban list in memory, so a durable database/KV store is needed for bans to survive a server restart.

The **PROFILES** menu shows locally discovered accounts, including their stats, equipped fish/basket/net/bear/ship skins, following list, friends, and follower count. You can follow an account or send a friend request. This offline build discovers profiles only from the same browser/origin through local storage and open tabs; real multi-device accounts, friend requests, and following require a server backend.

## Live mode

Turn on **LIVE MODE** in Settings to add a **LIVE · WATCH** tab to the main menu. It advertises a small gameplay snapshot from this tab—player ID, current level, progress, hunger, basket position, and falling fish—to other open copies of the game using `BroadcastChannel`. The Live tab renders the most recent nearby player snapshot and lists active players.

Live mode includes a chat panel in the top-right. The **MIC** control requests microphone permission and releases the microphone when turned off; the current offline build does not transmit audio to other devices. **TURN CHAT OFF** disables live chat input locally. Cross-device video, voice, and chat require a server relay/WebRTC service.

## Fish styles

Buy fish in the Points Shop, then choose an owned appearance from Skins:

- Golden: available immediately
- Clownfish: 10 points
- Blue Tang: 25 points
- Koi: 45 points
- Neon Tetra: 70 points
- Puffer: 100 points
- Angelfish: 140 points
- Galaxy Guppy: 190 points
- Lionfish: 240 points
- Moon Jelly: 300 points
- Parrotfish: 370 points
- Sunfish: 450 points
- Dragonfish: 540 points
- Prism Koi: 650 points
- Reef Runner: 760 points
- Violet Betta: 880 points
- Golden Orb: 1020 points
- Deep Drifter: 1180 points

## Basket styles

Buy baskets in the Points Shop, then choose an owned design from Skins:

- Wicker: available immediately
- Ocean: 15 points
- Cherry: 30 points
- Forest: 50 points
- Royal: 75 points
- Sunset: 105 points
- Glacier: 145 points
- Obsidian: 200 points
- Pearl: 240 points
- Tidal: 300 points
- Sunspark: 370 points
- Deep Sea: 450 points
- Coral Crown: 540 points
- Starweave: 650 points
- Reef Runner: 760 points
- Violet Wave: 880 points
- Golden Reef: 1020 points
- Deep Drifter: 1180 points

Skins also equips purchased nets and ships. The top-right bear button in Settings opens the bear shop.

## Controls

- Arrow keys or `A` / `D`: move the basket
- `F`: open the Feed the Bear tab during a level; feed one fish while inside it
- `N`: switch to a purchased net
- `T`: switch to a purchased ship
- `H`: show or hide the fish and basket hitboxes
- `R`: replay after winning or losing
- `M`: return to the level menu
- `S`: open Settings from the level menu
- `P`: open the Points Shop from the level menu
- Toggle **Phonk Mode** in Settings to remix every soundtrack while music is enabled
- Toggle **Low Detail** in Settings to cap the game at 24 FPS and reduce rain.
- Toggle **3D Mode** in Settings to apply a perspective presentation to the whole game.

Settings also includes **MOBILE CONTROLS**. Turn it on to show large touch buttons during a level: left/right movement, Feed Bear, Net, and Ship. The touch overlay hides outside active gameplay, so menus and text inputs remain usable.

## Audio

Fish catches, misses, bear feeding, and nickel pickups have their own sound effects. The main menu has its own looping music, and each level has a generated music pattern matched to its name and mood, from gentle bay melodies to pirate, storm, volcano, aurora, and cosmic themes. Audio is synthesized in the browser, so there are no sound assets to download or configure.

Settings includes **Phonk Mode**. Turn it on while Sound & Music is enabled to convert the menu and every level soundtrack into a darker, bass-heavy phonk arrangement.

## Requirements

- Node.js 18+ (the current LTS release is recommended)
- npm (included with Node.js)

## Run locally

From this directory:

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

The Vite development and preview servers send a restrictive Content Security Policy and
additional browser security headers. If you deploy `dist/` to another host, configure
that host to send the same headers; static files do not carry response headers with them.

## Security boundary

Scores, unlocks, and achievements are saved in the player's browser, so anyone who
controls the browser can still edit the save or modify the shipped JavaScript. The
hosted server worker provides shared account-ban checks, but its in-memory ban list is
not a replacement for durable account storage or server-authoritative authentication.
For competitive scores and permanent moderation, use a database/KV-backed backend and
calculate/store validated events server-side.

Vite watches the `src` directory, so edits appear in the browser automatically.

## Verify a production build

```bash
npm run build
npm run preview
```

The production files are written to `dist/`. `npm run preview` serves that build locally.

## Project structure

```text
index.html              HTML shell
src/main.ts             Phaser bootstrap and game configuration
src/game/scenes/        Phaser scenes
src/game/audio/         Generated music and sound effects
src/style.css           Page and canvas layout
vite.config.ts          Vite configuration (uses defaults)
```

The game draws its visuals at runtime, so there are no asset downloads or asset paths to configure.
