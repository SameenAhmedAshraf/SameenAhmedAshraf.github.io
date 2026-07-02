// ParkFill — Parking Registration Auto-Fill  (v16)
// ──────────────────────────────────────────────────
// Flow: fill the form while loading, then PRESENT the WebView and submit
// while it is on screen (background webviews get their AJAX killed by iOS,
// which caused "AJAX error:"). The page hooks window.alert to catch the
// site's AJAX error popup and auto-retries the submit.

async function main() {
  const raw = Pasteboard.paste();
  let d;
  try {
    d = JSON.parse(raw);
    if (!d.url) throw 0;
  } catch (e) {
    const a = new Alert();
    a.title = "ParkFill";
    a.message = "Open Park Register, pick a complex and car, then tap Auto-Fill first.";
    a.addAction("OK");
    await a.present();
    return;
  }

  // Trim stray spaces (e.g. "Highlander ")
  for (const k in d) if (typeof d[k] === "string") d[k] = d[k].trim();

  const wv = new WebView();
  await wv.loadURL(d.url);

  // Phase 1 (webview still hidden): click Visitor Parking, fill the form,
  // install the alert hook + auto-submit (4.5s) + email watcher, then
  // signal back. The submit itself fires AFTER the webview is visible.
  let r = "no result";
  try {
    r = await wv.evaluateJavaScript(prepScript(d), true);
  } catch (e) {
    r = "FAIL: script error: " + e;
  }

  if (String(r).indexOf("FAIL") === 0) {
    const a = new Alert();
    a.title = "ParkFill";
    a.message = String(r);
    a.addAction("Open page");
    await a.present();
  }

  // Present immediately — the page's own timers submit ~4.5s after the
  // fill, retry on AJAX errors, and run the email steps, all on screen.
  await wv.present(false);
}

function prepScript(d) {
  const D = JSON.stringify(d).replace(/</g, "\\u003C").replace(/>/g, "\\u003E");

  return `(function () {
  var D = ${D};
  var done = false;
  function finish(msg) { if (done) return; done = true; completion(msg); }

  function el(id) { return document.getElementById(id); }
  function vis(e) { return !!(e && e.offsetParent !== null); }

  function fill(id, v) {
    var e = el(id);
    if (!e || v === undefined || v === null || v === "") return false;
    e.value = String(v);
    e.dispatchEvent(new Event("input",  { bubbles: true }));
    e.dispatchEvent(new Event("change", { bubbles: true }));
    e.dispatchEvent(new Event("blur",   { bubbles: true }));
    return true;
  }

  function click(id) {
    var e = el(id);
    if (!e) return false;
    e.click();
    return true;
  }

  function waitFor(id, tries, ms, cb, fail) {
    (function poll(n) {
      if (vis(el(id))) return cb();
      if (n <= 0) return fail();
      setTimeout(function () { poll(n - 1); }, ms);
    })(tries);
  }

  // ── Submit machinery (runs on page timers AFTER webview is visible) ──────
  var registered = false;      // email-confirmation button appeared
  var attempts = 0, MAX_ATTEMPTS = 4;
  var retryTimer = null;

  function submitNow() {
    if (registered || attempts >= MAX_ATTEMPTS) return;
    attempts++;
    click("vehicleInformation");
    // If nothing happens in 9s (no success, no alert), try again
    clearTimeout(retryTimer);
    retryTimer = setTimeout(function () {
      if (!registered) submitNow();
    }, 9000);
  }

  // Hook the site's alert() — it announces AJAX failures there.
  // Suppress the popup and schedule a retry.
  try {
    var realAlert = window.alert;
    window.alert = function (msg) {
      if (/ajax|error/i.test(String(msg))) {
        clearTimeout(retryTimer);
        if (!registered && attempts < MAX_ATTEMPTS) {
          retryTimer = setTimeout(submitNow, 2500);
        }
        return; // swallow the popup
      }
      try { realAlert(msg); } catch (e) {}
    };
  } catch (e) {}

  // ── Watcher: detects success and drives the whole email flow ─────────────
  var emailClicked = false, emailSent = false;
  var ticks = 0;
  var watcher = setInterval(function () {
    if (++ticks > 360) { clearInterval(watcher); return; }  // 3 min
    if (vis(el("email-confirmation"))) registered = true;
    if (!D.email) { if (registered) clearInterval(watcher); return; }
    if (registered && !emailClicked) {
      emailClicked = true;
      click("email-confirmation");
      return;
    }
    if (emailClicked && !emailSent && vis(el("emailConfirmationEmailView"))) {
      fill("emailConfirmationEmailView", D.email);
      setTimeout(function () {
        if (!emailSent) { emailSent = true; click("email-confirmation-send-view"); }
      }, 400);
    }
    if (emailSent) clearInterval(watcher);
  }, 500);

  // ── Step 1: Visitor Parking, then fill ────────────────────────────────────
  waitFor("registrationTypeVisitor", 25, 400, function () {
    click("registrationTypeVisitor");
    stepForm();
  }, function () {
    if (el("vehicleApt")) stepForm();
    else finish("FAIL: Visitor Parking button not found. Check the complex URL. URL: " + location.href);
  });

  function stepForm() {
    waitFor("vehicleApt", 25, 400, function () {
      fill("vehicleApt",                 D.apt);
      fill("vehicleMake",                D.make);
      fill("vehicleModel",               D.model);
      fill("vehicleLicensePlate",        D.plate);
      fill("vehicleLicensePlateConfirm", D.plate);
      // Submit fires in 4.5s — after Scriptable presents the webview —
      // so the AJAX POST runs from an on-screen webview.
      setTimeout(submitNow, 4500);
      finish("filled");
    }, function () {
      finish("FAIL: vehicle form did not appear after clicking Visitor Parking.");
    });
  }

  // Watchdog for the prep phase only
  setTimeout(function () { finish("FAIL: page never showed the form. URL: " + location.href); }, 30000);
})();`;
}

main();
