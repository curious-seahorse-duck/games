# The Arcade

A learning project with two browser games built using Phaser 4, TypeScript, and Vite. Both games live in this repository and share a GitHub Pages home page.

## Play online

**[Open the arcade and choose a game](https://curious-seahorse-duck.github.io/games/)**

| Game | What you play | Direct link |
| --- | --- | --- |
| Fish Rain | Catch falling fish, feed a hungry bear, clear harbors, and unlock equipment. | [Play Fish Rain](https://curious-seahorse-duck.github.io/games/fish-rain/) |
| UFO Blaster Freeze Tag | Play solo with bots, freeze or rescue players, and identify the Alien through meetings and votes. | [Play Freeze Tag](https://curious-seahorse-duck.github.io/games/freeze-tag/) |

No installation is needed to play online. These links use the `curious-seahorse-duck/games` repository's GitHub Pages address and become available after a successful Pages deployment.

## Current state

This is a single-player learning project. Freeze Tag's other players, including friend-party stand-ins, are controlled by bots; the game does not provide real-time multiplayer.

The GitHub Pages edition includes the browser gameplay, built-in cosmetics, shops, settings, and browser-local progression. Freeze Tag also includes story scenes, a map editor with local test matches, gameplay mods, mobile controls, and color-blind display options. Create a local account in Freeze Tag's **Account** screen before starting a match. Fish Rain also lets you play as a guest.

Accounts, settings, and progress stay in the current browser and device. They do not sync across devices. Clearing browser storage removes local saves, and local development and the public site have separate saves.

GitHub Pages only serves static files. It does not run the games' `/api` routes, so the following features need a separately hosted backend:

- Freeze Tag's shared account directory, friend requests, Verifier/Admin activation, public map and skin publishing, gift delivery, shared moderation, and UFOtube live streaming.
- Fish Rain's shared profile and account-ban services. Its existing local features that communicate between tabs remain limited to the same browser and origin.

The local development servers provide API implementations for development; their shared service state is kept in memory and resets when the server restarts. Running these servers does not add multiplayer gameplay or cross-device save synchronization.

## Run locally

Install **Node.js 22 or newer** and npm. Clone the repository, then enter its root directory:

```sh
git clone https://github.com/curious-seahorse-duck/games.git
cd games
```

If you already have the repository, open a terminal in the folder containing `package.json`, `fish-rain/`, `freeze-tag/`, and `.github/`.

Install each game's dependencies using its lockfile:

```sh
npm ci --prefix fish-rain
npm ci --prefix freeze-tag
```

There are no root package dependencies to install. On Windows PowerShell, use `npm.cmd` instead of `npm` if script execution policy blocks `npm.ps1`.

### Fish Rain

From the repository root:

```sh
npm --prefix fish-rain run dev
```

Open **[http://localhost:5173/fish-rain/](http://localhost:5173/fish-rain/)**. Choose Play, then select a harbor. Use the arrow keys or `A` / `D` to move and `F` to open Feed the Bear. Mobile controls are available in Settings.

### UFO Blaster Freeze Tag

From the repository root, in a separate terminal if Fish Rain is already running:

```sh
npm --prefix freeze-tag run dev
```

Open **[http://localhost:5174/freeze-tag/](http://localhost:5174/freeze-tag/)**. Create or sign in to a local account, select Play, and configure a match. Use `WASD` or the arrow keys to move and `Space` for the context action. Enable **Settings → Mobile Mode** for touch controls.

Use the URL printed by Vite if the default port is occupied. Keep each server's terminal open while playing; press `Ctrl+C` to stop it. See the [Fish Rain guide](fish-rain/README.md) and [Freeze Tag guide](freeze-tag/README.md) for the full controls and game features.

## Build and preview the arcade

After installing both games' dependencies, run this from the repository root:

```sh
npm run build
```

This type-checks both games, runs their static `build:pages` builds, and assembles the shared home page and both games into `_site/`:

```text
_site/
  .nojekyll
  index.html
  style.css
  fish-rain/
    index.html
    assets/
  freeze-tag/
    index.html
    assets/
```

Serve `_site/` over HTTP rather than opening its HTML files directly. For example, if Python 3 is installed:

```sh
python -m http.server 8080 --directory _site
```

Open **[http://localhost:8080/](http://localhost:8080/)** to preview the arcade home page and both games. This static preview has the same backend limitations as GitHub Pages.

Each game's separate `npm run build` script also generates a server-worker package for other hosting options. The root Pages build publishes only the home page, game HTML, and built JavaScript/CSS assets; it excludes server workers, `.openai` configuration, and source files. That exclusion applies to the deployed website, not to files in a public GitHub repository.

## Run checks

From the repository root:

```sh
npm test --prefix freeze-tag
npm run test:pages
```

Freeze Tag's tests exercise game behavior and API flows with browser stubs. The Pages tests check packaging, relative links, and exclusion of server files. These checks do not replace testing the games in a real browser. Fish Rain currently has no dedicated test script; its TypeScript is checked during the build.

## Automatic GitHub Pages deployment

The workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) installs both games' dependencies, runs the checks, builds the arcade, and uploads `_site/`.

- Every push builds and tests both games.
- Pull requests targeting `main` also build and test.
- A successful build on `main` deploys to GitHub Pages automatically.
- Builds on other branches do not replace the live website.

To enable publishing, select **Settings → Pages → Build and deployment → Source → GitHub Actions** in the repository, then push to `main`. You can also run **Actions → Build games and deploy GitHub Pages → Run workflow** with `main` selected. The deployment job and **Settings → Pages** show the published URL. If a build or test fails, the previous deployment stays live. No personal access token or committed build output is needed.

The builds use relative asset URLs, so the games work under the `/games/` repository path. If the repository or domain changes, update the play links in this README. See [GitHub's custom workflow guide](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) for Pages setup details.

## Repository layout

```text
site/                       Shared arcade home page
fish-rain/                  Fish Rain app, source, and game guide
freeze-tag/                 Freeze Tag app, source, API, and game guide
scripts/assemble-pages.mjs   Packages both games for GitHub Pages
scripts/pages.test.mjs       Pages packaging tests
.github/workflows/           Build, test, and deployment workflow
```
