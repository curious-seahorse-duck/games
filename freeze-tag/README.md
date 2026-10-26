# UFO Blaster Freeze Tag

A playable solo version of the V1 design, built with the same core stack as Fish Rain: Phaser 4, TypeScript, and Vite.

You enter an expanded abandoned school in a configurable 8–60 player lobby. One participant is secretly an Alien Hunter, Phantom, Brute, or Trickster, while Humans can be Burners, Detectives, Guardians, Runners, or Civilians. The Alien wins by reaching the freeze target; the Humans win by gathering clues and correctly accusing the Alien during an emergency meeting.

## Included in this build

- 8–60 player matches with four Alien roles, five Human roles, and bots filling every empty lobby spot
- A ten-second safety period
- Bare-hand freezing, Freeze Ray, and two-second Invisibility
- Frozen-player movement and voting restrictions
- Burner rescues with a visible 30-second cooldown and automatic transfer if the Burner is frozen
- Detective scans, Guardian freeze shields, Runner speed boosts, and clue-focused Civilians
- Bot chasing, rescuing, witnessing, suspicion, meeting calls, and voting
- A dynamic Danger Phase and win target based on the selected match size
- Emergency meeting button, discussion clues, majority voting, and a 20-second cooldown
- Browser-saved Alien Bits, a curated generated skin catalog, seasonal holiday drops, Verifier-only skins, nine functional tools, and equipment choices
- A code-only Crowned Enforcer skin with gold hair, a white-and-red mask, jagged silver crown, teal jacket, gold chain, red pack, and shoulder bat
- 405 purchasable main-menu texture packs with per-account ownership and selection
- A private server-verified admin control panel for ban, unban, and infinite Alien Bits
- Refresh-safe admin sessions that remain private to the current browser tab
- A paginated locker of 104 admin-only skins, including a customizable Drippy Hall Monitor with eight colors and a school-supplies set
- Account search cards with equipped-skin previews and color-coded normal, admin, and banned status
- Three featured one-time skin codes plus 100 numbered drops from `SKINDROP001` through `SKINDROP100`
- Six pages of controls with eight core settings and 40 additional saved preferences
- A huge 6,500×4,400 abandoned-school map with thirty decorated rooms, maze-like hall bands, five cross-halls, and a central lobby
- Gamer-tag bot names, bright green-and-purple menus, and alien-framed shops and settings
- Runtime-drawn characters, map art, particles, synthesized sound effects, and a Danger-reactive mystery soundtrack
- Local password storage, searchable shared gamer-name accounts, a friend directory, sign-in, sign-out, and per-account progression stored in the browser
- A Friend Party picker that reserves lobby spots for selected friends and fills the rest of the minimum eight-player lobby with bots
- Persistent local login, personality-driven bot chat, a working voting selector, and an in-match exit option
- An in-game UFOtube studio with server-verified creator checkmarks, gameplay-only streams, three stream-frame styles, Alien Bit donations, and child-friendly safety rules
- A private Verifier role that can approve accounts; only verified accounts may enter the live studio or redeem the Admin code
- Console Mode with standard gamepad movement and action mappings while keeping keyboard controls available
- A draggable on-screen joystick, replacing the four touch arrow buttons
- A saved Mobile Mode switch in Settings, with a left joystick, touch action/power buttons, nine-tool support, and multi-touch movement
- Two-sided friend requests with approve, disapprove, and unfriend actions
- Watchable UFOtube channels with live viewer counts that publish gameplay video, optional audience microphone audio, and mandatory captions
- An always-on caption bot and language check during streams, with automatic stream shutdown and a browser-local permanent account ban when explicit blocked language is detected
- A dedicated main-menu Verifier tab for creator approvals and World Record badges
- A looping animated main-menu story trailer and 24 illustrated story scenes with captions, transitions, autoplay, pause, and previous/next controls
- A refreshed UFO logo, title and Play button on the left, animated trailer on the right, and a complete feature grid underneath
- Saved color-blind settings with All Types, red/green/blue vision presets, monochrome, reduced color, status symbols, and stronger contrast
- A functional 1–120 FPS limiter, six lore chapters, 496 generated achievements, WR account badges, and separate animated Human/Alien victory screens
- A separate accessory locker, with accessories equippable independently from skins
- A freeze-tag arena editor with three grid sizes, seven building tools, text labels, colors, hitbox previews, undo, test matches, publishing, and community browsing
- A Mods menu with 40 Alien Bit purchases covering gameplay upgrades, arena lighting, and movement trails
- A Verifier-only skin studio for shape designs and uploaded PNG/JPG/WebP images, with public previews and free equipping
- Styled gift cards for every catalog skin and every published community skin, with search, paging, personal messages, and a recipient gift inbox
- UFOtube video uploads stored in browser IndexedDB, limited to verified accounts and guarded by a required child-safety transcript scan
- WebRTC live gameplay video and microphone audio, with HTTP gameplay-frame fallback when a peer-to-peer connection is unavailable
- On-stream donation alerts showing the donor gamer name, equipped skin, and Alien Bit amount, with donated Bits credited to the streamer

