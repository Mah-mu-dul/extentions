# Vanish — Popup & Element Blocker

Chrome (Manifest V3) extension that hides popups, overlays, banners, or any
element on any site, by class or id — set per site, no coding required.

## Load it (unpacked)

1. Open `chrome://extensions`
2. Turn on **Developer mode** (top right)
3. Click **Load unpacked**
4. Select this folder (`popup-remover-extension`)
5. Pin the "Vanish" icon to your toolbar

## How to use

1. Go to the site with the annoying popup.
2. Right-click the popup → **Inspect** → note its `class` or `id`.
3. Click the Vanish icon.
4. Type the class or id (with or without the leading `.`/`#`) and hit **Add**.
   - `cookie-banner` or `.cookie-banner` → hides anything with that class
   - `#modal-root` → hides the element with that id
   - `modal show active` → hides only elements that have **all three**
     classes at once (i.e. one class attribute containing all those names)
5. It's hidden immediately — no reload required. The **Refresh page**
   button is there if you want to double check on a clean load.
6. Click the **✕** on any rule to remove it, or **Delete all** to wipe every
   rule for that site.

Rules are stored per-hostname (`chrome.storage.local`), so what you hide on
`example.com` won't affect `other-site.com`.

## How it works

- The popup writes your rules to `chrome.storage.local`, keyed by hostname.
- A content script (`content.js`) runs on every page at `document_start`,
  reads the rules for the current hostname, and injects a `<style>` block
  that sets `display: none !important` on anything matching. This means new
  matching elements (added by the page's own JS after load) are hidden
  automatically, since it's a live stylesheet rule, not a one-time scan.
- A lightweight `MutationObserver` also forces `display: none` back onto
  matched elements directly, in case a site keeps resetting inline styles.
- A `chrome.storage.onChanged` listener updates already-open tabs instantly
  when you add/remove a rule, so you don't have to reload just to see it work.

## Files

- `manifest.json` — extension config (MV3)
- `popup.html` / `popup.css` / `popup.js` — the toolbar popup UI
- `content.js` — runs on every page, hides matching elements
- `icons/` — toolbar icons
