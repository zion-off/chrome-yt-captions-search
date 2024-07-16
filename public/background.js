// background.js

let currentTimestamp = "0:00";
let currentTranscript = null;
let transcriptFetched = false;

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateTimestamp") {
    currentTimestamp = request.timestamp;
  } else if (request.action === "getTimestamp") {
    sendResponse({ timestamp: currentTimestamp });
  } else if (request.action === "dataUpdated") {
    currentTimestamp = request.data.timestamp;
    currentTranscript = request.data.transcript;
    transcriptFetched = request.data.transcriptFetched;
  } else if (request.action === "getData") {
    sendResponse({
      timestamp: currentTimestamp,
      transcript: currentTranscript,
      transcriptFetched: transcriptFetched
    });
  }
});

// This listener helps initialize the timestamp when a YouTube page is loaded
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes("youtube.com/watch")) {
    chrome.tabs.sendMessage(tabId, { action: "getTimestamp" }, (response) => {
      if (response && response.timestamp) {
        currentTimestamp = response.timestamp;
      }
    });
    // Reset transcript data when a new video is loaded
    currentTranscript = null;
    transcriptFetched = false;
  }
});