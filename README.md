# sameenahmedashraf.github.io

Personal site hosted on GitHub Pages. Two things live here:

| What | Where | Stack |
|------|-------|-------|
| **Portfolio** — data & analytics work, projects, certificates | [sameenahmedashraf.github.io](https://sameenahmedashraf.github.io) | Jekyll (minima theme) |
| **PARK_OS** — visitor-parking automation PWA | [sameenahmedashraf.github.io/parking](https://sameenahmedashraf.github.io/parking/) | Vanilla JS PWA + Scriptable companion script |

## Repository layout

```
├── _config.yml          Jekyll config (portfolio)
├── index.md             Portfolio home page
├── _layouts/ _includes/ _data/ assets/
│                        Portfolio theme, partials, images
├── parking/             PARK_OS — self-contained PWA (see parking/README.md)
│   ├── index.html       The app (UI, state, localStorage)
│   ├── parkfill.js      Scriptable auto-fill script (copied into the iOS Scriptable app)
│   ├── manifest.json    PWA manifest
│   └── sw.js            Service worker (cache versioning)
└── .github/workflows/   Jekyll build + Pages deploy on push to main
```

## Portfolio

- Personal info and links: `_config.yml`
- Home page content: `index.md`
- Projects: `_data/projects.yml`
- Images: `assets/images/`

## PARK_OS (parking)

A PWA that registers visitor cars on register2park.com automatically —
multi-select saved cars, run once, every car gets registered and its driver
emailed a confirmation. Full documentation, architecture and setup live in
[`parking/README.md`](parking/README.md).

## Deploying

Push to `main` — the *Deploy Jekyll site to Pages* workflow builds and
publishes automatically. The `parking/` app is copied through Jekyll as
static files (`parking/index.html` carries `layout: none` front matter so
the portfolio layout is not injected).

When changing anything under `parking/` that clients cache, bump the `CACHE`
version constant in `parking/sw.js` so installed PWAs pick up the update.

## Local preview

```bash
bundle install
bundle exec jekyll serve   # http://localhost:4000
```
