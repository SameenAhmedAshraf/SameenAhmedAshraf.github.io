# PARK_OS — visitor parking on autopilot

A two-part system that registers visitor cars on
[register2park.com](https://www.register2park.com) with one tap:

1. **The PWA** (`index.html`) — lives at
   [sameenahmedashraf.github.io/parking](https://sameenahmedashraf.github.io/parking/).
   Stores complexes (apartment #, registration URL) and visitor cars
   (driver name, email, make, model, plate) in `localStorage`. Multi-select
   cars, tap **RUN PARKFILL**, and it copies a JSON job to the clipboard.
2. **ParkFill** (`parkfill.js`) — a [Scriptable](https://scriptable.app)
   script (iOS). Reads the clipboard JSON, opens register2park in a WebView
   and registers every car in the queue automatically, emailing each driver
   their confirmation.

## One-time setup (new phone)

1. Open the PWA in Safari → Share → **Add to Home Screen**.
2. Install **Scriptable** (free, App Store).
3. In Scriptable: **+** → rename the script exactly `ParkFill` → paste the
   contents of `parkfill.js` → Done.
4. In the PWA's **BASES** tab, set each complex's apartment # and its
   register2park URL (open register2park.com in Safari, pick your complex,
   copy the address-bar URL — it looks like `…/register?key=xxxx`).

## Daily use

PWA → pick complex → tap cars to park them (multi-select) → **RUN PARKFILL**
→ **LAUNCH PARKFILL**. Keep the page on screen until the status pill says
`✓ all N registered`.

## Clipboard payload

```json
{
  "url":  "https://www.register2park.com/register?key=…",
  "apt":  "728",
  "cars": [
    { "label": "Mom", "make": "Toyota", "model": "Highlander",
      "plate": "XLZ3992", "email": "driver@example.com" }
  ]
}
```

Legacy single-car fields (`make`/`model`/`plate`/`email` at the top level)
are still accepted.

## How ParkFill works (architecture)

Hard-won constraints that shaped the design — change with care:

- **Scriptable ⇄ WebView calls hang while the WebView is presented.**
  Everything must be installed in ONE `evaluateJavaScript` call *before*
  `present()`. The injected master script then runs autonomously on page
  timers. A final summary is read back only *after* the user dismisses.
- **Submitting from a hidden WebView fails** (iOS kills the AJAX, the site
  alerts "AJAX error:"). The first submit is delayed ~4.5 s so the WebView
  is on screen by then.
- **The site reports AJAX failures via `window.alert()`** — the script hooks
  `alert`, swallows error popups and retries the submit (max 4 attempts).
- **"Register Another Vehicle" navigates the page**, destroying injected
  scripts. So the master script never touches the top page: it runs every
  car inside a full-screen **same-origin iframe** and reloads the iframe
  between cars. Parent timers + the HUD pill survive.
- **register2park element IDs** (confirmed against several open-source
  automations of the same site):
  `registrationTypeVisitor`, `vehicleApt`, `vehicleMake`, `vehicleModel`,
  `vehicleLicensePlate`, `vehicleLicensePlateConfirm`,
  `vehicleInformation` (red Next), `email-confirmation` (blue button),
  `emailConfirmationEmailView` (modal input),
  `email-confirmation-send-view` (green Send), `error-modal`.

Per-car state machine (400 ms tick):
`ifload → form → submit → registering → email → emailmodal → next car`.

## Daily automation (ParkAuto)

`parkauto.js` is a headless variant of ParkFill for unattended daily runs —
no page is presented; the result arrives as an iOS notification. It runs a
**saved job** (complex + selected cars); each car's confirmation email goes
to that car's saved driver email.

1. Scriptable → **+** → rename exactly `ParkAuto` → paste `parkauto.js` → Done.
2. **Select who gets registered daily:** in PARK_OS pick the complex, tap the
   cars, tap RUN PARKFILL (copies the job) → run ParkAuto by hand → tap
   **Save as daily job & run now**. Repeat these steps any time to change
   the selection; run ParkAuto by hand with an empty/old clipboard to see
   the current job.
3. Shortcuts app → **Automation** → **+** → *Time of Day* (e.g. 9:00 AM,
   Daily) → **Run Immediately** (turn OFF *Ask Before Running*) → add the
   Scriptable **Run Script** action → pick `ParkAuto` → turn OFF *Run In App*
   and *Show When Run*.

To pause/stop: toggle the automation off in Shortcuts. The phone must be on
and online at the scheduled time; if a run fails you get a ⚠ notification
and can run ParkFill manually that day.

## Caching / updates

- `sw.js` caches `/parking/` + `index.html` + `manifest.json` cache-first.
  **Bump the `CACHE` constant on every `index.html` change** or installed
  PWAs keep serving the old app (close + reopen the tab twice to update).
- `parkfill.js` is *not* SW-cached, but the copy pasted into Scriptable is
  frozen — after changing it, re-paste into the Scriptable app.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Old UI after deploy | SW cache — bump `sw.js` version, close & reopen tab twice |
| "ParkFill — open Park Register first" alert | Clipboard empty/stale — tap RUN PARKFILL again, then launch |
| "registration page did not load in the frame" | Site may block iframes (X-Frame-Options) or the complex URL is wrong |
| Submit retries then fails | register2park server-side errors — try again later, or tap Next manually (email still automates) |
