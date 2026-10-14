// Background Service Worker

const ALARM_NAME = 'web_listener_alarm';

const DEFAULTS = {
  url: 'https://www.dhakainternationalmarathon.org',
  intervalMin: 1,
  intervalSec: 30,
  className: '_card_7xci0_108',
  nthChild: 2,
  seekText: 'comming soon',
  enabled: true,
  isAlarming: false,
  lastCheckTime: null,
  nextCheckTime: null,
  lastCheckResult: 'Waiting for first check'
};

// Helper: Ensure offscreen document exists
async function ensureOffscreen() {
  if (chrome.offscreen && 'hasDocument' in chrome.offscreen) {
    if (await chrome.offscreen.hasDocument()) return;
  }
  try {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['AUDIO_PLAYBACK', 'DOM_PARSER'],
      justification: 'Play alarm sound and inspect webpage DOM'
    });
  } catch (e) {
    console.warn('Offscreen doc creation warning:', e);
  }
}

// Get saved settings
async function getSettings() {
  const data = await chrome.storage.local.get(null);
  return { ...DEFAULTS, ...data };
}

// Set up periodic alarm with min and sec
async function setupAlarm(intervalMin, intervalSec, enabled) {
  await chrome.alarms.clear(ALARM_NAME);
  if (!enabled) {
    chrome.action.setBadgeText({ text: 'OFF' });
    chrome.action.setBadgeBackgroundColor({ color: '#6B7280' });
    await chrome.storage.local.set({ nextCheckTime: null });
    return;
  }

  const mins = parseInt(intervalMin, 10) || 0;
  const secs = parseInt(intervalSec, 10) || 0;
  const totalSecs = Math.max(5, (mins * 60) + secs);
  const periodInMinutes = totalSecs / 60;

  chrome.alarms.create(ALARM_NAME, {
    delayInMinutes: periodInMinutes,
    periodInMinutes: periodInMinutes
  });

  const nextCheck = Date.now() + totalSecs * 1000;
  await chrome.storage.local.set({ nextCheckTime: nextCheck });

  let badgeText = '';
  if (mins > 0 && secs > 0) {
    badgeText = `${mins}m${secs}s`;
  } else if (mins > 0) {
    badgeText = `${mins}m`;
  } else {
    badgeText = `${secs}s`;
  }
  chrome.action.setBadgeText({ text: badgeText });
  chrome.action.setBadgeBackgroundColor({ color: '#0F766E' });
}

// Execute check
async function executeCheck() {
  const settings = await getSettings();
  if (!settings.enabled) return;

  try {
    const urlObj = new URL(settings.url);
    urlObj.searchParams.set('_t', Date.now().toString());

    const res = await fetch(urlObj.toString(), {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' }
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    await ensureOffscreen();

    // Check with offscreen DOMParser
    chrome.runtime.sendMessage({
      type: 'CHECK_HTML',
      html,
      className: settings.className,
      nthChild: settings.nthChild,
      seekText: settings.seekText
    }, async response => {
      const now = Date.now();

      if (!response) {
        await chrome.storage.local.set({
          lastCheckTime: now,
          lastCheckResult: 'Error parsing response'
        });
        return;
      }

      if (response.textPresent) {
        // TEXT IS PRESENT -> BE SILENT!
        console.log(`[Web Listener] Text "${settings.seekText}" is present. Stays silent.`);
        const totalSecs = Math.max(5, (parseInt(settings.intervalMin || 0, 10) * 60) + parseInt(settings.intervalSec || 0, 10));
        await chrome.storage.local.set({
          isAlarming: false,
          lastCheckTime: now,
          nextCheckTime: now + totalSecs * 1000,
          lastCheckResult: `Silent: "${response.childText}" matches "${settings.seekText}"`
        });
        chrome.action.setBadgeText({ text: getBadgeText(settings) });
        chrome.action.setBadgeBackgroundColor({ color: '#0F766E' });
      } else {
        // TEXT IS NOT PRESENT -> PLAY LOUD ALARM!
        console.log(`[Web Listener] 🚨 Text "${settings.seekText}" is NOT present! PLAYING LOUD ALARM!`);
        await chrome.storage.local.set({
          isAlarming: true,
          lastCheckTime: now,
          lastCheckResult: `🚨 ALERT: "${settings.seekText}" is MISSING! (Found: "${response.childText || 'None'}")`
        });

        // Set badge
        chrome.action.setBadgeText({ text: 'ALERT' });
        chrome.action.setBadgeBackgroundColor({ color: '#DC2626' });

        // Play sound via offscreen
        chrome.runtime.sendMessage({ type: 'START_ALARM' });

        // Desktop notification
        chrome.notifications.create('marathon_alert', {
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: '🚨 MARATHON REGISTRATION IS OPEN!',
          message: `The text "${settings.seekText}" is no longer present! Grab your slot now!`,
          priority: 2,
          requireInteraction: true
        });

        // Auto open registration tab
        try {
          chrome.tabs.create({ url: settings.url, active: true });
        } catch (_) {}
      }
    });

  } catch (err) {
    console.error('Check failed:', err);
    await chrome.storage.local.set({
      lastCheckTime: Date.now(),
      lastCheckResult: `Network Error: ${err.message}`
    });
  }
}

function getBadgeText(settings) {
  const m = parseInt(settings.intervalMin, 10) || 0;
  const s = parseInt(settings.intervalSec, 10) || 0;
  if (m > 0 && s > 0) return `${m}m${s}s`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

// Stop alarm sound
async function stopAlarm() {
  await ensureOffscreen();
  chrome.runtime.sendMessage({ type: 'STOP_ALARM' });
  await chrome.storage.local.set({ isAlarming: false });
  const settings = await getSettings();
  chrome.action.setBadgeText({ text: getBadgeText(settings) });
  chrome.action.setBadgeBackgroundColor({ color: '#0F766E' });
}

// Notification click opens URL
chrome.notifications.onClicked.addListener(async () => {
  const settings = await getSettings();
  chrome.tabs.create({ url: settings.url, active: true });
});

// Periodic alarm handler
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === ALARM_NAME) {
    executeCheck();
  }
});

// Install & startup setup
chrome.runtime.onInstalled.addListener(async () => {
  const settings = await getSettings();
  await setupAlarm(settings.intervalMin, settings.intervalSec, settings.enabled);
  executeCheck();
});

chrome.runtime.onStartup.addListener(async () => {
  const settings = await getSettings();
  await setupAlarm(settings.intervalMin, settings.intervalSec, settings.enabled);
});

// Messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SAVE_SETTINGS') {
    (async () => {
      await chrome.storage.local.set(message.settings);
      await setupAlarm(message.settings.intervalMin, message.settings.intervalSec, message.settings.enabled);
      sendResponse({ success: true });
    })();
    return true;
  }

  if (message.type === 'RUN_CHECK') {
    (async () => {
      await executeCheck();
      sendResponse({ success: true });
    })();
    return true;
  }

  if (message.type === 'STOP_ALARM') {
    (async () => {
      await stopAlarm();
      sendResponse({ success: true });
    })();
    return true;
  }

  if (message.type === 'TEST_SOUND') {
    (async () => {
      await ensureOffscreen();
      chrome.runtime.sendMessage({ type: 'TEST_SOUND', duration: 3000 });
      sendResponse({ success: true });
    })();
    return true;
  }
});
