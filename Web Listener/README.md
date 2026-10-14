# Web Listener - Dhaka Marathon Alert Extension

A simple, lightweight Chrome Extension to hold your spot for the **Dhaka International Marathon**.

It checks the marathon website every **n** minutes. As long as `<article class="_card_7xci0_108">`'s **2nd child** contains `"coming soon"`, the extension stays **silent**. As soon as that text is no longer present, it **plays a loud siren alert** so you can immediately register!

---

## 🚀 How to Install in Chrome (Takes 10 Seconds)

1. Open Google Chrome.
2. Go to: `chrome://extensions/`
3. Turn on **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** (top-left button).
5. Select this folder:  
   `d:\Projects\Extensions\Web Listener`
6. Pin the extension to your Chrome toolbar.

---

## ⚙️ Default Settings (Already Configured for Dhaka Marathon)

- **Website URL:** `https://www.dhakainternationalmarathon.org`
- **Check Every:** `1` min `30` sec (any `min` : `sec` combination, e.g. `0 min 45 sec`, `2 min 00 sec`)
- **Class Name:** `_card_7xci0_108` (or `article`)
- **N-th Child:** `2` (2nd child element)
- **Text to Seek:** `comming soon` (matches both "coming soon" and "comming soon", case-insensitive)

---

## 🎯 How It Works

- **Text Found ("COMING SOON"):** Everything stays **completely silent**.
- **Text NOT Found (Registration Open):**  
  - 🚨 Plays a **loud, looping emergency siren** (via Web Audio API).
  - 🔔 Fires a persistent Chrome notification.
  - 🌐 Opens the marathon website in a new tab so you don't lose a second.
- **Stop Sound:** Click the red **"STOP LOUD SOUND"** button in the popup to silence the alarm.
- **Test Sound:** Click **"Test Sound"** anytime to check volume.
