// ParkFill — Parking Registration Auto-Fill  (v14)
// ──────────────────────────────────────────────────
// Uses register2park.com's exact element IDs:
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

  const wv = new WebView();
  await wv.loadURL(d.url);

  // Single injection; the page script walks through every step and calls
  // completion() when finished. The WebView is presented after, showing
  // the final confirmation page.
  let result = "no result";
  try {
    result = await wv.evaluateJavaScript(autoScript(d), true);
  } catch (e) {
    result = "Script error: " + e;
  }

  if (String(result).indexOf("FAIL") === 0 || String(result).indexOf("Script error") === 0) {
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

  function fill(id, v) {
    var e = el(id);
    if (!e || v === undefined || v === null || v === "") return false;
    e.value = String(v);
    e.dispatchEvent(new Event("input",  { bubbles: true }));
    e.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  function click(id) {
    var e = el(id);
    if (!e) return false;
    e.click();
    return true;
  }

  // Poll until element with id exists and is visible, then cb(); else fail()
  function waitFor(id, tries, ms, cb, fail) {
    (function poll(n) {
      var e = el(id);
      if (e && e.offsetParent !== null) return cb();
      if (n <= 0) return fail();
      setTimeout(function () { poll(n - 1); }, ms);
    })(tries);
  }

  // Step 1 — click "Visitor Parking"
  waitFor("registrationTypeVisitor", 25, 400, function () {
    click("registrationTypeVisitor");
    stepForm();
  }, function () {
    // Button not there — maybe the form is already showing
    if (el("vehicleApt")) stepForm();
    else finish("FAIL: Visitor Parking button not found. Check the complex URL points to your property page. URL: " + location.href);
  });

  // Step 2 — fill the vehicle form and press Next
  function stepForm() {
    waitFor("vehicleApt", 25, 400, function () {
      fill("vehicleApt",                 D.apt);
      fill("vehicleMake",                D.make);
      fill("vehicleModel",               D.model);
      fill("vehicleLicensePlate",        D.plate);
      fill("vehicleLicensePlateConfirm", D.plate);
      setTimeout(function () {
        click("vehicleInformation");   // the red Next button
        stepEmail();
      }, 600);
    }, function () {
      finish("FAIL: vehicle form did not appear after clicking Visitor Parking.");
    });
  }

  // Step 3 — E-Mail Confirmation → fill email → Send
  function stepEmail() {
    if (!D.email) { finish("OK: registered (no email saved for this car)"); return; }
    // Registration takes a moment to process; wait up to ~20s for the button
    waitFor("email-confirmation", 40, 500, function () {
      click("email-confirmation");
      waitFor("emailConfirmationEmailView", 20, 400, function () {
        fill("emailConfirmationEmailView", D.email);
        setTimeout(function () {
          click("email-confirmation-send-view");   // the green Send button
          setTimeout(function () { finish("OK: registered and confirmation email sent"); }, 900);
        }, 400);
      }, function () {
        finish("OK: registered, but the email box did not open — tap E-Mail Confirmation manually.");
      });
    }, function () {
      finish("OK: submitted, but the E-Mail Confirmation button never appeared — check the page.");
    });
  }

  // Watchdog so the script can never hang forever
  setTimeout(function () { finish("FAIL: timed out after 60s. URL: " + location.href); }, 60000);
})();`;
}

main();
