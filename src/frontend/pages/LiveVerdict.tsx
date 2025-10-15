import React, { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Trash2, FileText, Sparkles, Loader2, Upload, Scale, HelpCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

type AnalysisMode = "judge" | "query";

export default function LiveVerdict() {
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [liveWords, setLiveWords] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [verdictAnalysis, setVerdictAnalysis] = useState<any>(null);
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>("judge");
  const [queryText, setQueryText] = useState("");
  const [selectedDocumentId, setSelectedDocumentId] = useState<Id<"documents"> | undefined>(undefined);
  const [isUploading, setIsUploading] = useState(false);

  // Convex hooks
  const documents = useQuery(api.documents.list, {});
  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const createDocument = useMutation(api.documents.create);
  const processDocumentWithRAG = useAction(api.rag.processDocument);
  const analyzeWithRAG = useAction(api.rag.analyzeQuery);
  const createQuery = useMutation(api.queries.create);

  const processedDocuments = documents?.filter(doc => doc.status === "processed") || [];

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
    toast.success("Transcript cleared");
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.includes("pdf")) {
      toast.error("Please upload a PDF file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setIsUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadResponse.ok) throw new Error("Upload failed");

      const { storageId } = await uploadResponse.json();
      const documentId = await createDocument({
        title: file.name,
        fileId: storageId,
        jurisdiction: "India",
        documentType: "library",
      });

      toast.success("Document uploaded, processing...");
      await processDocumentWithRAG({
        documentId,
        fileUrl: storageId,
        title: file.name,
      });

      setSelectedDocumentId(documentId);
      toast.success("Document processed successfully");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload document");
    } finally {
      setIsUploading(false);
    }
  };

  const generateVerdictAnalysis = async () => {
    const textToAnalyze = analysisMode === "judge" ? transcript : queryText;
    
    if (!textToAnalyze.trim()) {
      toast.error(analysisMode === "judge" ? "No transcript available to analyze" : "Please enter a query");
      return;
    }

    setIsGeneratingAnalysis(true);
    try {
      // Create query record
      const queryId = await createQuery({
        queryText: textToAnalyze,
      });

      // Analyze with RAG backend using Groq LLM
      const result = await analyzeWithRAG({
        queryId,
        queryText: textToAnalyze,
        documentIds: selectedDocumentId ? [selectedDocumentId] : undefined,
        userMode: "lawyer", // Always use lawyer mode for detailed analysis
      });

      setVerdictAnalysis({
        verdict: result.response || "Analysis complete",
        reasoning: result.response || "No detailed reasoning available",
        confidence: 0.85,
        mode: analysisMode,
      });

      toast.success("Analysis generated successfully");
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
          AI-powered legal analysis constrained to Indian jurisdiction and Constitution of India
        </p>
      </motion.div>

      {/* Mode Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <Card className="macos-card p-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-foreground">Analysis Mode:</span>
            <div className="flex gap-2">
              <Button
                variant={analysisMode === "judge" ? "default" : "outline"}
                onClick={() => setAnalysisMode("judge")}
                className="neon-glow"
              >
                <Scale className="h-4 w-4 mr-2" />
                Judge Mode
              </Button>
              <Button
                variant={analysisMode === "query" ? "default" : "outline"}
                onClick={() => setAnalysisMode("query")}
                className="neon-glow"
              >
                <HelpCircle className="h-4 w-4 mr-2" />
                Query Mode
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Document Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <Card className="macos-card p-4">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <span className="text-sm font-medium text-foreground">Context Document:</span>
            <div className="flex-1 flex gap-2">
              <Select
                value={selectedDocumentId || "none"}
                onValueChange={(value) => setSelectedDocumentId(value === "none" ? undefined : value as Id<"documents">)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Use Constitution of India (default)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Constitution of India (default)</SelectItem>
                  {processedDocuments.map((doc) => (
                    <SelectItem key={doc._id} value={doc._id}>
                      {doc.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <label htmlFor="file-upload">
                <Button variant="outline" disabled={isUploading} asChild>
                  <span>
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Upload PDF
                  </span>
                </Button>
              </label>
              <input
                id="file-upload"
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
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
                <h2 className="text-xl font-medium text-foreground">
                  {analysisMode === "judge" ? "Live Transcript" : "Legal Query"}
                </h2>
              </div>
              {analysisMode === "judge" && (
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
              )}
            </div>
            <Separator className="my-4" />
            <div className="min-h-[400px] max-h-[600px] overflow-y-auto">
              {analysisMode === "judge" ? (
                <Textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Live transcript will appear here... You can also type or edit manually."
                  className="min-h-[400px] resize-none border-0 focus-visible:ring-0 bg-transparent text-foreground"
                />
              ) : (
                <Textarea
                  value={queryText}
                  onChange={(e) => setQueryText(e.target.value)}
                  placeholder="Enter your legal question here... Example: 'I am a poor farmer and the government wants to take away my land. What is the probability of winning if I file a case?'"
                  className="min-h-[400px] resize-none border-0 focus-visible:ring-0 bg-transparent text-foreground"
                />
              )}
              {analysisMode === "judge" && liveWords.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
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
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Analysis Section */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="macos-card p-6 neon-glow">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center neon-glow">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-medium text-foreground">AI Analysis</h2>
            </div>
            <Separator className="my-4" />
            <div className="min-h-[400px] p-4 rounded-lg macos-vibrancy border border-border space-y-4">
              {verdictAnalysis ? (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-foreground">
                        {verdictAnalysis.mode === "judge" ? "Verdict Determination" : "Legal Analysis"}
                      </h4>
                      <Badge variant="secondary">
                        {Math.round((verdictAnalysis.confidence ?? 0.85) * 100)}% confidence
                      </Badge>
                    </div>
                    <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
                      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                        {verdictAnalysis.verdict}
                      </p>
                    </div>
                  </div>
                  {analysisMode === "judge" && (
                    <Button
                      onClick={generateVerdictAnalysis}
                      disabled={isGeneratingAnalysis}
                      className="w-full neon-glow"
                      variant="outline"
                    >
                      {isGeneratingAnalysis ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Reanalyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Reanalyze
                        </>
                      )}
                    </Button>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 neon-glow">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-muted-foreground font-light mb-4">
                    {analysisMode === "judge" 
                      ? "Record or type proceedings to generate verdict analysis" 
                      : "Enter your legal question to get AI-powered analysis"}
                  </p>
                  <Button
                    onClick={generateVerdictAnalysis}
                    disabled={isGeneratingAnalysis || (analysisMode === "judge" ? !transcript : !queryText)}
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
                        Analyze
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
