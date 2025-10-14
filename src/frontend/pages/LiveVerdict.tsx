import React, { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function LiveVerdict() {
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [liveWords, setLiveWords] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  // Optional placeholders (kept for future features already referenced in UI)
  const [verdictAnalysis, setVerdictAnalysis] = useState<any>(null);
  const [generatedNotes, setGeneratedNotes] = useState<any>(null);

  const toggleRecording = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (isRecording) {
      recognition?.stop?.();
      setIsRecording(false);
      toast.success("Recording stopped");
      return;
    }

    if (!SpeechRecognition) {
      toast.error("Speech recognition is not supported in your browser");
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onstart = () => {
      setIsRecording(true);
      setTranscript("");
      setInterimTranscript("");
      setLiveWords([]);
      setVerdictAnalysis(null);
      setGeneratedNotes(null);
      toast.success("Recording started");
    };

    rec.onresult = (event: any) => {
      let interim = "";
      let finalized = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const part = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalized += part + " ";
        } else {
          interim += part;
        }
      }

      if (finalized) {
        setTranscript((prev) => prev + finalized);
        setLiveWords([]);
      }

      if (interim) {
        const words = interim.trim().split(/\s+/);
        setLiveWords(words);
        setInterimTranscript(interim);
      } else {
        setLiveWords([]);
        setInterimTranscript("");
      }
    };

    rec.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      toast.error(`Recording error: ${event.error}`);
      setIsRecording(false);
    };

    rec.onend = () => {
      setIsRecording(false);
      setInterimTranscript("");
      setLiveWords([]);
    };

    setRecognition(rec);
    rec.start();
  };

  const clearTranscript = () => {
    setTranscript("");
    setInterimTranscript("");
    setLiveWords([]);
    setVerdictAnalysis(null);
    setGeneratedNotes(null);
    toast.success("Transcript cleared");
  };

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Transcription & Analysis</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Live Transcript</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleRecording}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    isRecording
                      ? "bg-red-500 hover:bg-red-600 text-white"
                      : "bg-green-500 hover:bg-green-600 text-white"
                  }`}
                >
                  {isRecording ? "Stop Proceeding" : "Start Proceeding"}
                </button>
                <button
                  onClick={clearTranscript}
                  className="px-4 py-2 rounded-lg font-medium transition-colors bg-gray-200 dark:bg-zinc-700 text-foreground"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="min-h-[400px] max-h-[600px] overflow-y-auto p-4 rounded-lg bg-muted/50 border border-border">
              {transcript || liveWords.length > 0 ? (
                <div className="text-foreground whitespace-pre-wrap leading-relaxed">
                  <span>{transcript}</span>
                  {liveWords.length > 0 && (
                    <span className="inline-flex flex-wrap gap-1">
                      {liveWords.map((word, idx) => (
                        <motion.span
                          key={`${idx}-${word}`}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.15, delay: idx * 0.05 }}
                          className="text-muted-foreground italic"
                        >
                          {word}
                        </motion.span>
                      ))}
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-center">
                  Click "Start Proceeding" to begin transcription...
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Verdict Analysis</h2>
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              {verdictAnalysis ? (
                <pre className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {JSON.stringify(verdictAnalysis, null, 2)}
                </pre>
              ) : (
                <p className="text-muted-foreground text-center">No analysis yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}