This is a local solo simulation. Selected friend accounts appear in the party roster as computer-controlled stand-ins, and bots fill the remaining slots. Accounts and chat are browser-local: bots start conversations, talk to each other, react to the match, and answer your free-form messages with varied personalities. Your account and current admin session persist after a refresh. Real-time multiplayer controls, human-to-human network chat, and cross-device progression would require a persistent multiplayer backend and are outside this build.

## Requirements

- Node.js 18 or newer
- npm (included with Node.js)

## Run locally

Open a terminal in the `freeze-tag` folder, then run:

```bash
npm install
npm run dev
```

Open the URL shown by Vite, normally `http://localhost:5174/freeze-tag/`.

## Controls

- `WASD` or arrow keys: move
- `Space`: context action (freeze, unfreeze, or call a meeting)
- `M`: call a meeting while near the lobby button
- `T`: open the live bot chat during a match
- `Z`: use your Human or Alien role ability
- `Q`: fire an equipped Freeze Ray
- `E`: use equipped Invisibility
- `R`: use equipped Blink Drive
- `F`: place an equipped Cryo Mine
- `X`: use an equipped UFO Jammer
- `C`: use an equipped Frost Pulse
- `V`: deploy an equipped Holo Decoy
- `B`: use an equipped Vent Hop
- `G`: use an equipped Tracker Ping
- `Esc`: return to the main menu

With **Console Mode** enabled in Settings:

- Left stick or D-pad: move
- `A`: context action
- `X`: use your role ability
- `Y`: use your first equipped tool
- `B`: use Invisibility
- `LB`: call a meeting
- `RB`: fire the Freeze Ray

Keyboard and touch controls remain available as fallbacks.

Turn on **Settings → Mobile Mode** to show a left-thumb joystick and right-side action, role-power, and equipped-tool buttons during matches. You can move and use abilities simultaneously; lifting the action finger does not release the joystick. All nine Alien tools fit in two rows. New phone sessions enable the mode automatically, while an explicit saved Off choice is respected. New desktop sessions start with it off. Keyboard controls remain available. Mobile Mode uses the existing saved touch-controls preference, so earlier on-screen control choices carry over.

Menu tabs and buttons now have solid dark-black outer outlines, with a lighter inner border retained for contrast in color-blind modes.

On-screen movement, action, Freeze Ray, and Invisibility buttons provide mouse and touch controls during a match. Music begins after your first button press so browsers can grant audio playback correctly.

After a Burner successfully unfreezes a player, their rescue ability has a 30-second cooldown. The remaining time appears in the HUD and beside a nearby frozen player.

Human roles are assigned every match. Detectives scan nearby players with 85% accuracy, Guardians block a freezing attempt for six seconds, and Runners move faster with a four-second boost. Civilians have no powered ability and must rely on observation, chat, and voting.

Alien roles are also assigned every match. Hunters move faster and reveal the five nearest Humans, Phantoms cloak from witnesses, Brutes enter a fast shield-breaking frenzy with longer freeze reach, and Tricksters erase nearby witness clues. Press `Z` to use the current Alien role power; purchased tools remain separate and keep their own keys.

When the frozen-player count reaches Danger Phase, the soundtrack changes to a faster dramatic mix with urgent bass and alarm sweeps. This can be disabled with **Danger Remix** in Settings. Settings also includes Console Mode, screen shake, reduced motion, gamer-tag visibility, bot meetings, touch controls, and separate music/effect volume controls.

