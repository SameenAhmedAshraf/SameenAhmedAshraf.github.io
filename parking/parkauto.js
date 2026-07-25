// ParkAuto — daily automatic parking registration (headless ParkFill)
// ────────────────────────────────────────────────────────────────────
// Registers a SAVED job (complex + selected cars) every time it runs.
// Each car's confirmation email goes to that car's saved driver email.
//
// Choosing WHO gets registered daily:
//   1. In the PARK_OS app: pick the complex, tap the cars you want,
//      tap RUN PARKFILL (this copies the job to the clipboard)
//   2. Open Scriptable → run ParkAuto by hand
//   3. It offers: "Save as daily job" — tap it. Done.
//   Repeat the same steps any time to change the selection.
//
// One-time automation setup:
//   Shortcuts app → Automation → + → Time of Day (e.g. 9:00 AM, Daily)
//   → Run Immediately (turn OFF "Ask Before Running")
//   → action: "Run Script" (Scriptable) → ParkAuto
//   → turn OFF "Run In App" and "Show When Run"
// To stop: toggle that automation off (or delete it).

const JOB_FILE = "parkauto-job.json";

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function fm() {
  try { const f = FileManager.iCloud(); f.documentsDirectory(); return f; }
  catch (e) { return FileManager.local(); }
}

async function loadJob() {
  try {
    const f = fm();
    const p = f.joinPath(f.documentsDirectory(), JOB_FILE);
    if (!f.fileExists(p)) return null;
    try { await f.downloadFileFromiCloud(p); } catch (e) {}
    return JSON.parse(f.readString(p));
  } catch (e) { return null; }
}

function saveJob(job) {
  const f = fm();
  const p = f.joinPath(f.documentsDirectory(), JOB_FILE);
  f.writeString(p, JSON.stringify(job));
}

function deleteJob() {
  try {
    const f = fm();
    const p = f.joinPath(f.documentsDirectory(), JOB_FILE);
    if (f.fileExists(p)) f.remove(p);
  } catch (e) {}
}

function parseClipboard() {
  try {
    const d = JSON.parse(Pasteboard.paste());
    if (!d.url || !Array.isArray(d.cars) || !d.cars.length) return null;
    d.cars = d.cars.map(c => {
      const o = {};
      for (const k in c) o[k] = typeof c[k] === "string" ? c[k].trim() : c[k];
      return o;
    });
    d.apt = String(d.apt || "").trim();
    return { url: d.url, apt: d.apt, code: String(d.code || "").trim(),
             cars: d.cars, days: Number(d.days) || 0 };
  } catch (e) { return null; }
}

// Local calendar date as "YYYY-MM-DD" (no UTC shift surprises)
function isoDay(date) {
  const y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate();
  return y + "-" + String(m).padStart(2, "0") + "-" + String(d).padStart(2, "0");
}
function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d; }

// endDate = last day the job runs (inclusive); null = run until stopped
function endDateFor(days) { return days > 0 ? isoDay(addDays(new Date(), days - 1)) : null; }
function daysLeft(job) {
  if (!job.endDate) return null;
  const end = new Date(job.endDate + "T23:59:59");
  return Math.max(0, Math.floor((end - new Date()) / 86400000) + 1);
}
function durationLine(job) {
  if (!job.endDate) return "Runs daily until you stop it.";
  const left = daysLeft(job);
  if (left === 0) return "Run window ended " + job.endDate + ".";
  if (left === 1) return "Last day today (ends " + job.endDate + ").";
  return "Runs daily through " + job.endDate + " (" + left + " days left).";
}

function jobSummary(job) {
  return job.cars.map(c =>
    "• " + (c.label || c.plate) + (c.email ? " → " + c.email : " (no email)")
  ).join("\n");
}

async function notify(title, body) {
  try {
    const n = new Notification();
    n.title = title;
    n.body = body;
    await n.schedule();
  } catch (e) {}
}

