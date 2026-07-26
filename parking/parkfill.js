// ParkFill — Parking Registration Auto-Fill  (v19: iframe multi-car)
// ─────────────────────────────────────────────────────────────────────────────
// The site's "Register Another Vehicle" navigates the page, which destroys
// injected scripts — and Scriptable cannot re-inject while the webview is
// presented. So the master script (installed once, pre-present) keeps the
// top page alive and runs EVERY car inside a full-screen same-origin
// iframe, reloading the iframe between cars. Parent timers/HUD survive.

// Timer.schedule works in every Scriptable context, including headless
// Shortcuts automation runs where global setTimeout is not defined.
function sleep(ms) {
  return new Promise((resolve) => {
    if (typeof Timer !== "undefined" && Timer.schedule) Timer.schedule(ms, false, resolve);
    else setTimeout(resolve, ms);
  });
}

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
    r = await wv.evaluateJavaScript(
      masterScript(d.url, String(d.apt || "").trim(), String(d.code || "").trim(), cars), true);
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

function masterScript(url, apt, code, cars) {
  const D = JSON.stringify({ url: url, apt: apt, code: code, cars: cars })
    .replace(/</g, "\\u003C").replace(/>/g, "\\u003E");

  return `(function () {
  var D = ${D};
  var CARS = D.cars;
  var completed = false;
  function ready(msg) { if (completed) return; completed = true; completion(msg); }

  window.__pf = { results: [], finished: false };
  var results = window.__pf.results;

  // ── Full-screen iframe that hosts the registration flow ───────────────────
  var ifr = document.createElement("iframe");
  ifr.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;border:0;z-index:2147483000;background:#fff";
  var loadedAt = 0;
  ifr.addEventListener("load", function () {
    loadedAt = Date.now();
    hookAlert();
  });

  function doc() { try { return ifr.contentDocument; } catch (e) { return null; } }
  function win() { try { return ifr.contentWindow; } catch (e) { return null; } }
  function el(id) { var d2 = doc(); return d2 ? d2.getElementById(id) : null; }
  function vis(e) { return !!(e && e.offsetParent !== null); }

  var errFlag = false;
  function hookAlert() {
    try {
      var W = win();
      if (!W) return;
      var real = W.alert;
      W.alert = function (msg) {
        if (/ajax|error/i.test(String(msg))) { errFlag = true; return; }
        try { real(msg); } catch (e) {}
      };
    } catch (e) {}
  }

  function fill(id, v) {
    var e = el(id), W = win();
    if (!e || !W || v === undefined || v === null || v === "") return false;
    e.value = String(v);
    try {
      e.dispatchEvent(new W.Event("input",  { bubbles: true }));
      e.dispatchEvent(new W.Event("change", { bubbles: true }));
      e.dispatchEvent(new W.Event("blur",   { bubbles: true }));
    } catch (err) {
      e.dispatchEvent(new Event("input",  { bubbles: true }));
      e.dispatchEvent(new Event("change", { bubbles: true }));
    }
    return true;
  }

  function click(id) { var e = el(id); if (!e) return false; e.click(); return true; }

  function dismissErrorModal() {
    var d2 = doc(); if (!d2) return;
    var mods = d2.querySelectorAll('.modal, [role="dialog"], .sweet-alert');
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

  // ── HUD on the parent page (survives iframe reloads) ──────────────────────
  var hud = document.createElement("div");
  hud.style.cssText = "position:fixed;left:50%;transform:translateX(-50%);bottom:14px;z-index:2147483647;" +
    "background:rgba(8,10,18,.9);color:#a5f3fc;font:600 12px ui-monospace,Menlo,monospace;" +
    "padding:9px 16px;border-radius:999px;border:1px solid rgba(165,243,252,.35);pointer-events:none;" +
    "max-width:92vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis";
  function setHud(t) { hud.textContent = t; }

  // Attach only once <body> exists — the page can report loaded before it does
  (function attach(n) {
    if (!document.body) {
      if (n <= 0) { ready("FAIL: page has no body — did the URL load?"); return; }
      setTimeout(function () { attach(n - 1); }, 150);
      return;
    }
    document.body.appendChild(ifr);
    document.body.appendChild(hud);
    ifr.src = D.url;
    startMachine();
  })(100);

  // ── State machine (runs in the parent; acts on the iframe) ────────────────
  var i = 0, st = "ifload", tk = 0;
  var attempts = 0, submitAt = 0, deadline = 0;
  var emailClicked, emailFilled, emailSent, sendAt, doneAt, codeTried;
  function resetCar() { attempts = 0; emailClicked = emailFilled = emailSent = false; errFlag = false; codeTried = false; }
  resetCar();

  function label() { var c = CARS[i]; return c.label || c.plate || ("car " + (i + 1)); }
  function who() { return "car " + (i + 1) + "/" + CARS.length + " · " + label(); }

  function doneCar(msg) {
    results.push(label() + ": " + msg);
    if (i < CARS.length - 1) {
      i++; resetCar();
      setHud("next: " + label() + "…");
      ifr.src = D.url;        // clean page for the next car
      st = "ifload"; tk = 0;
    } else finishAll();
  }
  function failCar(msg) {
    results.push(label() + ": FAIL — " + msg);
    if (i < CARS.length - 1) {
      i++; resetCar();
      ifr.src = D.url;        // still try the remaining cars
      st = "ifload"; tk = 0;
    } else finishAll();
    ready("ready");           // never block presentation on a failure
  }
  function finishAll() {
    window.__pf.finished = true;
    var fails = results.filter(function (x) { return /FAIL|skipped/.test(x); }).length;
    setHud(fails ? "done — " + fails + " issue(s), close this page to see details"
                 : "✓ all " + CARS.length + " registered — you can close this");
    st = "halt";
  }

  var timer = null;
  function startMachine() {
    if (timer) return;
    timer = setInterval(tick, 400);
  }
  function tick() {
    if (st === "halt") { clearInterval(timer); return; }
    tk++;
    var car = CARS[i];

    if (st === "ifload") {
      setHud(who() + " · loading page…");
      if (vis(el("vehicleApt"))) { st = "form"; tk = 0; }
      else if (vis(el("registrationTypeVisitor"))) { click("registrationTypeVisitor"); st = "form"; tk = 0; }
      else if (tk > 50) failCar("registration page did not load in the frame");
    }

    else if (st === "form") {
      if (vis(el("vehicleApt"))) {
        fill("vehicleApt",                 D.apt);
        fill("vehicleMake",                car.make);
        fill("vehicleModel",               car.model);
        fill("vehicleLicensePlate",        car.plate);
        fill("vehicleLicensePlateConfirm", car.plate);
        submitAt = Date.now() + (completed ? 1800 : 4500);
        st = "submit"; tk = 0;
        ready("ready");   // first fill: let Scriptable present the webview
        setHud(who() + " · filled, submitting…");
      } else if (!codeTried && vis(el("accessCode"))) {
        // Property access-code gate before the vehicle form
        if (!D.code) { failCar("this property needs an access code — save the PIN on this base in PARK_OS"); return; }
        fill("accessCode", D.code);
        codeTried = true; tk = 0;
        setHud(who() + " · entering access code…");
        click("propertyPassword");
        ready("ready");   // show the webview while the code step runs
      } else if (codeTried && vis(el("error-modal"))) {
        dismissErrorModal();
        failCar("access code was rejected — double-check the PIN saved on this base");
      } else if (tk > 50) failCar("vehicle form never appeared");
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
        if (vis(el("error-modal"))) dismissErrorModal();
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
  }

  // Watchdog: if nothing ever appears, unblock Scriptable with a failure
  setTimeout(function () { ready("FAIL: page never showed the form. URL: " + location.href); }, 35000);
})();`;
}

main();
