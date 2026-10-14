// Offscreen audio player and DOM inspector

let audioCtx = null;
let sirenInterval = null;
let activeOscillators = [];
const audioEl = document.getElementById('alarm-audio');

function getAudioContext() {
  if (!audioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioCtx();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function stopAlarm() {
  if (sirenInterval) {
    clearInterval(sirenInterval);
    sirenInterval = null;
  }
  activeOscillators.forEach(osc => {
    try {
      osc.stop();
      osc.disconnect();
    } catch (_) {}
  });
  activeOscillators = [];

  if (audioEl) {
    audioEl.pause();
    audioEl.currentTime = 0;
  }
}

function playLoudSiren() {
  stopAlarm();

  // 1. Play synthesized emergency siren (failsafe, works offline, very loud)
  const ctx = getAudioContext();
  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(1.0, ctx.currentTime);
  gainNode.connect(ctx.destination);

  let high = false;

  function tone(freq) {
    const o1 = ctx.createOscillator();
    o1.type = 'sawtooth';
    o1.frequency.setValueAtTime(freq, ctx.currentTime);

    const o2 = ctx.createOscillator();
    o2.type = 'square';
    o2.frequency.setValueAtTime(freq * 1.5, ctx.currentTime);

    o1.connect(gainNode);
    o2.connect(gainNode);

    o1.start();
    o2.start();

    return [o1, o2];
  }

  activeOscillators = tone(880);

  sirenInterval = setInterval(() => {
    high = !high;
    const freq = high ? 1300 : 880;

    activeOscillators.forEach(osc => {
      try {
        osc.stop();
        osc.disconnect();
      } catch (_) {}
    });

    activeOscillators = tone(freq);
  }, 260);

  // 2. Also play audio element fallback
  try {
    audioEl.src = chrome.runtime.getURL('audio/alarm.wav');
    audioEl.volume = 1.0;
    audioEl.play().catch(() => {});
  } catch (_) {}
}

// Inspect DOM
function checkHtmlContent({ html, className, nthChild, seekText }) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Build selector
    let selector = className ? className.trim() : 'article';
    if (!selector.startsWith('.') && !selector.startsWith('#') && !selector.includes(' ')) {
      // If user typed class name without dot (e.g. "_card_7xci0_108")
      // Check if tag exists, otherwise treat as class
      if (!['article', 'div', 'section', 'li', 'p', 'span'].includes(selector.toLowerCase())) {
        selector = '.' + selector;
      }
    }

    const elements = doc.querySelectorAll(selector);
    if (!elements || elements.length === 0) {
      return {
        foundClass: false,
        textPresent: false,
        childText: '',
        message: `Class/tag "${selector}" not found on page`
      };
    }

    // Check all matching elements or the first one
    const targetEl = elements[0];
    const childIdx = Math.max(0, (parseInt(nthChild, 10) || 1) - 1);
    const targetChild = targetEl.children[childIdx];

    const childText = targetChild ? (targetChild.textContent || '').trim() : '';

    // Normalization helper
    const norm = str => (str || '').toLowerCase().replace(/comming/g, 'coming').replace(/\s+/g, ' ').trim();

    const normalizedChildText = norm(childText);
    const normalizedSeekText = norm(seekText);

    // If text is present
    const textPresent = normalizedChildText.includes(normalizedSeekText);

    return {
      foundClass: true,
      textPresent,
      childText: childText.replace(/\s+/g, ' ').slice(0, 100),
      elementsCount: elements.length,
      message: textPresent
        ? `Text "${seekText}" is present. Condition satisfied (Silent).`
        : `Text "${seekText}" is NOT present! Triggering alarm!`
    };
  } catch (err) {
    return {
      foundClass: false,
      textPresent: false,
      childText: '',
      error: err.message
    };
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_ALARM') {
    playLoudSiren();
    sendResponse({ playing: true });
    return true;
  }

  if (message.type === 'STOP_ALARM') {
    stopAlarm();
    sendResponse({ playing: false });
    return true;
  }

  if (message.type === 'TEST_SOUND') {
    playLoudSiren();
    const duration = message.duration || 3000;
    setTimeout(() => {
      stopAlarm();
    }, duration);
    sendResponse({ playing: true });
    return true;
  }

  if (message.type === 'CHECK_HTML') {
    const result = checkHtmlContent(message);
    sendResponse(result);
    return true;
  }
});
