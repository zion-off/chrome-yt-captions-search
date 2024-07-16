// content.js

let popupOpen = false;

function openTranscript() {
  // Click the "expand" button to open the description
  const expandButton = document.querySelector('tp-yt-paper-button#expand');
  if (expandButton) {
    expandButton.click();
    
    // Wait for the "Show transcript" button to appear and click it
    setTimeout(() => {
      const showTranscriptButton = document.querySelector('button[aria-label="Show transcript"]');
      if (showTranscriptButton) {
        showTranscriptButton.click();
      }
    }, 1000); // Adjust this delay if needed
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
  const transcript = Array.from(transcriptSegments).map(segment => {
    const timestamp = segment.querySelector('.segment-timestamp').textContent.trim();
    const caption = segment.querySelector('.segment-text').textContent.trim();
    return { timestamp, caption };
  });
  return transcript;
}

function sendData() {
  if (popupOpen) {
    const timestamp = getCurrentTimestamp();
    const transcript = getTranscript();
    console.log('Sending data update');
    chrome.runtime.sendMessage({
      action: "dataUpdated",
      data: {
        timestamp,
        transcript
      }
    });
    requestAnimationFrame(sendData);
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "popupOpened") {
    popupOpen = true;
    openTranscript(); // Call the function to open the transcript
    sendData();
  } else if (request.action === "popupClosed") {
    popupOpen = false;
  } else if (request.action === "getData") {
    const timestamp = getCurrentTimestamp();
    const transcript = getTranscript();
    sendResponse({ timestamp, transcript });
  }
  return true; // Indicates that we will send a response asynchronously
});

// Initialize data updates when the script runs
openTranscript(); // Open the transcript when the script first runs
sendData();