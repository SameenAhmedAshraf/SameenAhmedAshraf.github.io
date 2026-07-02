// ParkFill — Parking Registration Auto-Fill  (v18: multi-car, single session)
// ─────────────────────────────────────────────────────────────────────────────
// One master script installed BEFORE the webview is presented drives every
// car via an in-page state machine (Scriptable→WebView calls hang while the
// webview is presented, so nothing may depend on them after present()).
// Between cars it clicks the site's "Register Another Vehicle" button —
// same page session, timers keep running.

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

  let cars = Array.isArray(d.cars) && d.cars.length ? d.cars
           : [{ make: d.make, model: d.model, plate: d.plate, email: d.email, label: d.label }];
  cars = cars.map(c => {
    const o = {};
    for (const k in c) o[k] = typeof c[k] === "string" ? c[k].trim() : c[k];
    return o;
  });

  const wv = new WebView();
  await wv.loadURL(d.url);

  let r = "no result";
  try {
    r = await wv.evaluateJavaScript(masterScript(String(d.apt || "").trim(), cars), true);
  } catch (e) {
    r = "FAIL: " + e;
  }

  if (String(r).indexOf("FAIL") === 0) {
    const a = new Alert();
    a.title = "ParkFill";
    a.message = String(r);
    a.addAction("Open page");
    await a.present();
    await wv.present(false);
    return;
  }

  // The state machine now runs on in-page timers while the user watches.
  await wv.present(false);

  // After the user closes the webview, collect the per-car summary
  let summary = null;
  try {
    summary = await Promise.race([
      wv.evaluateJavaScript(
        "(function(){var s=window.__pf;completion(s?{fin:s.finished,res:s.results}:null);})();", true),
      sleep(4000).then(() => null),
    ]);
  } catch (e) {}

  if (summary && summary.res && summary.res.length) {
    const failed = summary.res.filter(x => /FAIL|skipped/.test(x));
    if (failed.length || !summary.fin) {
      const a = new Alert();
      a.title = "ParkFill — summary";
      a.message = summary.res.join("\n") + (summary.fin ? "" : "\n(closed before finishing)");
      a.addAction("OK");
      await a.present();
    }
  }
}

