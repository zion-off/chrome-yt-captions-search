import React, { useState, useEffect, useCallback } from 'react';

interface TranscriptSegment {
  timestamp: string;
  caption: string;
}

interface YouTubeData {
  timestamp: string;
  transcript: TranscriptSegment[];
}

const App: React.FC = () => {
  const [data, setData] = useState<YouTubeData>({ timestamp: "0:00", transcript: [] });

  const updateData = useCallback((newData: YouTubeData) => {
    setData(prev => {
      if (JSON.stringify(prev) !== JSON.stringify(newData)) {
        console.log('Updating data in popup');
        return newData;
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    const sendMessageToContentScript = (message: any) => {
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, message);
        }
      });
    };
  
    sendMessageToContentScript({action: "popupOpened"});
  
    const listener = (message: any) => {
      if (message.action === "dataUpdated") {
        updateData(message.data);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
  
    // Request initial data
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {action: "getData"}, (response: YouTubeData) => {
          if (response) {
            updateData(response);
          }
        });
      }
    });
  
    return () => {
      chrome.runtime.onMessage.removeListener(listener);
      sendMessageToContentScript({action: "popupClosed"});
    };
  }, [updateData]);

  return (
    <div className="App">
      <h1>Current YouTube Data</h1>
      <p>Timestamp: {data.timestamp}</p>
      <h2>Transcript:</h2>
      <ul>
        {data.transcript.map((segment, index) => (
          <li key={index}>
            <strong>{segment.timestamp}</strong>: {segment.caption}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default App;