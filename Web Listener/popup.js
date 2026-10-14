// Popup Controller

const elUrl = document.getElementById('url');
const elIntervalMin = document.getElementById('intervalMin');
const elIntervalSec = document.getElementById('intervalSec');
const elClassName = document.getElementById('className');
const elNthChild = document.getElementById('nthChild');
const elSeekText = document.getElementById('seekText');
const elEnabled = document.getElementById('enabled');

const elHintChild = document.getElementById('hint-child');
const elHintClass = document.getElementById('hint-class');
const elHintText = document.getElementById('hint-text');

const elStatusDot = document.getElementById('status-dot');
const elStatusText = document.getElementById('status-text');
const elCountdownText = document.getElementById('countdown-text');
const elAlarmBox = document.getElementById('alarm-box');
const elResultValue = document.getElementById('result-value');

const btnSave = document.getElementById('btn-save');
const btnCheckNow = document.getElementById('btn-check-now');
const btnTestSound = document.getElementById('btn-test-sound');
const btnStopAlarm = document.getElementById('btn-stop-alarm');

let countdownInterval = null;
let nextCheckTimestamp = null;

// Helper: Format seconds to "X min Y sec"
function formatMinSecStyle(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  const padSec = secs < 10 ? `0${secs}` : `${secs}`;
  const padMin = mins < 10 ? `0${mins}` : `${mins}`;

  return `${padMin} min ${padSec} sec`;
}

// Update rule hint text as user inputs
function updateHints() {
  elHintChild.textContent = elNthChild.value || '2';
  elHintClass.textContent = elClassName.value || '_card_7xci0_108';
  elHintText.textContent = elSeekText.value || 'comming soon';
}

elNthChild.addEventListener('input', updateHints);
elClassName.addEventListener('input', updateHints);
elSeekText.addEventListener('input', updateHints);

// Live countdown timer in min sec format
function startCountdown(nextCheckTime) {
  nextCheckTimestamp = nextCheckTime;
  if (countdownInterval) clearInterval(countdownInterval);

  function update() {
    if (!elEnabled.checked) {
      elCountdownText.textContent = 'Next check: Paused';
      return;
    }

    if (!nextCheckTimestamp) {
      elCountdownText.textContent = 'Next check: Waiting';
      return;
    }

    const remainingSec = Math.floor((nextCheckTimestamp - Date.now()) / 1000);
    if (remainingSec <= 0) {
      elCountdownText.textContent = 'Next check: Checking now...';
      return;
    }

    elCountdownText.textContent = `Next check: ${formatMinSecStyle(remainingSec)}`;
  }

  update();
  countdownInterval = setInterval(update, 1000);
}

// Load settings from storage
function loadData() {
  chrome.storage.local.get(null, data => {
    if (data.url !== undefined) elUrl.value = data.url;
    if (data.intervalMin !== undefined) elIntervalMin.value = data.intervalMin;
    if (data.intervalSec !== undefined) elIntervalSec.value = data.intervalSec;
    if (data.className !== undefined) elClassName.value = data.className;
    if (data.nthChild !== undefined) elNthChild.value = data.nthChild;
    if (data.seekText !== undefined) elSeekText.value = data.seekText;
    if (data.enabled !== undefined) elEnabled.checked = data.enabled;

    updateHints();

    const m = parseInt(elIntervalMin.value, 10) || 0;
    const s = parseInt(elIntervalSec.value, 10) || 0;
    const intervalDisplay = `${m} min ${s < 10 ? '0' + s : s} sec`;

    // Alarm banner
    if (data.isAlarming) {
      elAlarmBox.classList.remove('hidden');
      elStatusDot.className = 'status-dot alert';
      elStatusText.textContent = '🚨 LOUD ALARM ACTIVE!';
      elCountdownText.textContent = 'Registration is OPEN!';
    } else {
      elAlarmBox.classList.add('hidden');
      if (data.enabled === false) {
        elStatusDot.className = 'status-dot off';
        elStatusText.textContent = 'Monitoring Paused';
        elCountdownText.textContent = 'Switch toggle to resume';
      } else {
        elStatusDot.className = 'status-dot';
        elStatusText.textContent = `Monitoring every ${intervalDisplay}`;
        startCountdown(data.nextCheckTime);
      }
    }

    if (data.lastCheckResult) {
      let timeAgo = '';
      if (data.lastCheckTime) {
        const secAgo = Math.floor((Date.now() - data.lastCheckTime) / 1000);
        timeAgo = `[${formatMinSecStyle(secAgo)} ago] `;
      }
      elResultValue.textContent = `${timeAgo}${data.lastCheckResult}`;
    }
  });
}

// Save settings
btnSave.addEventListener('click', () => {
  const m = Math.max(0, parseInt(elIntervalMin.value, 10) || 0);
  const s = Math.max(0, Math.min(59, parseInt(elIntervalSec.value, 10) || 0));

  // Ensure at least 5 seconds interval
  const totalSecs = Math.max(5, (m * 60) + s);
  const correctedM = Math.floor(totalSecs / 60);
  const correctedS = totalSecs % 60;

  elIntervalMin.value = correctedM;
  elIntervalSec.value = correctedS;

  const settings = {
    url: elUrl.value.trim(),
    intervalMin: correctedM,
    intervalSec: correctedS,
    className: elClassName.value.trim(),
    nthChild: Math.max(1, parseInt(elNthChild.value, 10) || 2),
    seekText: elSeekText.value.trim(),
    enabled: elEnabled.checked
  };

  btnSave.textContent = 'Saving...';
  chrome.runtime.sendMessage({ type: 'SAVE_SETTINGS', settings }, () => {
    btnSave.textContent = 'Saved!';
    setTimeout(() => {
      btnSave.textContent = 'Save & Start Monitoring';
    }, 1500);
    loadData();
  });
});

// Master switch change
elEnabled.addEventListener('change', () => {
  const m = Math.max(0, parseInt(elIntervalMin.value, 10) || 0);
  const s = Math.max(0, Math.min(59, parseInt(elIntervalSec.value, 10) || 0));

  chrome.storage.local.set({ enabled: elEnabled.checked }, () => {
    chrome.runtime.sendMessage({
      type: 'SAVE_SETTINGS',
      settings: {
        url: elUrl.value.trim(),
        intervalMin: m,
        intervalSec: s,
        className: elClassName.value.trim(),
        nthChild: Math.max(1, parseInt(elNthChild.value, 10) || 2),
        seekText: elSeekText.value.trim(),
        enabled: elEnabled.checked
      }
    }, loadData);
  });
});

// Check Now
btnCheckNow.addEventListener('click', () => {
  btnCheckNow.disabled = true;
  btnCheckNow.textContent = 'Checking...';
  chrome.runtime.sendMessage({ type: 'RUN_CHECK' }, () => {
    setTimeout(() => {
      btnCheckNow.disabled = false;
      btnCheckNow.textContent = 'Check Now';
      loadData();
    }, 1200);
  });
});

// Test Sound
btnTestSound.addEventListener('click', () => {
  btnTestSound.textContent = 'Playing (3s)...';
  chrome.runtime.sendMessage({ type: 'TEST_SOUND' }, () => {
    setTimeout(() => {
      btnTestSound.textContent = 'Test Sound';
    }, 3000);
  });
});

// Stop Alarm
btnStopAlarm.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'STOP_ALARM' }, () => {
    elAlarmBox.classList.add('hidden');
    loadData();
  });
});

// Listen for storage changes in real time
chrome.storage.onChanged.addListener(loadData);

// Initialize
document.addEventListener('DOMContentLoaded', loadData);
