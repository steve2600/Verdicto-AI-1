import React, { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Trash2, FileText, Sparkles, Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export default function LiveVerdict() {
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [liveWords, setLiveWords] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  const [verdictAnalysis, setVerdictAnalysis] = useState<any>(null);
  const [generatedNotes, setGeneratedNotes] = useState<any>(null);
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState(false);

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

  const generateVerdictAnalysis = async () => {
    if (!transcript.trim()) {
      toast.error("No transcript available to analyze");
      return;
    }

    setIsGeneratingAnalysis(true);
    try {
      // Generate bullet-point summary
      const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const bulletPoints = sentences.slice(0, 5).map(s => s.trim());

      // Simple verdict determination based on keywords
      const lowerTranscript = transcript.toLowerCase();
      let verdict = "Pending Review";
      let reasoning = "Insufficient information to determine verdict.";

      if (lowerTranscript.includes("guilty") || lowerTranscript.includes("convicted")) {
        verdict = "Guilty";
        reasoning = "Based on the proceedings, evidence suggests guilt.";
      } else if (lowerTranscript.includes("not guilty") || lowerTranscript.includes("acquitted")) {
        verdict = "Not Guilty";
        reasoning = "Based on the proceedings, evidence suggests innocence.";
      } else if (lowerTranscript.includes("bail") && lowerTranscript.includes("granted")) {
        verdict = "Bail Granted";
        reasoning = "Court has granted bail to the accused.";
      } else if (lowerTranscript.includes("bail") && lowerTranscript.includes("denied")) {
        verdict = "Bail Denied";
        reasoning = "Court has denied bail to the accused.";
      }

      setVerdictAnalysis({
        bulletPoints,
        verdict,
        reasoning,
        confidence: 0.75
      });

      toast.success("Verdict analysis generated");
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Failed to generate analysis");
    } finally {
      setIsGeneratingAnalysis(false);
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto pb-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl md:text-5xl font-light mb-2 text-foreground tracking-tight" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300, letterSpacing: '-0.02em' }}>
          Live Verdict
        </h1>
        <p className="text-muted-foreground font-light" style={{ letterSpacing: '0.01em' }}>
          Real-time transcription and AI-powered verdict analysis
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Transcript Section */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="macos-card p-6 neon-glow">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center neon-glow">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-xl font-medium text-foreground">Live Transcript</h2>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={toggleRecording}
                  variant={isRecording ? "destructive" : "default"}
                  className={isRecording ? "neon-glow animate-pulse" : "neon-glow"}
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
                <Button
                  onClick={clearTranscript}
                  variant="outline"
                  className="macos-vibrancy"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="min-h-[400px] max-h-[600px] overflow-y-auto p-4 rounded-lg macos-vibrancy border border-border">
              {transcript || liveWords.length > 0 ? (
                <div className="text-foreground whitespace-pre-wrap leading-relaxed font-light" style={{ fontFamily: "'Inter', sans-serif" }}>
                  <span>{transcript}</span>
                  {liveWords.length > 0 && (
                    <span className="inline-flex flex-wrap gap-1">
                      {liveWords.map((word, idx) => (
                        <motion.span
                          key={`${idx}-${word}`}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.15, delay: idx * 0.05 }}
                          className="text-primary italic font-medium"
                        >
                          {word}
                        </motion.span>
                      ))}
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 neon-glow">
                    <Mic className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-muted-foreground font-light">
                    Click "Start Proceeding" to begin transcription...
                  </p>
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Verdict Analysis Section */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="macos-card p-6 neon-glow">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center neon-glow">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-medium text-foreground">Verdict Analysis</h2>
            </div>

            <Separator className="my-4" />

            <div className="min-h-[400px] p-4 rounded-lg macos-vibrancy border border-border space-y-4">
              {verdictAnalysis ? (
                <>
                  <div className="space-y-3">
                    <h4 className="font-medium text-foreground">Transcript Summary</h4>
                    <ul className="space-y-2">
                      {verdictAnalysis.bulletPoints?.map((point: string, idx: number) => (
                        <motion.li
                          key={idx}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.08 }}
                          className="text-sm text-muted-foreground flex items-start gap-2"
                        >
                          <span className="text-primary mt-1">•</span>
                          <span>{point}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <h4 className="font-medium text-foreground">Verdict Determination</h4>
                    <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl font-bold text-primary">
                          {verdictAnalysis.verdict}
                        </span>
                        <Badge variant="secondary">
                          {Math.round((verdictAnalysis.confidence ?? 0.75) * 100)}% confidence
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{verdictAnalysis.reasoning}</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 neon-glow">
                    <FileText className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-muted-foreground font-light mb-4">
                    No analysis yet. Record a proceeding to generate verdict analysis.
                  </p>
                  {transcript && (
                    <Button
                      onClick={generateVerdictAnalysis}
                      disabled={isGeneratingAnalysis}
                      className="neon-glow"
                    >
                      {isGeneratingAnalysis ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate Analysis
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}