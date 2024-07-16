// content.js

let popupOpen = false;

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
    sendData();
  } else if (request.action === "popupClosed") {
    popupOpen = false;
  } else if (request.action === "getData") {
    const timestamp = getCurrentTimestamp();
    const transcript = getTranscript();
    sendResponse({ timestamp, transcript });
  }
  return true;  // Indicates that we will send a response asynchronously
});

// Initialize data updates when the script runs
sendData();