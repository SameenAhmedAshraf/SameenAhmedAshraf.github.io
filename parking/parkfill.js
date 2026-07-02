// ParkFill — Parking Registration Auto-Fill  (v17: multi-car)
// ─────────────────────────────────────────────────────────────
// Registers every car in the clipboard queue one after another.
// Per car: Visitor Parking → fill → auto-submit (on-screen) → retry on
// AJAX errors → E-Mail Confirmation → fill email → Send.

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const raw = Pasteboard.paste();
  let d;
  try {
    d = JSON.parse(raw);
    if (!d.url) throw 0;
  } catch (e) {
    const a = new Alert();
    a.title = "ParkFill";
    a.message = "Open Park Register, pick a complex and car(s), then tap Register first.";
    a.addAction("OK");
    await a.present();
    return;
  }

  // Multi-car queue; fall back to legacy single-car clipboard data
  let cars = Array.isArray(d.cars) && d.cars.length ? d.cars
           : [{ make: d.make, model: d.model, plate: d.plate, email: d.email, label: d.label }];

  // Trim stray spaces everywhere
  cars = cars.map(c => {
    const o = {};
    for (const k in c) o[k] = typeof c[k] === "string" ? c[k].trim() : c[k];
    return o;
  });
  const apt = String(d.apt || "").trim();

  const wv = new WebView();
  let presentPromise = null;
  const results = [];

  for (let i = 0; i < cars.length; i++) {
    const car = cars[i];
    const name = car.label || car.plate || ("car " + (i + 1));

    await wv.loadURL(d.url);

    // Prep: visitor parking + fill + schedule submit + watcher.
    // First car waits 4.5s (webview becomes visible first); later cars 1.5s.
    let r;
    try {
      r = await wv.evaluateJavaScript(prepScript(d.url, apt, car, i === 0 ? 4500 : 1500), true);
    } catch (e) {
      r = "FAIL: " + e;
    }
    if (String(r).indexOf("FAIL") === 0) {
      results.push(name + " — " + r);
      continue;
    }

    // Show the webview once, right after the first car's form is filled
    if (!presentPromise) {
      presentPromise = wv.present(false);
      await sleep(700);
    }

    // Wait until this car's flow finishes inside the page
    let done;
    try {
      done = await Promise.race([
        wv.evaluateJavaScript(waitScript(), true),
        sleep(100000).then(() => "stuck"),
      ]);
    } catch (e) {
      done = "error: " + e;
    }
    results.push(name + " — " + done);

    if (i < cars.length - 1) await sleep(1200);
  }

  // Report only if something didn't finish cleanly
  const bad = results.filter(r => !/registered/.test(r));
  if (bad.length) {
    const a = new Alert();
    a.title = "ParkFill — " + (results.length - bad.length) + "/" + results.length + " done";
    a.message = results.join("\n");
    a.addAction("OK");
    await a.present();
  }

  await (presentPromise || wv.present(false));
}

// Runs in the page: polls the flags the prep script maintains.
function waitScript() {
  return `(function () {
  var waited = 0;
  (function poll() {
    var s = window.__pf || {};
    if (s.finished) return completion(s.msg || "registered");
    waited += 500;
    if (waited > 90000) return completion(s.registered ? "registered (email may not have sent)" : "timed out");
    setTimeout(poll, 500);
  })();
})();`;
}

function prepScript(url, apt, car, submitDelay) {
  const D = JSON.stringify({ apt: apt, make: car.make || "", model: car.model || "",
    plate: car.plate || "", email: car.email || "" })
    .replace(/</g, "\\u003C").replace(/>/g, "\\u003E");

  return `(function () {
  var D = ${D};
  var done = false;
  function finish(msg) { if (done) return; done = true; completion(msg); }

  window.__pf = { registered: false, finished: false, msg: "" };
  function flag(msg) { window.__pf.finished = true; window.__pf.msg = msg; }

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

  // ── Submit machinery (fires after webview is on screen) ──────────────────
  var attempts = 0, MAX_ATTEMPTS = 4;
  var retryTimer = null;

  function submitNow() {
    if (window.__pf.registered || attempts >= MAX_ATTEMPTS) return;
    attempts++;
    click("vehicleInformation");
    clearTimeout(retryTimer);
    retryTimer = setTimeout(function () {
      if (!window.__pf.registered) submitNow();
    }, 9000);
  }

  // Hook alert(): the site reports AJAX failures there → swallow + retry
  try {
    var realAlert = window.alert;
    window.alert = function (msg) {
      if (/ajax|error/i.test(String(msg))) {
        clearTimeout(retryTimer);
        if (!window.__pf.registered && attempts < MAX_ATTEMPTS) {
          retryTimer = setTimeout(submitNow, 2500);
        } else if (!window.__pf.registered) {
          flag("submit kept failing — tap Next on the page");
        }
        return;
      }
      try { realAlert(msg); } catch (e) {}
    };
  } catch (e) {}

  // ── Watcher: success detection + full email flow ──────────────────────────
  var emailClicked = false, emailSent = false, ticks = 0;
  var watcher = setInterval(function () {
    if (++ticks > 360) { clearInterval(watcher); if (!window.__pf.finished) flag(window.__pf.registered ? "registered" : "timed out"); return; }
    if (vis(el("email-confirmation"))) window.__pf.registered = true;
    if (!D.email) {
      if (window.__pf.registered) { flag("registered"); clearInterval(watcher); }
      return;
    }
    if (window.__pf.registered && !emailClicked) {
      emailClicked = true;
      click("email-confirmation");
      return;
    }
    if (emailClicked && !emailSent && vis(el("emailConfirmationEmailView"))) {
      fill("emailConfirmationEmailView", D.email);
      setTimeout(function () {
        if (!emailSent) {
          emailSent = true;
          click("email-confirmation-send-view");
          setTimeout(function () { flag("registered + email sent"); }, 900);
        }
      }, 400);
    }
    if (emailSent) clearInterval(watcher);
  }, 500);

  // ── Step 1: Visitor Parking → fill ────────────────────────────────────────
  waitFor("registrationTypeVisitor", 25, 400, function () {
    click("registrationTypeVisitor");
    stepForm();
  }, function () {
    if (el("vehicleApt")) stepForm();
    else finish("FAIL: Visitor Parking button not found. URL: " + location.href);
  });

  function stepForm() {
    waitFor("vehicleApt", 25, 400, function () {
      fill("vehicleApt",                 D.apt);
      fill("vehicleMake",                D.make);
      fill("vehicleModel",               D.model);
      fill("vehicleLicensePlate",        D.plate);
      fill("vehicleLicensePlateConfirm", D.plate);
      setTimeout(submitNow, ${submitDelay});
      finish("filled");
    }, function () {
      finish("FAIL: vehicle form did not appear.");
    });
  }

  setTimeout(function () { finish("FAIL: page never showed the form."); }, 30000);
})();`;
}

main();
