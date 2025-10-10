import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export default function LiveVerdict() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = "en-US";

      recognitionInstance.onresult = (event: any) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptPart = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcriptPart + " ";
          } else {
            interimTranscript += transcriptPart;
          }
        }

        setTranscript((prev) => prev + finalTranscript + interimTranscript);
      };

      recognitionInstance.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        toast.error("Speech recognition error: " + event.error);
        setIsRecording(false);
      };

      recognitionInstance.onend = () => {
        setIsRecording(false);
      };

      setRecognition(recognitionInstance);
    }
  }, []);

  const toggleRecording = () => {
    if (!recognition) {
      toast.error("Speech recognition not supported in this browser");
      return;
    }

    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
      toast.success("Recording stopped");
    } else {
      setTranscript("");
      recognition.start();
      setIsRecording(true);
      toast.success("Recording started");
    }
  };

  const clearTranscript = () => {
    setTranscript("");
    toast.success("Transcript cleared");
  };

  return (
    <div className="min-h-screen p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-foreground">Live Verdict</h1>
          <p className="text-muted-foreground">
            Record live proceedings and get real-time transcription
          </p>
        </div>

        <Card className="p-6 mb-6">
          <div className="flex items-center justify-center gap-4 mb-6">
            <Button
              onClick={toggleRecording}
              size="lg"
              variant={isRecording ? "destructive" : "default"}
              className="gap-2"
            >
              {isRecording ? (
                <>
                  <MicOff className="h-5 w-5" />
                  Stop Recording
                </>
              ) : (
                <>
                  <Mic className="h-5 w-5" />
                  Start Recording
                </>
              )}
            </Button>

            {transcript && (
              <Button onClick={clearTranscript} variant="outline">
                Clear
              </Button>
            )}
          </div>

          {isRecording && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center gap-2 mb-4 text-red-500"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm font-medium">Recording in progress...</span>
            </motion.div>
          )}

          <div className="min-h-[400px] max-h-[600px] overflow-y-auto p-4 rounded-lg bg-muted/50 border border-border">
            {transcript ? (
              <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                {transcript}
              </p>
            ) : (
              <p className="text-muted-foreground text-center">
                Click "Start Recording" to begin transcription...
              </p>
            )}
          </div>
        </Card>

        <Card className="p-4 bg-muted/30">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> This feature uses your browser's speech recognition
            capabilities. Make sure to allow microphone access when prompted.
          </p>
        </Card>
      </motion.div>
    </div>
  );
}