function masterScript(apt, cars) {
  const D = JSON.stringify({ apt: apt, cars: cars })
    .replace(/</g, "\\u003C").replace(/>/g, "\\u003E");

  return `(function () {
  var D = ${D};
  var CARS = D.cars;
  var completed = false;
  function ready(msg) { if (completed) return; completed = true; completion(msg); }

  window.__pf = { results: [], finished: false };
  var results = window.__pf.results;

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

  function click(id) { var e = el(id); if (!e) return false; e.click(); return true; }

  function btnByText(re) {
    var els = document.querySelectorAll('button, a, [role="button"], input[type="button"], input[type="submit"]');
    for (var k = 0; k < els.length; k++) {
      var e = els[k];
      if (!vis(e)) continue;
      var t = (e.textContent || e.value || "").replace(/\\s+/g, " ").trim();
      if (re.test(t)) return e;
    }
    return null;
  }

  // Dismiss visible dialogs that are NOT the email modal (e.g. "sent" confirmations)
  function dismissStrayModals() {
    var mods = document.querySelectorAll('.modal, [role="dialog"], .sweet-alert');
    for (var k = 0; k < mods.length; k++) {
      var m = mods[k];
      if (!vis(m)) continue;
      var emailIn = m.querySelector("#emailConfirmationEmailView");
      if (emailIn && vis(emailIn)) continue;
      var bs = m.querySelectorAll("button, a.btn, input[type='button']");
      for (var j = 0; j < bs.length; j++) {
        var t = (bs[j].textContent || bs[j].value || "").trim();
        if (/^(ok|okay|close|done|×|got it)$/i.test(t)) { bs[j].click(); return; }
      }
      if (bs.length) bs[0].click();
    }
  }

  // The site announces AJAX failures via alert() — swallow and flag for retry
  var errFlag = false;
  try {
    var realAlert = window.alert;
    window.alert = function (msg) {
      if (/ajax|error/i.test(String(msg))) { errFlag = true; return; }
      try { realAlert(msg); } catch (e) {}
    };
  } catch (e) {}

  // ── HUD ────────────────────────────────────────────────────────────────────
  var hud = document.createElement("div");
  hud.style.cssText = "position:fixed;left:50%;transform:translateX(-50%);bottom:14px;z-index:2147483647;" +
    "background:rgba(8,10,18,.88);color:#a5f3fc;font:600 12px ui-monospace,Menlo,monospace;" +
    "padding:9px 16px;border-radius:999px;border:1px solid rgba(165,243,252,.35);pointer-events:none;" +
    "max-width:92vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis";
  function setHud(t) {
    if (!hud.parentNode && document.body) document.body.appendChild(hud);
    hud.textContent = t;
  }

  // ── State machine ──────────────────────────────────────────────────────────
  var i = 0, st = "boot", tk = 0;
  var attempts = 0, submitAt = 0, deadline = 0;
  var emailClicked, emailFilled, emailSent, sendAt, doneAt;
  function resetCar() { attempts = 0; emailClicked = emailFilled = emailSent = false; errFlag = false; }
  resetCar();

  function label() { var c = CARS[i]; return c.label || c.plate || ("car " + (i + 1)); }
  function who() { return "car " + (i + 1) + "/" + CARS.length + " · " + label(); }

  function doneCar(msg) {
    results.push(label() + ": " + msg);
    if (i < CARS.length - 1) { st = "another"; tk = 0; }
    else finishAll();
  }
  function failCar(msg) {
    results.push(label() + ": FAIL — " + msg);
    for (var k = i + 1; k < CARS.length; k++) results.push((CARS[k].label || CARS[k].plate) + ": skipped");
    ready("FAIL: " + msg);   // no-op if already ready
    finishAll();
  }
  function finishAll() {
    window.__pf.finished = true;
    var fails = results.filter(function (x) { return /FAIL|skipped/.test(x); }).length;
    setHud(fails ? "done — " + fails + " issue(s), close to see details" : "✓ all " + CARS.length + " registered — you can close this");
    st = "halt";
  }

  var timer = setInterval(function () {
    if (st === "halt") { clearInterval(timer); return; }
    tk++;
    var car = CARS[i];

    if (st === "boot") {
      setHud(who() + " · opening form…");
      if (vis(el("vehicleApt"))) { st = "form"; tk = 0; }
      else if (vis(el("registrationTypeVisitor"))) { click("registrationTypeVisitor"); st = "form"; tk = 0; }
      else if (tk > 37) failCar("registration page did not load");
    }

    else if (st === "form") {
      if (vis(el("vehicleApt"))) {
        fill("vehicleApt",                 D.apt);
        fill("vehicleMake",                car.make);
        fill("vehicleModel",               car.model);
        fill("vehicleLicensePlate",        car.plate);
        fill("vehicleLicensePlateConfirm", car.plate);
        submitAt = Date.now() + (i === 0 ? 4500 : 1800);
        st = "submit"; tk = 0;
        ready("ready");   // first car: signal Scriptable to present the webview
        setHud(who() + " · filled, submitting…");
      } else if (tk > 37) failCar("vehicle form never appeared");
    }

    else if (st === "submit") {
      if (Date.now() >= submitAt) {
        click("vehicleInformation");
        attempts = 1; errFlag = false; deadline = Date.now() + 9000;
        st = "registering"; tk = 0;
        setHud(who() + " · registering…");
      }
    }

    else if (st === "registering") {
      if (vis(el("email-confirmation"))) { st = "email"; tk = 0; }
      else if (errFlag || vis(el("error-modal")) || Date.now() > deadline) {
        if (vis(el("error-modal"))) dismissStrayModals();
        if (attempts < 4) {
          attempts++; errFlag = false; deadline = Date.now() + 9000;
          click("vehicleInformation");
          setHud(who() + " · retry " + attempts + "…");
        } else failCar("submit kept failing");
      }
    }

    else if (st === "email") {
      if (!car.email) { doneCar("registered"); return; }
      if (!emailClicked) {
        emailClicked = true;
        click("email-confirmation");
        setHud(who() + " · sending email…");
        tk = 0;
      } else { st = "emailmodal"; tk = 0; }
    }

    else if (st === "emailmodal") {
      if (!emailFilled && vis(el("emailConfirmationEmailView"))) {
        fill("emailConfirmationEmailView", car.email);
        emailFilled = true; sendAt = Date.now() + 500;
      }
      if (emailFilled && !emailSent && Date.now() >= sendAt) {
        click("email-confirmation-send-view");
        emailSent = true; doneAt = Date.now() + 1000;
      }
      if (emailSent && Date.now() >= doneAt) doneCar("registered + email sent");
      else if (!emailFilled && tk > 30) doneCar("registered (email box never opened)");
    }

    else if (st === "another") {
      setHud("next: " + (CARS[i + 1].label || CARS[i + 1].plate) + "…");
      dismissStrayModals();
      var b = el("register-another-vehicle") || el("registerAnotherVehicle") || el("register-another")
           || btnByText(/(register|add)\\s+another|another\\s+(vehicle|car)/i);
      if (b) {
        b.click();
        i++; resetCar(); st = "boot"; tk = 0;
      } else if (vis(el("registrationTypeVisitor")) || vis(el("vehicleApt"))) {
        i++; resetCar(); st = "boot"; tk = 0;
      } else if (tk > 37) {
        for (var k = i + 1; k < CARS.length; k++)
          results.push((CARS[k].label || CARS[k].plate) + ": skipped — no Register-Another button, run ParkFill again for this car");
        finishAll();
      }
    }
  }, 400);

  // If the very first page never produces anything, fail the whole run
  setTimeout(function () { ready("FAIL: page never showed the form. URL: " + location.href); }, 30000);
})();`;
}

main();
