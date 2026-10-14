const selectorInput = document.getElementById("selectorInput");
const addBtn = document.getElementById("addBtn");
const toastList = document.getElementById("toastList");
const emptyState = document.getElementById("emptyState");
const countLabel = document.getElementById("countLabel");
const deleteAllBtn = document.getElementById("deleteAllBtn");
const refreshBtn = document.getElementById("refreshBtn");
const siteLabel = document.getElementById("siteLabel");
const statusMsg = document.getElementById("statusMsg");

let hostname = null;
let activeTabId = null;
let entries = [];

init();

async function init() {
  const tab = await getActiveTab();
  if (!tab || !tab.url || !/^https?:/.test(tab.url)) {
    hostname = null;
    siteLabel.textContent = "unsupported page";
    selectorInput.disabled = true;
    addBtn.disabled = true;
    countLabel.textContent = "Can't run here";
    return;
  }
  activeTabId = tab.id;
  hostname = new URL(tab.url).hostname;
  siteLabel.textContent = hostname;
  siteLabel.title = hostname;

  entries = await loadEntries(hostname);
  render();
}

function getActiveTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs && tabs[0]);
    });
  });
}

function loadEntries(host) {
  return new Promise((resolve) => {
    chrome.storage.local.get([host], (result) => {
      resolve(Array.isArray(result[host]) ? result[host] : []);
    });
  });
}

function saveEntries() {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [hostname]: entries }, resolve);
  });
}

function render() {
  toastList.innerHTML = "";

  if (entries.length === 0) {
    toastList.appendChild(emptyState);
  } else {
    entries.forEach((entry, index) => {
      toastList.appendChild(buildToast(entry, index));
    });
  }

  countLabel.textContent =
    entries.length === 0
      ? "0 rules on this site"
      : `${entries.length} rule${entries.length === 1 ? "" : "s"} on this site`;
  deleteAllBtn.disabled = entries.length === 0;
}

function buildToast(entry, index) {
  const el = document.createElement("div");
  el.className = "toast";

  const text = document.createElement("span");
  text.className = "toast__text";
  text.textContent = entry;
  text.title = entry;

  const remove = document.createElement("button");
  remove.className = "toast__remove";
  remove.setAttribute("aria-label", `Remove ${entry}`);
  remove.textContent = "✕";
  remove.addEventListener("click", () => removeEntry(index));

  el.appendChild(text);
  el.appendChild(remove);
  return el;
}

async function addEntry() {
  if (!hostname) return;
  const raw = selectorInput.value.trim().replace(/\s+/g, " ");
  if (!raw) return;

  if (entries.some((e) => e.toLowerCase() === raw.toLowerCase())) {
    flashStatus("Already added");
    return;
  }

  entries.push(raw);
  await saveEntries();
  selectorInput.value = "";
  render();
  flashStatus("Hidden ✓");
}

async function removeEntry(index) {
  entries.splice(index, 1);
  await saveEntries();
  render();
  flashStatus("Removed");
}

async function deleteAll() {
  if (entries.length === 0) return;
  const ok = confirm(`Delete all ${entries.length} rule(s) for ${hostname}?`);
  if (!ok) return;
  entries = [];
  await saveEntries();
  render();
  flashStatus("Cleared all");
}

function flashStatus(msg) {
  statusMsg.textContent = msg;
  clearTimeout(flashStatus._t);
  flashStatus._t = setTimeout(() => {
    statusMsg.textContent = "";
  }, 1600);
}

addBtn.addEventListener("click", addEntry);
selectorInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addEntry();
});
deleteAllBtn.addEventListener("click", deleteAll);
refreshBtn.addEventListener("click", () => {
  if (activeTabId != null) {
    chrome.tabs.reload(activeTabId);
    window.close();
  }
});
