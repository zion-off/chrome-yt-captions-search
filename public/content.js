let popupOpen = false;
let transcriptFetched = false;
let cachedTranscript = null;
let isInitialized = false;
let currentVideoId = null;

function initializeScript() {
  if (isInitialized) return;
  isInitialized = true;
}

function openTranscript() {
  const expandButton = document.querySelector("tp-yt-paper-button#expand");
  if (expandButton) {
    expandButton.click();
    setTimeout(() => {
      const showTranscriptButton = document.querySelector(
        'button[aria-label="Show transcript"]'
      );
      if (showTranscriptButton) {
        showTranscriptButton.click();
      }
    }, 1000);
  }
}

function closeTranscript() {
  const closeTranscriptButton = document.querySelector(
    'button[aria-label="Close transcript"]'
  );
  if (closeTranscriptButton) {
    closeTranscriptButton.click();
  }
}

function getCurrentTimestamp() {
  const video = document.querySelector("video");
  if (video) {
    const time = video.currentTime;
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }
  return "0:00";
}

function isTranscriptVisible() {
  const transcriptContainer = document.querySelector("ytd-transcript-renderer");
  const transcriptSegments = document.querySelectorAll(
    "ytd-transcript-segment-renderer"
  );
  return (
    transcriptContainer &&
    transcriptContainer.offsetParent !== null &&
    transcriptSegments.length > 0
  );
}

function getTranscript() {
  const transcriptSegments = document.querySelectorAll(
    "ytd-transcript-segment-renderer"
  );
  return Array.from(transcriptSegments).map((segment) => ({
    timestamp: segment.querySelector(".segment-timestamp").textContent.trim(),
    caption: segment.querySelector(".segment-text").textContent.trim(),
  }));
}

function fetchTranscript() {
  if (!transcriptFetched) {
    openTranscript();
    checkTranscriptVisibility();
  }
}

function checkTranscriptVisibility() {
  if (isTranscriptVisible()) {
    cachedTranscript = getTranscript();
    transcriptFetched = true;
    closeTranscript();
    sendDataUpdate();
  } else {
    // If transcript is not visible yet, check again after a short delay
    setTimeout(checkTranscriptVisibility, 500);
  }
}

function sendDataUpdate() {
  const timestamp = getCurrentTimestamp();
  console.log("Sending data update");
  chrome.runtime.sendMessage({
    action: "dataUpdated",
    data: {
      timestamp,
      transcript: cachedTranscript,
      transcriptFetched: transcriptFetched,
    },
  });
}

function sendData() {
  if (popupOpen) {
    sendDataUpdate();
    requestAnimationFrame(sendData);
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "seekTo") {
    seekToTimestamp(request.timestamp);
  } else if (request.action === "popupOpened") {
    popupOpen = true;
    if (!isInitialized) {
      initializeScript();
    }
    if (!transcriptFetched) {
      fetchTranscript();
    }
    sendResponse({
      timestamp: getCurrentTimestamp(),
      transcript: cachedTranscript,
      transcriptFetched: transcriptFetched,
    });
    sendData();
  } else if (request.action === "popupClosed") {
    popupOpen = false;
  } else if (request.action === "getData") {
    if (!isInitialized) {
      initializeScript();
    }
    if (!transcriptFetched) {
      fetchTranscript();
    }
    sendResponse({
      timestamp: getCurrentTimestamp(),
      transcript: cachedTranscript,
      transcriptFetched: transcriptFetched,
    });
  } else if (request.action === "getTimestamp") {
    sendResponse({ timestamp: getCurrentTimestamp() });
  }
  return true;
});

function checkForVideoChange() {
  const videoId = new URLSearchParams(window.location.search).get("v");
  if (videoId && videoId !== currentVideoId) {
    currentVideoId = videoId;
    console.log("Video changed, resetting transcript state");
    transcriptFetched = false;
    cachedTranscript = null;
    isInitialized = false;
  }
  setTimeout(checkForVideoChange, 1000);
}

function seekToTimestamp(timestamp) {
  const video = document.querySelector("video");
  if (video) {
    const [minutes, seconds] = timestamp.split(":").map(Number);
    const timeInSeconds = minutes * 60 + seconds;
    video.currentTime = timeInSeconds;
  }
}

checkForVideoChange();
