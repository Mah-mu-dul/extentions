// Create context menu items when the extension is installed
chrome.runtime.onInstalled.addListener(() => {
  // Create context menu for text selection
  chrome.contextMenus.create({
    id: "blurText",
    title: "Blur Content",
    contexts: ["selection"],
  });

  // Create context menu for masking text
  chrome.contextMenus.create({
    id: "maskText",
    title: "Mask Content",
    contexts: ["selection"],
  });

  // Create context menu for revealing content
  chrome.contextMenus.create({
    id: "revealContent",
    title: "Reveal Content",
    contexts: ["selection", "image"],
  });

  // Create context menu for images
  chrome.contextMenus.create({
    id: "blurImage",
    title: "Blur Content",
    contexts: ["image"],
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "blurText") {
    // Handle text blurring
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: blurSelectedText,
      args: [info.selectionText],
    });
  } else if (info.menuItemId === "maskText") {
    // Handle text masking
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: maskSelectedText,
      args: [info.selectionText],
    });
  } else if (info.menuItemId === "revealContent") {
    // Handle revealing content
    if (info.srcUrl) {
      // For images
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: revealImage,
        args: [info.srcUrl],
      });
    } else {
      // For text
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: revealText,
      });
    }
  } else if (info.menuItemId === "blurImage") {
    // Handle image blurring
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: blurSelectedImage,
      args: [info.srcUrl],
    });
  }
});

// Function to blur selected text
function blurSelectedText() {
  const selection = window.getSelection();
  if (!selection.rangeCount) return;

  const range = selection.getRangeAt(0);
  const selectedText = selection.toString();
  if (!selectedText.trim()) return;

  const fragment = range.cloneContents();
  const newFragment = document.createDocumentFragment();

  fragment.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const span = document.createElement("span");
      span.textContent = node.textContent;
      span.style.filter = "blur(6px)";
      span.dataset.originalText = node.textContent;
      span.dataset.contentType = "blurred";
      newFragment.appendChild(span);
    } else if (
      node.nodeType === Node.ELEMENT_NODE &&
      node.dataset &&
      node.dataset.contentType === "blurred"
    ) {
      // Already blurred — keep as-is
      newFragment.appendChild(node.cloneNode(true));
    } else {
      // If element but not blurred, dive in
      const wrapper = document.createElement("span");
      wrapper.innerHTML = node.innerHTML;
      wrapper.querySelectorAll("*").forEach((inner) => {
        if (!inner.dataset?.contentType) {
          const span = document.createElement("span");
          span.textContent = inner.textContent;
          span.style.filter = "blur(6px)";
          span.dataset.originalText = inner.textContent;
          span.dataset.contentType = "blurred";
          inner.replaceWith(span);
        }
      });
      newFragment.appendChild(wrapper);
    }
  });

  // Replace selected content
  range.deleteContents();
  range.insertNode(newFragment);
}


// Function to mask selected text
function maskSelectedText(selectedText) {
  const selection = window.getSelection();
  if (!selection.rangeCount) return;

  const range = selection.getRangeAt(0);
  const span = document.createElement("span");
  // Replace each character with a dot (•)
  span.textContent = "•".repeat(selectedText.length);
  span.style.fontFamily = "monospace"; // Use monospace to ensure consistent width
  // Store original text for reveal functionality
  span.dataset.originalText = selectedText;
  span.dataset.contentType = "masked";
  range.deleteContents();
  range.insertNode(span);
}

// Function to reveal text content
function revealText() {
  const selection = window.getSelection();
  if (!selection.rangeCount) return;

  const range = selection.getRangeAt(0);

  const modifiedSpans = document.querySelectorAll("span[data-original-text]");
  modifiedSpans.forEach((span) => {
    const contentType = span.dataset.contentType;
    if (contentType !== "blurred" && contentType !== "revealed") return;

    const spanRange = document.createRange();
    spanRange.selectNodeContents(span);

    if (!range.intersectsNode(span)) return;

    const fullText = span.dataset.originalText;
    const spanText = span.textContent;
    const selectionStart = Math.max(
      0,
      range.startOffset - spanRange.startOffset
    );
    const selectionEnd = Math.min(
      spanText.length,
      range.endOffset - spanRange.startOffset
    );

    if (selectionStart <= 0 && selectionEnd >= spanText.length) {
      // Reveal full content but keep it in a span with metadata
      span.textContent = fullText;
      span.style.filter = "none";
      span.dataset.originalText = fullText;
      span.dataset.contentType = "revealed";
      return;
    }

    const before = fullText.slice(0, selectionStart);
    const middle = fullText.slice(selectionStart, selectionEnd);
    const after = fullText.slice(selectionEnd);

    const frag = document.createDocumentFragment();

    if (before) {
      const beforeSpan = document.createElement("span");
      beforeSpan.textContent = before;
      beforeSpan.style.filter = "blur(6px)";
      beforeSpan.dataset.originalText = before;
      beforeSpan.dataset.contentType = "blurred";
      frag.appendChild(beforeSpan);
    }

    if (middle) {
      const revealSpan = document.createElement("span");
      revealSpan.textContent = middle;
      revealSpan.dataset.originalText = middle;
      revealSpan.dataset.contentType = "revealed";
      frag.appendChild(revealSpan);
    }

    if (after) {
      const afterSpan = document.createElement("span");
      afterSpan.textContent = after;
      afterSpan.style.filter = "blur(6px)";
      afterSpan.dataset.originalText = after;
      afterSpan.dataset.contentType = "blurred";
      frag.appendChild(afterSpan);
    }

    span.parentNode.replaceChild(frag, span);
  });
}

// Function to reveal image content
function revealImage(imageUrl) {
  const images = document.getElementsByTagName("img");
  for (const img of images) {
    if (img.src === imageUrl && img.style.filter) {
      img.style.filter = "none";
      img.removeAttribute("data-original-filter");
    }
  }
}

// Function to blur selected image
function blurSelectedImage(imageUrl) {
  const images = document.getElementsByTagName("img");
  for (const img of images) {
    if (img.src === imageUrl) {
      img.style.filter = "blur(8px)";
      // Store original filter to allow for future unblur functionality
      img.dataset.originalFilter = img.style.filter;
    }
  }
}
