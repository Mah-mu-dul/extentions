function addSpeedSlider(video) {
  if (video._hasSpeedSlider) return; // Prevent duplicates
  video._hasSpeedSlider = true;

  // Create slider container
  const sliderContainer = document.createElement("div");
  sliderContainer.className = "jw-speed-slider-container";

  // Create slider
  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = "0.25";
  slider.max = "3.0";
  slider.step = "0.05";
  slider.value = video.playbackRate;
  slider.className = "jw-speed-slider";

  // Create label
  const label = document.createElement("span");
  label.className = "jw-speed-label";
  label.textContent = `${slider.value}x`;

  // Update video speed on slider change
  slider.addEventListener("input", () => {
    video.playbackRate = slider.value;
    label.textContent = `${slider.value}x`;
  });

  // Update slider if video speed changes elsewhere
  video.addEventListener("ratechange", () => {
    slider.value = video.playbackRate;
    label.textContent = `${video.playbackRate}x`;
  });

  sliderContainer.appendChild(slider);
  sliderContainer.appendChild(label);

  // Position the slider over the video
  video.parentElement.style.position = "relative";
  video.parentElement.appendChild(sliderContainer);
}

// Observe for new JW videos
function observeVideos() {
  const addSliders = () => {
    document
      .querySelectorAll("video.jw-video.jw-reset")
      .forEach(addSpeedSlider);
  };
  addSliders();

  // Watch for dynamically added videos
  const observer = new MutationObserver(addSliders);
  observer.observe(document.body, { childList: true, subtree: true });
}

observeVideos();

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const video = document.querySelector("video.jw-video.jw-reset");
  if (!video) return;

  if (request.type === "SET_SPEED") {
    video.playbackRate = request.speed;
  }
  if (request.type === "GET_SPEED") {
    sendResponse({ speed: video.playbackRate });
  }
});
