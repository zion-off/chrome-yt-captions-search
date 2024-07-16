import React, { useEffect, useState } from "react";

interface TranscriptSegment {
  timestamp: string;
  caption: string;
}

function App() {
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTimestamp, setCurrentTimestamp] = useState("0:00");

  useEffect(() => {
    let timestampInterval: number;
    let transcriptCheckInterval: number;

    function checkTranscript() {
      chrome.runtime.sendMessage({ action: "getData" }, (response) => {
        if (response && response.transcriptFetched) {
          setTranscript(response.transcript);
          setCurrentTimestamp(response.timestamp);
          setIsLoading(false);
          clearInterval(transcriptCheckInterval);
        }
      });
    }

    // Notify that popup is opened
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id!, { action: "popupOpened" });
    });

    // Initial check for transcript
    checkTranscript();

    // Set up interval to check for transcript every 500ms
    transcriptCheckInterval = window.setInterval(checkTranscript, 500);

    // Set up interval to update timestamp
    timestampInterval = window.setInterval(() => {
      chrome.runtime.sendMessage({ action: "getTimestamp" }, (response) => {
        if (response && response.timestamp) {
          setCurrentTimestamp(response.timestamp);
        }
      });
    }, 1000); // Update every second

    return () => {
      // Notify that popup is closed
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id!, { action: "popupClosed" });
      });
      // Clear the intervals when component unmounts
      clearInterval(timestampInterval);
      clearInterval(transcriptCheckInterval);
    };
  }, []);

  const handleTimestampClick = (timestamp: string) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id!, {
        action: "seekTo",
        timestamp: timestamp,
      });
    });
  };

  if (isLoading) {
    return <div>Loading transcript...</div>;
  }

  return (
    <div>
      <div>Current Time: {currentTimestamp}</div>
      {transcript.map((segment, index) => (
        <div
          key={index}
          onClick={() => handleTimestampClick(segment.timestamp)}
          style={{ cursor: "pointer" }}
        >
          <span>{segment.timestamp}</span>: <span>{segment.caption}</span>
        </div>
      ))}
    </div>
  );
}

export default App;
