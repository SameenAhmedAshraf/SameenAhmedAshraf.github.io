// ParkFill — Parking Registration Auto-Fill  (v15)
// ──────────────────────────────────────────────────
// register2park.com element IDs:
//   registrationTypeVisitor, vehicleApt, vehicleMake, vehicleModel,
//   vehicleLicensePlate, vehicleLicensePlateConfirm, vehicleInformation,
//   email-confirmation, emailConfirmationEmailView, email-confirmation-send-view

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

  // Trim stray spaces (e.g. "Highlander ") — the server can reject them
  for (const k in d) if (typeof d[k] === "string") d[k] = d[k].trim();

  const wv = new WebView();
  await wv.loadURL(d.url);

  let result = "no result";
  try {
    result = await wv.evaluateJavaScript(autoScript(d), true);
  } catch (e) {
    result = "FAIL: script error: " + e;
  }

  // Anything other than full success: tell the user what happened.
  // The email watcher keeps running inside the page either way.
  if (String(result).indexOf("OK") !== 0) {
    const a = new Alert();
    a.title = "ParkFill";
    a.message = String(result);
    a.addAction("Open page");
    await a.present();
  }

  await wv.present(false);
}

function autoScript(d) {
  const D = JSON.stringify(d).replace(/</g, "\\u003C").replace(/>/g, "\\u003E");

  return `(function () {
  var D = ${D};
  var done = false;

  function finish(msg) {
    if (done) return;
    done = true;
    completion(msg);
  }

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

  // Find a visible error dialog (AJAX error etc.) and return it
  function errorModal() {
    var cands = document.querySelectorAll('.modal, .sweet-alert, [role="dialog"], .alert-danger');
    for (var i = 0; i < cands.length; i++) {
      var m = cands[i];
      if (!vis(m)) continue;
      if (/ajax|error|wrong|failed/i.test(m.textContent || "")) return m;
    }
    return null;
  }

  function dismissModal(m) {
    var btns = m.querySelectorAll('button, a.btn, input[type="button"]');
    for (var i = 0; i < btns.length; i++) {
      var t = (btns[i].textContent || btns[i].value || "").trim();
      if (/^(ok|okay|close|try again|dismiss|confirm|×)$/i.test(t)) { btns[i].click(); return; }
    }
    if (btns.length) btns[0].click();
    try { if (window.jQuery) window.jQuery(m).modal("hide"); } catch (e) {}
  }

  // ── Email watcher ─────────────────────────────────────────────────────────
  // Runs in the page independently for 3 minutes: the moment the blue
  // E-Mail Confirmation button exists it clicks it, fills the email and
  // presses Send — even if Next had to be tapped manually.
  var emailClicked = false, emailSent = false;
  var watcher = null;
  function startEmailWatcher() {
    if (!D.email || watcher) return;
    var ticks = 0;
    watcher = setInterval(function () {
      if (++ticks > 360) { clearInterval(watcher); return; }
      if (emailSent) { clearInterval(watcher); return; }
      if (!emailClicked && vis(el("email-confirmation"))) {
        emailClicked = true;
        click("email-confirmation");
        return;
      }
      if (emailClicked && vis(el("emailConfirmationEmailView"))) {
        fill("emailConfirmationEmailView", D.email);
        setTimeout(function () {
          if (!emailSent) { emailSent = true; click("email-confirmation-send-view"); }
        }, 400);
      }
    }, 500);
  }

  // ── Step 1: Visitor Parking ───────────────────────────────────────────────
  waitFor("registrationTypeVisitor", 25, 400, function () {
    click("registrationTypeVisitor");
    stepForm();
  }, function () {
    if (el("vehicleApt")) stepForm();
    else finish("FAIL: Visitor Parking button not found. Check the complex URL. URL: " + location.href);
  });

  // ── Step 2: fill form, submit with retry on AJAX error ───────────────────
  function stepForm() {
    waitFor("vehicleApt", 25, 400, function () {
      fill("vehicleApt",                 D.apt);
      fill("vehicleMake",                D.make);
      fill("vehicleModel",               D.model);
      fill("vehicleLicensePlate",        D.plate);
      fill("vehicleLicensePlateConfirm", D.plate);
      startEmailWatcher();
      // Give the site's own validation/JS a moment before submitting
      setTimeout(function () { submitNext(3); }, 1200);
    }, function () {
      finish("FAIL: vehicle form did not appear after clicking Visitor Parking.");
    });
  }

  function submitNext(retries) {
    click("vehicleInformation");   // the red Next button
    watchOutcome(retries, 24);     // 24 × 500ms = 12s per attempt
  }

  function watchOutcome(retries, ticksLeft) {
    if (emailSent || vis(el("email-confirmation"))) { stepEmailFinish(); return; }
    var m = errorModal();
    if (m) {
      if (retries > 0) {
        dismissModal(m);
        setTimeout(function () { submitNext(retries - 1); }, 2000);
      } else {
        finish("NOTE: the site kept returning an error on submit. The form is filled — tap Next yourself; the email will still send automatically.");
      }
      return;
    }
    if (ticksLeft <= 0) {
      finish("NOTE: submitted but no confirmation appeared yet. Page is open — check it; the email will still send automatically if it goes through.");
      return;
    }
    setTimeout(function () { watchOutcome(retries, ticksLeft - 1); }, 500);
  }

  // ── Step 3: wait for the watcher to send the email ────────────────────────
  function stepEmailFinish() {
    if (!D.email) { finish("OK: registered (no email saved for this car)"); return; }
    var waited = 0;
    (function chk() {
      if (emailSent) { setTimeout(function () { finish("OK: registered and confirmation email sent"); }, 800); return; }
      if ((waited += 500) > 20000) { finish("OK: registered — email box didn't finish, check the page."); return; }
      setTimeout(chk, 500);
    })();
  }

  // Watchdog: never hang forever
  setTimeout(function () { finish("NOTE: timed out — page is open, please check it."); }, 90000);
})();`;
}

main();
