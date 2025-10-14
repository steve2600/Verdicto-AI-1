import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { motion } from "framer-motion";

const [transcript, setTranscript] = useState("");
const [recognition, setRecognition] = useState<any>(null);
const [isAnalyzing, setIsAnalyzing] = useState(false);
const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);
const [verdictAnalysis, setVerdictAnalysis] = useState<any>(null);
const [generatedNotes, setGeneratedNotes] = useState<any>(null);
const [interimTranscript, setInterimTranscript] = useState("");
const [liveWords, setLiveWords] = useState<string[]>([]);

// ... rest of the component

useEffect(() => {
  if (recognitionInstance) {
    recognitionInstance.onresult = (event: any) => {
      // Replace the onresult handler to stream words and commit finalized sentences
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

      // Commit finalized sentence(s) when silence detected
      if (finalized) {
        setTranscript((prev) => prev + finalized);
        setLiveWords([]); // clear live words once sentence finalizes
      }

      // Update interim streaming words
      if (interim) {
        const words = interim.trim().split(/\s+/);
        setLiveWords(words);
        setInterimTranscript(interim);
      } else {
        setLiveWords([]);
        setInterimTranscript("");
      }
    };
  }
}, [recognitionInstance]);

// ... rest of the component

const toggleRecording = () => {
  if (isRecording) {
    setTranscript("");
    setInterimTranscript("");
    setLiveWords([]); // reset live words on new session
    setVerdictAnalysis(null);
    setGeneratedNotes(null);
    recognition.stop();
    setIsRecording(false);
    toast.success("Recording stopped");
  } else {
    setTranscript("");
    setInterimTranscript("");
    setLiveWords([]); // reset live words on new session
    setVerdictAnalysis(null);
    setGeneratedNotes(null);
    recognition.start();
    setIsRecording(true);
    toast.success("Recording started");
  }
};

const clearTranscript = () => {
  setTranscript("");
  setInterimTranscript("");
  setLiveWords([]); // reset live words on clear
  setVerdictAnalysis(null);
  setGeneratedNotes(null);
  toast.success("Transcript cleared");
};

// ... rest of the component

return (
  <div className="min-h-screen p-4">
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Transcription & Analysis</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Live Transcript</h2>
            <button 
              onClick={toggleRecording}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isRecording 
                  ? "bg-red-500 hover:bg-red-600 text-white" 
                  : "bg-green-500 hover:bg-green-600 text-white"
              }`}
            >
              {isRecording ? "Stop" : "Start"}
            </button>
          </div>

          <div className="min-h-[400px] max-h-[600px] overflow-y-auto p-4 rounded-lg bg-muted/50 border border-border">
            {/* Replace transcript display to show finalized text + live word-by-word streaming */}
            {transcript || liveWords.length > 0 ? (
              <div className="text-foreground whitespace-pre-wrap leading-relaxed">
                {/* Finalized transcript */}
                <span>{transcript}</span>

                {/* Live word-by-word streaming */}
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