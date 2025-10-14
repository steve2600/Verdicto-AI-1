import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// SpeechRecognition helper
function getSpeechRecognition(): any {
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

type VerdictAnalysis = {
  verdict?: string;
  conclusion?: string;
  punishment?: string;
  confidence?: number;
} | null;

export default function LiveVerdict() {
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>("");
  const [liveWords, setLiveWords] = useState<string[]>([]);
  const recognitionRef = useRef<any>(null);

  const [verdictAnalysis, setVerdictAnalysis] = useState<VerdictAnalysis>(null);

  useEffect(() => {
    const Recognition = getSpeechRecognition();
    if (!Recognition) {
      setIsSupported(false);
      return;
    }
    const recognition = new Recognition();
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.lang = "en-IN";

    recognition.onresult = (event: any) => {
      let interim = "";
      let finalized = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const part = event.results[i][0]?.transcript ?? "";
        if (event.results[i].isFinal) {
          finalized += part + " ";
        } else {
          interim += part;
        }
      }

      if (finalized) {
        setTranscript((prev) => (prev ? prev + finalized : finalized));
        setLiveWords([]);
      }

      if (interim) {
        const words = interim.trim().split(/\s+/).filter(Boolean);
        setLiveWords(words);
      } else {
        setLiveWords([]);
      }
    };

    recognition.onend = () => {
      if (isRecording) {
        try {
          recognition.start();
        } catch {
          // ignore restart errors
        }
      }
    };

    recognition.onerror = () => {
      // Stop on error
      setIsRecording(false);
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch {}
      recognitionRef.current = null;
    };
  }, [isRecording]);

  const startProceeding = () => {
    if (!isSupported || !recognitionRef.current) return;
    setTranscript("");
    setLiveWords([]);
    setVerdictAnalysis(null);
    try {
      recognitionRef.current.start();
      setIsRecording(true);
    } catch {
      setIsRecording(false);
    }
  };

  const stopProceeding = () => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch {}
    setIsRecording(false);
  };

  const clearTranscript = () => {
    setTranscript("");
    setLiveWords([]);
    setVerdictAnalysis(null);
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground">
            Live Verdict
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={clearTranscript}
              className="h-9 rounded-md px-3 text-sm bg-muted text-foreground hover:bg-muted/80 border border-border"
            >
              Clear
            </button>
            {isRecording ? (
              <button
                onClick={stopProceeding}
                className="h-9 rounded-md px-3 text-sm bg-red-600 text-white hover:bg-red-700 shadow"
              >
                Stop Proceeding
              </button>
            ) : (
              <button
                onClick={startProceeding}
                disabled={!isSupported}
                className="h-9 rounded-md px-3 text-sm bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 shadow"
              >
                Start Proceeding
              </button>
            )}
          </div>
        </div>

        {!isSupported && (
          <div className="text-sm text-amber-500 border border-amber-500/30 bg-amber-500/10 rounded-md p-3">
            Your browser does not support live speech recognition. Please use
            Chrome on desktop or Android for the best experience.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h2 className="text-lg font-medium text-foreground">
              Live Transcript
            </h2>
            <div className="min-h-[360px] max-h-[560px] overflow-y-auto p-4 rounded-lg bg-muted/40 border border-border">
              {transcript || liveWords.length > 0 ? (
                <div className="text-foreground whitespace-pre-wrap leading-relaxed">
                  <span>{transcript}</span>
                  <AnimatePresence>
                    {liveWords.length > 0 && (
                      <span className="inline-flex flex-wrap gap-1 ml-1">
                        {liveWords.map((word, idx) => (
                          <motion.span
                            key={`${idx}-${word}`}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 0.9, y: 0 }}
                            exit={{ opacity: 0, y: 6 }}
                            transition={{ duration: 0.15, delay: idx * 0.03 }}
                            className="text-muted-foreground italic"
                          >
                            {word}
                          </motion.span>
                        ))}
                      </span>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <p className="text-muted-foreground text-center">
                  Click "Start Proceeding" to begin transcription...
                </p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-medium text-foreground">
              Verdict Analysis
            </h2>
            <div className="min-h-[180px] p-4 rounded-lg bg-muted/40 border border-border">
              {verdictAnalysis ? (
                <pre className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {JSON.stringify(verdictAnalysis, null, 2)}
                </pre>
              ) : (
                <p className="text-muted-foreground text-center">
                  No analysis yet
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}