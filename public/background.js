// background.js
let currentTimestamp = "0:00";

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateTimestamp") {
    currentTimestamp = request.timestamp;
  } else if (request.action === "getTimestamp") {
    sendResponse({ timestamp: currentTimestamp });
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
  }
});