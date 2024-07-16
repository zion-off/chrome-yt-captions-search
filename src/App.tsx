import React, { useEffect, useState } from 'react';

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

    chrome.runtime.sendMessage({ action: "getData" }, (response) => {
      if (response && response.transcriptFetched) {
        setTranscript(response.transcript);
        setCurrentTimestamp(response.timestamp);
        setIsLoading(false);
      } else {
        // If transcript is not fetched, wait and try again
        setTimeout(() => {
          chrome.runtime.sendMessage({ action: "getData" }, (retryResponse) => {
            if (retryResponse && retryResponse.transcriptFetched) {
              setTranscript(retryResponse.transcript);
              setCurrentTimestamp(retryResponse.timestamp);
            }
            setIsLoading(false);
          });
        }, 5000); // Retry after 5 seconds
      }
    });

    // Notify that popup is opened
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id!, { action: "popupOpened" });
    });

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
      // Clear the interval when component unmounts
      clearInterval(timestampInterval);
    };
  }, []);

  if (isLoading) {
    return <div>Loading transcript...</div>;
  }

  return (
    <div>
      <div>Current Time: {currentTimestamp}</div>
      {transcript.map((segment, index) => (
        <div key={index}>
          <span>{segment.timestamp}</span>: <span>{segment.caption}</span>
        </div>
      ))}
    </div>
  );
}

export default App;