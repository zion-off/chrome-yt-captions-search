// content.js

let popupOpen = false;
let transcriptFetched = false;
let cachedTranscript = null;
let isInitialized = false;
let currentVideoId = null;

function initializeScript() {
  if (isInitialized) return;
  isInitialized = true;
  openTranscript();
}

function openTranscript() {
  const expandButton = document.querySelector('tp-yt-paper-button#expand');
  if (expandButton) {
    expandButton.click();
    setTimeout(() => {
      const showTranscriptButton = document.querySelector('button[aria-label="Show transcript"]');
      if (showTranscriptButton) {
        showTranscriptButton.click();
        setTimeout(fetchTranscript, 2000); // Adjust this delay if needed
      }
    }, 1000); // Adjust this delay if needed
  }
}

function closeTranscript() {
  const closeTranscriptButton = document.querySelector('button[aria-label="Close transcript"]');
  if (closeTranscriptButton) {
    closeTranscriptButton.click();
  }
}

function getCurrentTimestamp() {
  const video = document.querySelector('video');
  if (video) {
    const time = video.currentTime;
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  return "0:00";
}

function getTranscript() {
  const transcriptSegments = document.querySelectorAll('ytd-transcript-segment-renderer');
  return Array.from(transcriptSegments).map(segment => ({
    timestamp: segment.querySelector('.segment-timestamp').textContent.trim(),
    caption: segment.querySelector('.segment-text').textContent.trim()
  }));
}

function fetchTranscript() {
  cachedTranscript = getTranscript();
  transcriptFetched = true;
  closeTranscript();
  sendDataUpdate();
}

function sendDataUpdate() {
  const timestamp = getCurrentTimestamp();
  console.log('Sending data update');
  chrome.runtime.sendMessage({
    action: "dataUpdated",
    data: {
      timestamp,
      transcript: cachedTranscript,
      transcriptFetched: transcriptFetched
    }
  });
}

function sendData() {
  if (popupOpen) {
    sendDataUpdate();
    requestAnimationFrame(sendData);
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "popupOpened") {
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
      transcriptFetched: transcriptFetched
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
      transcriptFetched: transcriptFetched
    });
  } else if (request.action === "getTimestamp") {
    sendResponse({ timestamp: getCurrentTimestamp() });
  }
  return true; // Indicates that we will send a response asynchronously
});

function checkForVideoChange() {
  const videoId = new URLSearchParams(window.location.search).get('v');
  if (videoId && videoId !== currentVideoId) {
    currentVideoId = videoId;
    console.log('Video changed, fetching new transcript');
    transcriptFetched = false;
    cachedTranscript = null;
    isInitialized = false;
    setTimeout(initializeScript, 2000); // Delay initialization
  }
  setTimeout(checkForVideoChange, 1000); // Check every second
}

// Initialize script when it's first injected
initializeScript();

// Start checking for video changes
checkForVideoChange();