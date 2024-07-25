let popupOpen = false;
let transcriptFetched = false;
let cachedTranscript = null;
let isInitialized = false;
let currentVideoId = null;
let transcriptStyle = null;

function initializeScript() {
  if (isInitialized) return;
  isInitialized = true;
}

function waitForElement(selector, callback, maxAttempts = 20, interval = 100) {
  let attempts = 0;
  const checkElement = () => {
    const element = document.querySelector(selector);
    if (element) {
      callback(element);
    } else if (attempts < maxAttempts) {
      attempts++;
      setTimeout(checkElement, interval);
    } else {
      console.log(
        `Element ${selector} not found after ${maxAttempts} attempts`
      );
    }
  };
  checkElement();
}

function openTranscript() {
  const expandButton = document.querySelector("tp-yt-paper-button#expand");
  if (expandButton) {
    // Store the current scroll position
    const scrollPosition = window.scrollY;

    // Function to reset scroll position
    const resetScroll = () => {
      window.scrollTo(0, scrollPosition);
    };

    // Prevent scrolling
    const preventScroll = (e) => {
      window.scrollTo(0, scrollPosition);
    };

    // Add scroll prevention
    window.addEventListener('scroll', preventScroll, { passive: false });

    expandButton.click();

    // Wait for the "Show transcript" button to appear
    waitForElement(
      'button[aria-label="Show transcript"]',
      (showTranscriptButton) => {
        showTranscriptButton.click();

        // Wait for the transcript container to appear
        waitForElement(
          'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"]',
          (transcriptContainer) => {
            console.log("Transcript opened");
            transcriptStyle = transcriptContainer.style.cssText;
            transcriptContainer.style.visibility = "hidden";
            transcriptContainer.style.position = "absolute";

            // Additional check to ensure transcript content is loaded
            waitForElement(
              "ytd-transcript-segment-renderer",
              () => {
                console.log("Transcript content loaded");
                // Remove scroll prevention and reset scroll position
                window.removeEventListener('scroll', preventScroll);
                resetScroll();
              },
              30,
              200
            );
          }
        );
      }
    );
  } else {
    console.log("Expand button not found");
  }
}

function closeTranscript() {
  const transcriptContainer = document.querySelector(
    'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"]'
  );
  if (transcriptContainer) {
    console.log("Transcript closing");
    transcriptContainer.style = transcriptStyle;
  }
  const closeTranscriptButton = document.querySelector(
    'button[aria-label="Close transcript"]'
  );
  if (closeTranscriptButton) {
    closeTranscriptButton.click();
    const collapseButton = document.querySelector(
      "tp-yt-paper-button#collapse"
    );
    if (collapseButton) {
      collapseButton.click();
    }
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
