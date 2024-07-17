import { useEffect, useState, useRef } from "react";
import { Input, Card, CardBody } from "@nextui-org/react";
import { SearchIcon } from "./SearchIcon";
import { motion, AnimatePresence, stagger } from "framer-motion";

interface TranscriptSegment {
  timestamp: string;
  caption: string;
}

function App() {
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingText, setLoadingText] = useState("Fetching transcripts...");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentTimestamp, setCurrentTimestamp] = useState("0:00");
  const [closestSegmentIndex, setClosestSegmentIndex] = useState(0);
  const closestSegmentRef = useRef<HTMLDivElement>(null);
  const [isYouTubeWatch, setIsYouTubeWatch] = useState(false);

  const filteredTranscript = transcript.filter((segment) =>
    segment.caption.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const timestampToSeconds = (timestamp: string): number => {
    const [minutes, seconds] = timestamp.split(":").map(Number);
    return minutes * 60 + seconds;
  };

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0].url;
      if (url && url.match(/^https?:\/\/www\.youtube\.com\/watch/)) {
        setIsYouTubeWatch(true);
      }
    });

    let timestampInterval: number;
    let transcriptCheckInterval: number;

    setTimeout(() => {
      setLoadingText("Hmm... that's taking too long. Try refreshing the page?");
    }, 5000);

    function checkTranscript() {
      chrome.runtime.sendMessage({ action: "getData" }, (response) => {
        if (response && response.transcriptFetched) {
          setTranscript(response.transcript);
          setCurrentTimestamp(response.timestamp);
          setIsLoading(false);
          setLoadingText("Fetching transcripts...");
          clearInterval(transcriptCheckInterval);
        }
      });
    }

    // Notify that popup is opened
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "popupOpened" });
      }
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
        if (tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, { action: "popupClosed" });
        }
      });
      // Clear the intervals when component unmounts
      clearInterval(timestampInterval);
      clearInterval(transcriptCheckInterval);
    };
  }, []);

  useEffect(() => {
    if (transcript.length > 0 && currentTimestamp) {
      const currentSeconds = timestampToSeconds(currentTimestamp);
      let closestIndex = 0;
      let minDifference = Infinity;

      transcript.forEach((segment, index) => {
        const segmentSeconds = timestampToSeconds(segment.timestamp);
        const difference = Math.abs(segmentSeconds - currentSeconds);
        if (difference < minDifference) {
          minDifference = difference;
          closestIndex = index;
        }
      });

      setClosestSegmentIndex(closestIndex);
    }
  }, [transcript, currentTimestamp]);

  useEffect(() => {
    if (closestSegmentRef.current) {
      closestSegmentRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [closestSegmentIndex]);

  const handleTimestampClick = (timestamp: string) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "seekTo",
          timestamp: timestamp,
        });
      }
    });
  };

  if (!isYouTubeWatch) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: 400 }}
          exit={{ height: 0 }}
          transition={{
            type: "spring",
            duration: 1,
          }}
          className="flex flex-col gap-4 py-4 text-center justify-center"
          style={{
            background: "radial-gradient(circle, #FFFFFF, #f7f7f5)",
          }}
        >
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Open a YouTube video to see the transcript here!
          </motion.p>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        className="flex flex-col gap-4 py-4"
        style={{
          overflowY: "hidden",
          background: "radial-gradient(circle, #FFFFFF, #f7f7f5)",
        }}
        initial={{ height: 0 }}
        animate={{ height: 500 }}
        exit={{ height: 0 }}
        transition={{
          type: "spring",
          duration: isLoading ? 2 : 1,
        }}
      >
        <div className="px-4">
          <Input
            value={searchQuery}
            onValueChange={setSearchQuery}
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
            placeholder="Search..."
            startContent={
              <SearchIcon className="text-black/50 mb-0.5 dark:text-white/90 text-slate-400 pointer-events-none flex-shrink-0" />
            }
          />
        </div>

        {isLoading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 1 }}
            className="w-full flex flex-col h-full gap-5 justify-center text-center animate-pulse"
          >
            {loadingText}
          </motion.div>
        ) : (
          <div
            className="flex-grow overflow-y-auto bg-transparent px-4"
            style={{
              mask: "linear-gradient(to top, transparent 0%, black 10%, black 95%, transparent 100%)",
            }}
          >
            <div className="flex flex-col gap-2">
              {filteredTranscript.map((segment, index) => (
                <Card
                  key={index}
                  style={{ cursor: "pointer" }}
                  className={`hover:scale-[1.04] active:scale-[0.96] transition-transform ${
                    index === closestSegmentIndex
                      ? "outline outline-2 outline-blue-500"
                      : ""
                  }`}
                  ref={index === closestSegmentIndex ? closestSegmentRef : null}
                >
                  <CardBody
                    onClick={() => handleTimestampClick(segment.timestamp)}
                  >
                    <div className="flex flex-row gap-1">
                      <p className="font-medium basis-4">{segment.timestamp}</p>
                      <p>{segment.caption}</p>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

export default App;
