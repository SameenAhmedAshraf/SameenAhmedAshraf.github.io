// ParkAuto — daily automatic parking registration (headless ParkFill)
// ────────────────────────────────────────────────────────────────────
// Runs WITHOUT opening a page on screen, so it can be triggered by a
// Shortcuts time-of-day automation every morning. Sends an iOS
// notification with the result.
//
// Setup (one time):
//   1. Scriptable → + → rename exactly: ParkAuto → paste this file → Done
//   2. Edit CONFIG below with your complex + car(s)
//   3. Run it once by hand to grant notification permission and verify
//   4. Shortcuts app → Automation → + → Time of Day → e.g. 9:00 AM, Daily
//      → Run Immediately (turn OFF "Ask Before Running")
//      → Add action: "Run Script" (Scriptable) → ParkAuto
//      → turn OFF "Run In App" and "Show When Run"
// To stop: Shortcuts → Automation → toggle it off (or delete it).

const CONFIG = {
  url: "https://www.register2park.com/register?key=aav4mvkvs92",
  apt: "728",
  cars: [
    {
      label: "Sam",
      make:  "Toyota",
      model: "Highlander",
      plate: "XLZ3992",
      email: "sameen.ahmed.ashraf98@gmail.com",
    },
    // Add more cars here to register several every day:
    // { label: "Mom", make: "Honda", model: "Civic", plate: "ABC1234", email: "mom@example.com" },
  ],
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function notify(title, body) {
  try {
    const n = new Notification();
    n.title = title;
    n.body = body;
    await n.schedule();
  } catch (e) {}
}

async function main() {
  const cars = CONFIG.cars.map(c => {
    const o = {};
    for (const k in c) o[k] = typeof c[k] === "string" ? c[k].trim() : c[k];
    return o;
  });

  const wv = new WebView();
  try {
    await wv.loadURL(CONFIG.url);
  } catch (e) {
    await notify("ParkAuto ✗", "Could not load register2park: " + e);
    Script.complete();
    return;
  }

  let result;
  try {
    result = await Promise.race([
      wv.evaluateJavaScript(masterScript(CONFIG.url, String(CONFIG.apt).trim(), cars), true),
      sleep(115000).then(() => null),
    ]);
  } catch (e) {
    result = "FAIL: " + e;
  }

  let lines;
  if (result === null) lines = ["timed out — run ParkFill manually today"];
  else if (typeof result === "string") lines = [result];
  else lines = result;

  const ok = lines.every(l => /registered/.test(l)) && lines.length === cars.length;
  await notify(ok ? "ParkAuto ✓ registered" : "ParkAuto ⚠ check needed", lines.join("\n"));

  // When run by hand inside the Scriptable app, show the final page too
  if (config.runsInApp) await wv.present(false);
  Script.complete();
}

function masterScript(url, apt, cars) {
  const D = JSON.stringify({ url: url, apt: apt, cars: cars })
    .replace(/</g, "\\u003C").replace(/>/g, "\\u003E");

  return `(function () {
  var D = ${D};
  var CARS = D.cars;
  var completed = false;
  function finishScript(res) { if (completed) return; completed = true; completion(res); }

  var results = [];

  var ifr = document.createElement("iframe");
  ifr.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;border:0;z-index:2147483000;background:#fff";
  ifr.addEventListener("load", function () { hookAlert(); });

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

  (function attach(n) {
    if (!document.body) {
      if (n <= 0) { finishScript("FAIL: page has no body"); return; }
      setTimeout(function () { attach(n - 1); }, 150);
      return;
    }
    document.body.appendChild(ifr);
    ifr.src = D.url;
    startMachine();
  })(100);

  var i = 0, st = "ifload", tk = 0;
  var attempts = 0, submitAt = 0, deadline = 0;
  var emailClicked, emailFilled, emailSent, sendAt, doneAt;
  function resetCar() { attempts = 0; emailClicked = emailFilled = emailSent = false; errFlag = false; }
  resetCar();

  function label() { var c = CARS[i]; return c.label || c.plate || ("car " + (i + 1)); }

  function doneCar(msg) {
    results.push(label() + ": " + msg);
    if (i < CARS.length - 1) {
      i++; resetCar();
      ifr.src = D.url;
      st = "ifload"; tk = 0;
    } else finishAll();
  }
  function failCar(msg) {
    results.push(label() + ": FAIL — " + msg);
    if (i < CARS.length - 1) {
      i++; resetCar();
      ifr.src = D.url;
      st = "ifload"; tk = 0;
    } else finishAll();
  }
  function finishAll() {
    st = "halt";
    finishScript(results);
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
      if (vis(el("vehicleApt"))) { st = "form"; tk = 0; }
      else if (vis(el("registrationTypeVisitor"))) { click("registrationTypeVisitor"); st = "form"; tk = 0; }
      else if (tk > 50) failCar("registration page did not load");
    }

    else if (st === "form") {
      if (vis(el("vehicleApt"))) {
        fill("vehicleApt",                 D.apt);
        fill("vehicleMake",                car.make);
        fill("vehicleModel",               car.model);
        fill("vehicleLicensePlate",        car.plate);
        fill("vehicleLicensePlateConfirm", car.plate);
        // Generous first delay: give the site's scripts (recaptcha etc.)
        // time to finish setting up before the headless submit.
        submitAt = Date.now() + (i === 0 ? 8000 : 3000);
        st = "submit"; tk = 0;
      } else if (tk > 37) failCar("vehicle form never appeared");
    }

    else if (st === "submit") {
      if (Date.now() >= submitAt) {
        click("vehicleInformation");
        attempts = 1; errFlag = false; deadline = Date.now() + 9000;
        st = "registering"; tk = 0;
      }
    }

    else if (st === "registering") {
      if (vis(el("email-confirmation"))) { st = "email"; tk = 0; }
      else if (errFlag || vis(el("error-modal")) || Date.now() > deadline) {
        if (vis(el("error-modal"))) dismissErrorModal();
        if (attempts < 4) {
          attempts++; errFlag = false; deadline = Date.now() + 9000;
          click("vehicleInformation");
        } else failCar("submit kept failing");
      }
    }

    else if (st === "email") {
      if (!car.email) { doneCar("registered"); return; }
      if (!emailClicked) {
        emailClicked = true;
        click("email-confirmation");
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

  setTimeout(function () { finishScript(results.length ? results : "FAIL: nothing happened in 100s"); }, 100000);
})();`;
}

main();
