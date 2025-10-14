import React, { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mic, MicOff } from "lucide-react";

type AnalysisMode = "judge" | "query";

export default function LiveVerdict() {
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>("judge");

  // Judge Mode states
  const [transcript, setTranscript] = useState("");
  const [liveWords, setLiveWords] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Query Mode state
  const [queryText, setQueryText] = useState("");

  const stopRecording = () => {
    try {
      recognitionRef.current?.stop?.();
    } catch {
      // no-op
    } finally {
      setIsRecording(false);
      setLiveWords([]);
      toast.success("Recording stopped");
    }
  };

  const startRecording = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition is not supported in your browser");
      return;
    }
    try {
      const rec = new SpeechRecognition();
      recognitionRef.current = rec;
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";

      rec.onstart = () => {
        setIsRecording(true);
        setLiveWords([]);
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
          setLiveWords(interim.trim().split(/\s+/));
        } else {
          setLiveWords([]);
        }
      };

      rec.onerror = (e: any) => {
        console.error("Speech recognition error:", e?.error);
        toast.error(`Recording error: ${e?.error || "Unknown"}`);
        setIsRecording(false);
        setLiveWords([]);
      };

      rec.onend = () => {
        setIsRecording(false);
        setLiveWords([]);
      };

      rec.start();
    } catch (e) {
      console.error(e);
      toast.error("Failed to start recording");
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const clearTranscript = () => {
    setTranscript("");
    setLiveWords([]);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl md:text-4xl font-light tracking-tight text-foreground mb-2">
        Live Verdict
      </h1>
      <p className="text-muted-foreground mb-6">
        AI-powered verdict analysis constrained to Indian legal context
      </p>

      {/* Mode Toggle */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-sm text-muted-foreground">Analysis Mode</span>
        <div className="flex gap-2">
          <Button
            variant={analysisMode === "judge" ? "default" : "secondary"}
            onClick={() => setAnalysisMode("judge")}
            className="h-8"
          >
            Judge Mode
          </Button>
          <Button
            variant={analysisMode === "query" ? "default" : "secondary"}
            onClick={() => setAnalysisMode("query")}
            className="h-8"
          >
            Query Mode
          </Button>
        </div>
      </div>

      {/* Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Live Transcript / Query Input */}
        <div className="rounded-lg border border-border p-4 macos-vibrancy">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-foreground">
              {analysisMode === "judge" ? "Live Transcript" : "Question"}
            </h2>
            {analysisMode === "judge" && (
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={toggleRecording}
                  className="h-8"
                >
                  {isRecording ? (
                    <>
                      <MicOff className="h-4 w-4 mr-2" />
                      Stop Proceeding
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4 mr-2" />
                      Start Proceeding
                    </>
                  )}
                </Button>
                <Button variant="secondary" onClick={clearTranscript} className="h-8">
                  Clear
                </Button>
              </div>
            )}
          </div>

          {analysisMode === "judge" ? (
            <div className="space-y-2">
              <Textarea
                placeholder="Type your court proceedings here or use voice transcription..."
                className="min-h-[400px] max-h-[600px] resize-none font-light"
                style={{ fontFamily: "'Inter', sans-serif" }}
                value={transcript + (liveWords.length > 0 ? " " + liveWords.join(" ") : "")}
                onChange={(e) => setTranscript(e.target.value)}
              />
              {liveWords.length > 0 && (
                <div className="text-xs text-muted-foreground italic">
                  Live transcription in progress...
                </div>
              )}
            </div>
          ) : (
            <Textarea
              placeholder="Enter your legal question (e.g., 'What is the chance of winning this case about land acquisition?')"
              className="min-h-[400px] max-h-[600px] resize-none font-light"
              style={{ fontFamily: "'Inter', sans-serif" }}
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
            />
          )}
        </div>

        {/* Right: Placeholder for AI Analysis (kept minimal to compile) */}
        <div className="rounded-lg border border-border p-4 macos-vibrancy">
          <h2 className="text-lg font-medium text-foreground mb-4">AI Analysis</h2>
          <div className="text-sm text-muted-foreground">
            Record or type proceedings and then analyze. This panel is intentionally
            minimal here and will populate in your existing implementation that calls the
            RAG backend and Groq API.
          </div>
        </div>
      </div>
    </div>
  );
}