**Settings → Color-Blind Mode** cycles between Off, All Types, Protanopia, Protanomaly, Deuteranopia, Deuteranomaly, Tritanopia, Tritanomaly, Monochrome, and Reduced Color. **Color Mode Previews** opens all ten options together. All active presets add readable button contrast, brighter wall and character outlines, and explicit frozen/ejected labels. When gamer names are hidden, players get numbered identifiers instead; hidden roles remain hidden. All Types uses blue/amber UI cues and labels. Monochrome and Reduced Color also filter the canvas display and outgoing gameplay frames. The preference saves per account and older saves start with Off. Console Mode is on the device-controls page.

The design uses text and shapes alongside color, following [W3C's guidance on using color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html). The preset families follow the [National Eye Institute's descriptions of color vision deficiency](https://www.nei.nih.gov/eye-health-information/eye-conditions-and-diseases/color-blindness/types-color-vision-deficiency); these are display preferences, not a vision test or medical correction.

## UFOtube live studio

Open **UFOtube Live** from the main menu after signing in to enter the UFOtube studio. A server-approved creator receives a checkmark beside their gamer name. Only verified accounts can press **Go Live & Play**, and the server also blocks unverified accounts from redeeming the private Admin code. A Verifier can approve another existing account by exact gamer name.

The studio streams gameplay only. Face cameras are disabled, camera permission is never requested, and the local and production servers send a policy blocking camera access. Microphone permission and browser speech recognition are required for the caption bot and language check. These remain on even when audience audio is muted; there is no caption opt-out. A stream cannot start without the bot, and ends if captions fail or microphone access is lost. Recognition automatically restarts after a normal speech session ends, pausing outgoing audio and new frames until it reconnects.

**Watch Streams** lists active verified channels and first attempts a WebRTC connection for gameplay video and optional microphone audio. Captions are drawn into the gameplay video and supplied with the HTTP frame fallback. The safety panel requires no swearing or bullying, child-appropriate content, no private information, and permission from a trusted adult. Browser speech recognition can miss words and requires a supported browser and permission; it is not a guarantee of complete moderation.

Activate the Verifier role through **Codes**. Only signed-in accounts with an active Verifier role and session see the **Verifier** main-menu tab. That tab contains creator approval and WR badge controls. The previous Verifier activation codes have been replaced.

Open **Verifier → Champion Colors** to recolor Checkmark Champion in Classic Green, Cosmic Violet, Electric Blue, Crimson Red, Royal Gold, Arctic Cyan, Neon Pink, or Pearl White. Selecting a color equips the free Verifier skin and changes its outfit, accents, and checkmark badge together. Your choice is saved per account and appears in your locker preview and matches. Only an active Verifier can change it; shared catalog and gift-card previews keep their original colors.

Role codes can be entered again to reactivate a session. Redemption registers your current browser account with the shared service first, including after a server restart. Private codes require the API service; a connection failure is reported separately from an invalid code. Local development loads `server/game-api.mjs` directly and reloads it when that source changes, so API code changes do not require a production build. Restart an already-running older dev server once after this update. Production builds package the same API source into `dist/server/index.js`.

The main menu plays a six-scene animated trailer. **Story** opens illustrated chapter cards and a player with distinct artwork for all 24 scenes, progressive narration, automatic playback, pause, previous/next controls, and chapter skin rewards. Use Left/Right to navigate, Enter to reveal narration or advance, Space to pause/resume autoplay, and Escape to return to chapters. Reduced Motion disables the trailer loop and illustration animation, shows narration immediately, and starts story playback paused.

Verified accounts can also upload UFOtube videos. Videos are stored on the current device using IndexedDB, with an 80 MB limit. A written transcript is required and scanned before the upload is accepted; rejected language permanently bans that account in the current browser. Dedicated cloud video storage and automatic audio-file transcription would require a configured media/AI service, so the local build uses the supplied transcript instead.

## Creator maps and accessories

Open **Creator Maps** from the main menu to build freeze-tag arenas on an 18×8, 30×14, or 42×20 grid (up to 840 cells). Paint walls, circular obstacles, crates, desks, plants, lamps, and text labels, choose object colors, erase, undo up to 40 strokes, resize, test, name, and publish. The center remains reserved for players and the meeting button. Resizing preserves cell coordinates and can be undone. Circle, crate, desk, and wall collisions work in matches, and bots route around solid cells; plants, lamps, and text are decorative. **Hitboxes** displays gold collision bounds and cyan decorative bounds in the editor and during draft test matches. Legacy 18×8 block maps remain playable.

Open **Mods** from the main menu for 40 purchasable mods: 20 gameplay upgrades, 10 arena lighting styles, and 10 movement trails, priced from 75,000 to 455,000 Alien Bits. Purchases are permanent per account, and buying enables a mod. Owned mods can be toggled for free; only one lighting style and one trail can be active at a time. Gameplay mods apply to your character, with Extra Recess and Fast Intercom changing the shared match timers. Trails respect Reduced Motion. The selected mods also work in creator arenas.

The skin shop has 3,900 fewer generated entries (703 shop entries remain). Existing skin IDs, previously owned retired skins, seasonal drops, admin lockers, and code rewards remain compatible. Open **Accessories** from Customize to change head accessories independently from skins.

Open **Verifier → Skin Editor** to build a shape skin or upload a PNG, JPG, or WebP image up to 5 MB and 4096 × 4096 pixels. Images are prepared as transparent 128 × 128 PNG avatars with their proportions preserved. Preview, name, and publish your design; everyone can equip it through **Customize → Public Skins**. Uploaded images display as the entire character in previews and matches. Both the editor and publishing endpoint require the Verifier role; an Admin session alone does not grant access. Public skins are kept in the current server's in-memory gallery, while an equipped skin is also saved with the browser account.

Open **Gift Cards** from the main menu for a card for every skin: all 4,607 built-in catalog entries, including retired, seasonal, code, Verifier, and Admin cosmetics, plus published community shapes and uploaded images. Use **Search Skins** to find a skin by name or collection, or browse six cards per page. Cards show the skin preview, decorative borders, foil-style colors, and animated sparkles. Prices scale with the skin's price; community cards cost 150 Alien Bits. The original six card IDs and prices remain compatible with old gifts and pending purchases. Gifting an exclusive cosmetic does not grant the recipient its associated account role.

Choose a card, enter another gamer's exact name, and add an optional message. The recipient opens **Gift Cards → My Gift Inbox** to claim and equip it for free. Community gifts include the published skin's image and design. **Sent Cards** keeps your last 60 receipts on this browser account; uploaded image data is omitted from stored sender receipts to avoid bloating browser saves. Gift claims can safely be retried without duplicating skins.

The recipient must exist on the running game server; accounts already saved on the sender's browser can be registered automatically. If the server rejects a purchase, reserved Bits are refunded. A lost response leaves the payment reserved with a retry button; retrying the same purchase does not charge again or create a second card. Pending payments and sent receipts survive a browser refresh. The shared inbox, gallery, and gift transaction records are in server memory and do not survive a server process restart; durable cross-restart delivery requires persistent server storage.

Friend requests are pending until the recipient opens Friends and chooses approve or disapprove. Either player can later use Unfriend. Verifiers can approve creator accounts and award a `WR` badge, while unverified accounts are blocked from both going live and redeeming the private Admin code.

## Local accounts

Open **Account** from the main menu to create a gamer name, sign in, or sign out. You must be signed in to enter a match. Passwords are salted and derived locally with PBKDF2 before storage. Each account keeps its own Alien Bits, unlocks, equipped items, selected skin, chat history, match count, and settings. Your active login survives a normal page refresh.

Accounts are local to the current browser and device. There is no network backend, email recovery, or cross-device sync. Clearing browser storage deletes the accounts and their progress.

During a meeting, click a player card to place a bright green check mark beside that player, then choose **Confirm Checked Vote**. In this solo version, the bots support your checked choice and that player is ejected. Choosing Skip leaves the normal bot tally in place.

The menu also includes **Alien Practice**, which guarantees that you play as the Alien so you can test the offensive abilities without waiting for random role selection. Practice matches never award Alien Bits. Turning **Bot Meetings** off in Settings also disables all match rewards.

## Production build

For the shared GitHub Pages arcade, see the [repository deployment guide](../README.md). `npm run build:pages` builds static browser files with relative asset URLs. The root build packages both games and a shared home page. GitHub Pages cannot run the API server: shared accounts, Verifier activation, public uploads/maps, gifts, and live streaming require separate backend hosting.

Run `npm test` for caption lifecycle, story navigation, map collisions, mod purchases, Verifier activation, image uploads and access restrictions, gift delivery, payment retries, refunds, and shop compatibility. These use browser stubs and do not replace testing real browser permissions, uploads, and visuals.

```bash
npm run build
npm run preview
```

The production files are written to `dist/`, and preview normally runs at `http://localhost:4174/freeze-tag/`.

Progress is stored in the browser using `localStorage`. Clearing site data deletes local accounts, chat history, Alien Bits, unlocks, equipped tools, and selected skins.
