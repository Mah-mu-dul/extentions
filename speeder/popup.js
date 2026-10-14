const speedRange = document.getElementById("speedRange");
const speedValue = document.getElementById("speedValue");

// Get current speed from the page
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  chrome.tabs.sendMessage(tabs[0].id, { type: "GET_SPEED" }, (response) => {
    if (response && response.speed) {
      speedRange.value = response.speed;
      speedValue.textContent = `${parseFloat(response.speed).toFixed(2)}x`;
    }
  });
});

speedRange.addEventListener("input", () => {
  speedValue.textContent = `${parseFloat(speedRange.value).toFixed(2)}x`;
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {
      type: "SET_SPEED",
      speed: speedRange.value,
    });
  });
});