async function main() {
  let job = await loadJob();

  // Manual run inside the app: manage the saved job
  if (config.runsInApp) {
    const clip = parseClipboard();
    if (clip && clip.days === -1) {
      // Marked "off — just today" in PARK_OS: one-time run, never saved
      const a = new Alert();
      a.title = "ParkAuto — one-time run";
      a.message = "Apt " + clip.apt + "\n" + jobSummary(clip) +
        "\n\nThis selection is set to 'off — just today', so it won't be saved as a daily job." +
        (job ? "\nYour existing daily job stays unchanged." : "");
      a.addAction("Run once now");
      a.addCancelAction("Cancel");
      if (await a.present() === -1) return;
      job = clip;
    } else if (clip) {
      clip.endDate = endDateFor(clip.days);
      const a = new Alert();
      a.title = "ParkAuto — new selection on clipboard";
      a.message = "Apt " + clip.apt + "\n" + jobSummary(clip) +
        "\n\n" + durationLine(clip) + "\n\nSave this as the daily job?";
      a.addAction("Save as daily job & run now");
      a.addAction("Run once (don't save)");
      a.addCancelAction("Cancel");
      const c = await a.present();
      if (c === -1) return;
      if (c === 0) { saveJob(clip); job = clip; }
      else job = clip;
    } else if (job) {
      const a = new Alert();
      a.title = "ParkAuto — current daily job";
      a.message = "Apt " + job.apt + "\n" + jobSummary(job) +
        "\n\n" + durationLine(job) +
        "\n\nTo change people or length: select in PARK_OS, tap RUN PARKFILL, then run ParkAuto again.";
      a.addAction("Run now");
      a.addAction("Delete daily job");
      a.addCancelAction("Close");
      const c = await a.present();
      if (c === -1) return;
      if (c === 1) {
        deleteJob();
        const d = new Alert();
        d.title = "ParkAuto";
        d.message = "Daily job deleted. Remember to toggle off the Shortcuts automation too.";
        d.addAction("OK");
        await d.present();
        return;
      }
    } else {
      const a = new Alert();
      a.title = "ParkAuto — no daily job yet";
      a.message = "In PARK_OS: pick your complex, tap the cars to register daily, tap RUN PARKFILL — then run ParkAuto again to save it.";
      a.addAction("OK");
      await a.present();
      return;
    }
  }

  // Background (automation) run: need a saved job
  if (!job) {
    await notify("ParkAuto ⚠ no daily job", "Open PARK_OS, select cars, RUN PARKFILL, then run ParkAuto once to save the job.");
    Script.complete();
    return;
  }

  // Run window over? Stop by itself (one final notification, then silence).
  if (job.endDate && isoDay(new Date()) > job.endDate) {
    if (!job.doneNotified) {
      job.doneNotified = true;
      saveJob(job);
      await notify("ParkAuto ✅ finished",
        "The run window ended " + job.endDate + " — nothing was registered today. " +
        "Toggle off the Shortcuts automation, or save a new job from PARK_OS.");
    }
    Script.complete();
    return;
  }

  const wv = new WebView();
  try {
    await wv.loadURL(job.url);
  } catch (e) {
    await notify("ParkAuto ✗", "Could not load register2park: " + e);
    Script.complete();
    return;
  }

  let result;
  try {
    result = await Promise.race([
      wv.evaluateJavaScript(masterScript(job.url, job.apt, String(job.code || ""), job.cars), true),
      sleep(115000).then(() => null),
    ]);
  } catch (e) {
    result = "FAIL: " + e;
  }

  let lines;
  if (result === null) lines = ["timed out — run ParkFill manually today"];
  else if (typeof result === "string") lines = [result];
  else lines = result;

  const ok = lines.every(l => /registered/.test(l)) && lines.length === job.cars.length;
  const tail = job.endDate ? "\n" + durationLine(job) : "";
  await notify(ok ? "ParkAuto ✓ registered" : "ParkAuto ⚠ check needed", lines.join("\n") + tail);

  if (config.runsInApp) await wv.present(false);
  Script.complete();
}

function masterScript(url, apt, code, cars) {
  const D = JSON.stringify({ url: url, apt: apt, code: code, cars: cars })
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
  var emailClicked, emailFilled, emailSent, sendAt, doneAt, codeTried;
  function resetCar() { attempts = 0; emailClicked = emailFilled = emailSent = false; errFlag = false; codeTried = false; }
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
        submitAt = Date.now() + (i === 0 ? 8000 : 3000);
        st = "submit"; tk = 0;
      } else if (!codeTried && vis(el("accessCode"))) {
        if (!D.code) { failCar("property needs an access code — save the PIN on this base in PARK_OS, then re-save the daily job"); return; }
        fill("accessCode", D.code);
        codeTried = true; tk = 0;
        click("propertyPassword");
      } else if (codeTried && vis(el("error-modal"))) {
        dismissErrorModal();
        failCar("access code was rejected — check the PIN saved on this base");
      } else if (tk > 50) failCar("vehicle form never appeared");
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

// Surface any unexpected error with full detail instead of a generic banner
main().catch(async (e) => {
  const msg = String(e && e.message ? e.message : e) +
    (e && e.lineNumber ? "  (line " + e.lineNumber + ")" : "");
  if (config.runsInApp) {
    const a = new Alert();
    a.title = "ParkAuto — error";
    a.message = msg + "\n\nScreenshot this and send it to get it fixed.";
    a.addAction("OK");
    await a.present();
  } else {
    await notify("ParkAuto ✗ error", msg);
  }
  Script.complete();
});
