// ==UserScript==
// @name         ParkFill — Register2Park Auto-Fill
// @namespace    https://sameenahmedashraf.github.io/parking/
// @version      1.0
// @description  Auto-fills register2park.com when opened from Park Register app
// @author       Park Register
// @match        https://www.register2park.com/*
// @match        https://register2park.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // Data is passed via ?pf= query param (base64 JSON) from the Park Register app
  const pf = new URLSearchParams(window.location.search).get('pf');
  if (!pf) return;

  let data;
  try { data = JSON.parse(atob(pf)); }
  catch (e) { return; }

  // Clean the URL so the param doesn't confuse the site
  const clean = new URL(window.location.href);
  clean.searchParams.delete('pf');
  history.replaceState(null, '', clean.toString());

  // ── Fill helpers ───────────────────────────────────────────────────────────
  function fill(el, val) {
    if (!el || !val) return false;
    try {
      const d = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')
             || Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
      if (d && d.set) d.set.call(el, val);
    } catch (_) {}
    el.value = val;
    ['input', 'change', 'blur'].forEach(t =>
      el.dispatchEvent(new Event(t, { bubbles: true }))
    );
    return true;
  }

  function fillSelect(el, val) {
    if (!el || !val) return false;
    const opt = Array.from(el.options).find(o =>
      o.value.toLowerCase() === val.toLowerCase() ||
      o.text.toLowerCase()  === val.toLowerCase() ||
      o.text.toLowerCase().startsWith(val.toLowerCase())
    );
    if (opt) el.value = opt.value;
    ['change', 'blur'].forEach(t =>
      el.dispatchEvent(new Event(t, { bubbles: true }))
    );
    return !!opt;
  }

  function q(sels, val, sel = false) {
    for (const s of sels) {
      const el = document.querySelector(s);
      if (el) return sel ? fillSelect(el, val) : fill(el, val);
    }
    return false;
  }

  function fillAll() {
    let hits = 0;

    // Apartment / Unit
    hits += q([
      'input[name="unit"]', 'input[name="unit_number"]',
      'input[name="apartment"]', 'input[name="apt"]',
      'input[id*="unit" i]', 'input[placeholder*="unit" i]',
      'input[placeholder*="apt" i]', 'input[placeholder*="apartment" i]',
    ], data.apt) ? 1 : 0;

    // Vehicle
    hits += q(['input[name="make"]',  'input[id*="make" i]',  'input[placeholder*="make" i]'],  data.make)  ? 1 : 0;
    hits += q(['input[name="model"]', 'input[id*="model" i]', 'input[placeholder*="model" i]'], data.model) ? 1 : 0;
    hits += q(['input[name="year"]',  'input[id*="year" i]',  'input[placeholder*="year" i]'],  data.year)  ? 1 : 0;
    hits += q(['input[name="color"]', 'input[id*="color" i]', 'input[placeholder*="color" i]'], data.color) ? 1 : 0;

    // Plate
    hits += q([
      'input[name="plate"]', 'input[name="license_plate"]', 'input[name="license"]',
      'input[id*="plate" i]', 'input[placeholder*="plate" i]', 'input[placeholder*="license" i]',
    ], data.plate) ? 1 : 0;

    // State
    q(['select[name*="state" i]', 'select[id*="state" i]'], data.state, true);
    q(['input[name*="state" i]',  'input[id*="state" i]'],  data.state);

    // Property code
    if (data.code) q([
      'input[name*="property_code" i]', 'input[name*="code" i]', 'input[id*="code" i]',
    ], data.code);

    // Label-based fallback for unusual markup
    document.querySelectorAll('label').forEach(lbl => {
      const t  = lbl.textContent.toLowerCase().trim();
      const el = lbl.control || document.getElementById(lbl.htmlFor) || lbl.nextElementSibling;
      if (!el) return;
      const tag = el.tagName;
      if (!['INPUT','SELECT','TEXTAREA'].includes(tag)) return;

      if      (/unit|apt|apartment/.test(t))        fill(el, data.apt),   hits++;
      else if (/\bmake\b/.test(t))                  fill(el, data.make),  hits++;
      else if (/\bmodel\b/.test(t))                 fill(el, data.model), hits++;
      else if (/\byear\b/.test(t))                  fill(el, data.year),  hits++;
      else if (/color/.test(t))                     fill(el, data.color), hits++;
      else if (/plate|license/.test(t))             fill(el, data.plate), hits++;
      else if (/state/.test(t) && tag === 'SELECT') fillSelect(el, data.state);
    });

    return hits;
  }

  // ── Poll until the form renders (handles React / SPA pages) ───────────────
  let attempts = 0;
  const poll = setInterval(() => {
    const inputs = document.querySelectorAll(
      'input[type="text"], input:not([type]), input[type="number"], input[type="tel"]'
    );
    if (inputs.length >= 2) {
      clearInterval(poll);
      fillAll();
    } else if (++attempts > 24) {   // give up after ~12 seconds
      clearInterval(poll);
    }
  }, 500);
})();
