(() => {
  const hostname = location.hostname;
  const STYLE_ID = "__vanish_ext_style__";

  let currentEntries = [];
  let styleEl = null;
  let observer = null;

  function entryToSelector(entry) {
    const tokens = entry.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return null;
    try {
      const parts = tokens.map((t) => {
        if (t.startsWith("#")) return "#" + CSS.escape(t.slice(1));
        if (t.startsWith(".")) return "." + CSS.escape(t.slice(1));
        return "." + CSS.escape(t);
      });
      return parts.join("");
    } catch (e) {
      return null;
    }
  }

  function buildSelectorList(entries) {
    return entries
      .map(entryToSelector)
      .filter(Boolean);
  }

  function ensureStyleEl() {
    if (styleEl && styleEl.isConnected) return styleEl;
    styleEl = document.createElement("style");
    styleEl.id = STYLE_ID;
    (document.head || document.documentElement).appendChild(styleEl);
    return styleEl;
  }

  function applyStyles(entries) {
    currentEntries = entries || [];
    const selectors = buildSelectorList(currentEntries);
    const el = ensureStyleEl();
    if (selectors.length === 0) {
      el.textContent = "";
      return;
    }
    el.textContent =
      selectors.join(",\n") +
      " {\n  display: none !important;\n  visibility: hidden !important;\n}";
    sweepExisting(selectors);
  }

  // Belt-and-suspenders: some sites re-set inline display via JS repeatedly.
  // Force it back off for anything matching our selectors.
  function sweepExisting(selectors) {
    if (!selectors.length) return;
    let nodes;
    try {
      nodes = document.querySelectorAll(selectors.join(","));
    } catch (e) {
      return;
    }
    nodes.forEach((node) => {
      if (node.style.display !== "none") {
        node.style.setProperty("display", "none", "important");
      }
    });
  }

  function startObserver() {
    if (observer) return;
    observer = new MutationObserver((mutations) => {
      if (!currentEntries.length) return;
      const selectors = buildSelectorList(currentEntries);
      if (!selectors.length) return;
      // Cheap heuristic: only re-sweep when nodes were actually added.
      const added = mutations.some((m) => m.addedNodes && m.addedNodes.length > 0);
      if (added) sweepExisting(selectors);
    });
    const root = document.documentElement || document;
    observer.observe(root, { childList: true, subtree: true });
  }

  function loadAndApply() {
    chrome.storage.local.get([hostname], (result) => {
      const entries = Array.isArray(result[hostname]) ? result[hostname] : [];
      applyStyles(entries);
    });
  }

  // Initial apply as early as possible.
  loadAndApply();

  // Re-apply once DOM is ready in case head wasn't available yet.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      loadAndApply();
      startObserver();
    });
  } else {
    startObserver();
  }

  // Live-update if the user adds/removes rules while the page is open.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (!(hostname in changes)) return;
    const newVal = changes[hostname].newValue;
    applyStyles(Array.isArray(newVal) ? newVal : []);
  });
})();
