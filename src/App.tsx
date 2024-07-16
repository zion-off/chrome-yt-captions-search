import React, { useEffect, useState } from "react";
import { NextUIProvider } from "@nextui-org/react";
import { Input, Card, CardBody } from "@nextui-org/react";
import { SearchIcon } from "./SearchIcon";

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
  /*   mask: linear-gradient(
    to right,
    transparent 0%,
    black 20%,
    black 80%,
    transparent 100%
  ); */

  return (
    <div
      className="flex flex-col gap-4 py-4"
      style={{
        maxHeight: "500px",
        overflowY: "hidden",
        background: "radial-gradient(circle, #FFFFFF, #f7f7f5)",
      }}
    >
      <div className="px-4">
        <Input
          label="Search"
          isClearable
          radius="lg"
          classNames={{
            label: "text-black/50 dark:text-white/90",
            input: [
              "bg-transparent",
              "text-black/90 dark:text-white/90",
              "placeholder:text-default-700/50 dark:placeholder:text-white/60",
            ],
            innerWrapper: "bg-transparent",
            inputWrapper: [
              "shadow-md",
              "bg-default-200/50",
              "dark:bg-default/60",
              "backdrop-blur-xl",
              "backdrop-saturate-200",
              "hover:bg-default-200/70",
              "dark:hover:bg-default/70",
              "group-data-[focus=true]:bg-default-200/50",
              "dark:group-data-[focus=true]:bg-default/60",
              "!cursor-text",
            ],
          }}
          placeholder="Type to search..."
          startContent={
            <SearchIcon className="text-black/50 mb-0.5 dark:text-white/90 text-slate-400 pointer-events-none flex-shrink-0" />
          }
        />
      </div>

      {/* <div>
        Current Time: {currentTimestamp}
      </div> */}

      <div
        className="flex-grow overflow-y-auto bg-transparent px-4"
        style={{ mask: "linear-gradient(to top, transparent 0%, black 20%)" }}
      >
        <div className="flex flex-col gap-2">
          {transcript.map((segment, index) => (
            <Card
              key={index}
              style={{ cursor: "pointer" }}
              className="hover:scale-[1.04] transition-transform"
            >
              <CardBody onClick={() => handleTimestampClick(segment.timestamp)}>
                <div className="flex flex-row gap-1">
                  <p className="font-medium basis-4">{segment.timestamp}</p>
                  <p>{segment.caption}</p>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
