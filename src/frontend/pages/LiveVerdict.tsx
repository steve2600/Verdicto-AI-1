import React, { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mic, MicOff, Upload, Loader2, FileText, Sparkles, CheckCircle2 } from "lucide-react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { motion } from "framer-motion";

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

  // Document upload/selection states
  const [selectedDocumentId, setSelectedDocumentId] = useState<Id<"documents"> | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Analysis states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  // Convex hooks
  const documents = useQuery(api.documents.list, { documentType: "library", status: "processed" });
  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const createDocument = useMutation(api.documents.create);
  const processDocumentWithRAG = useAction(api.rag.processDocument);
  const analyzeWithRAG = useAction(api.rag.analyzeQuery);
  const createQuery = useMutation(api.queries.create);

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

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    
    setIsUploading(true);
    try {
      // Validate file
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 10MB limit`);
        return;
      }
      
      if (!file.type.includes('pdf') && !file.name.endsWith('.pdf')) {
        toast.error(`${file.name} is not a PDF file`);
        return;
      }
      
      toast.info(`Uploading ${file.name}...`);
      
      // Step 1: Get upload URL
      const uploadUrl = await generateUploadUrl();
      
      // Step 2: Upload file to Convex storage
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      
      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload ${file.name}`);
      }
      
      const { storageId } = await uploadResponse.json();
      
      // Step 3: Create document record
      const documentId = await createDocument({
        title: file.name,
        jurisdiction: "General",
        fileId: storageId,
        documentType: "library",
        metadata: {
          documentType: "legal_document",
          version: "1.0",
          fileSize: file.size,
        },
      });
      
      toast.success(`${file.name} uploaded successfully`);
      
      // Step 4: Process with RAG backend
      toast.info(`Processing ${file.name} with AI...`);
      await processDocumentWithRAG({
        documentId,
        fileUrl: storageId,
        title: file.name,
      });
      
      toast.success(`${file.name} processed and ready for analysis`);
      setSelectedDocumentId(documentId);
      
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload document. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAnalyze = async () => {
    const textToAnalyze = analysisMode === "judge" ? transcript : queryText;
    
    if (!textToAnalyze.trim()) {
      toast.error(`Please enter ${analysisMode === "judge" ? "proceedings" : "a question"}`);
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);
    
    try {
      // Create query
      const queryId = await createQuery({ 
        queryText: textToAnalyze,
        uploadedFiles: undefined
      });
      
      // Analyze with RAG backend
      const result = await analyzeWithRAG({ 
        queryId, 
        queryText: textToAnalyze,
        documentIds: selectedDocumentId ? [selectedDocumentId] : undefined,
        userMode: "lawyer"
      });
      
      setAnalysisResult(result);
      toast.success("Analysis complete!");
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl md:text-4xl font-light tracking-tight text-foreground mb-2">
          Live Verdict
        </h1>
        <p className="text-muted-foreground">
          AI-powered verdict analysis constrained to Indian legal context
        </p>
      </motion.div>

      {/* Mode Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-3 mb-6"
      >
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
      </motion.div>

      {/* Document Upload/Selection Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="macos-card p-6 mb-6">
          <h3 className="text-lg font-medium mb-4">Upload Case Documents (Optional)</h3>
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant="outline"
              className="macos-vibrancy"
              disabled={isUploading}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.pdf';
                input.onchange = async (e: any) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    await handleFileUpload(file);
                  }
                };
                input.click();
              }}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Document
                </>
              )}
            </Button>

            <div className="flex-1 min-w-[200px]">
              <Select 
                value={selectedDocumentId || "none"} 
                onValueChange={(val) => {
                  if (val === "none") {
                    setSelectedDocumentId(null);
                  } else {
                    setSelectedDocumentId(val as Id<"documents">);
                  }
                }}
              >
                <SelectTrigger className="w-full macos-vibrancy">
                  <FileText className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Select processed document or use Constitution of India" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Use Constitution of India (default)</SelectItem>
                  {documents?.map((doc: any) => (
                    <SelectItem key={doc._id} value={doc._id}>
                      {doc.title} ({doc.jurisdiction})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedDocumentId && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Document selected
              </Badge>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Live Transcript / Query Input */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="macos-card p-6">
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
                        <MicOff className="h-4 w-4 mr-2 animate-pulse text-red-500" />
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
                  className="min-h-[400px] max-h-[600px] resize-none font-light macos-vibrancy"
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
                className="min-h-[400px] max-h-[600px] resize-none font-light macos-vibrancy"
                style={{ fontFamily: "'Inter', sans-serif" }}
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
              />
            )}

            <Separator className="my-4" />

            <div className="flex gap-2">
              <Button
                onClick={handleAnalyze}
                disabled={isAnalyzing || (analysisMode === "judge" ? !transcript.trim() : !queryText.trim())}
                className="flex-1 neon-glow"
              >
                {isAnalyzing ? (
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

              {analysisResult && analysisMode === "judge" && (
                <Button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  variant="outline"
                  className="macos-vibrancy"
                >
                  Reanalyze
                </Button>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Right: AI Analysis Results */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="macos-card p-6">
            <h2 className="text-lg font-medium text-foreground mb-4">AI Analysis</h2>
            
            {isAnalyzing && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Analyzing with AI...</p>
              </div>
            )}

            {!isAnalyzing && !analysisResult && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-medium mb-2">Ready to Analyze</h3>
                <p className="text-sm text-muted-foreground">
                  {analysisMode === "judge" 
                    ? "Enter proceedings and click Analyze to get AI verdict determination"
                    : "Enter your legal question and click Analyze to get AI insights"}
                </p>
              </div>
            )}

            {analysisResult && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="macos-vibrancy p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">
                      {analysisMode === "judge" ? "Verdict Determination" : "Analysis Result"}
                    </h3>
                    {analysisResult.confidence && (
                      <Badge variant="secondary">
                        {Math.round(analysisResult.confidence * 100)}% confidence
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">
                    {analysisResult.prediction || analysisResult.answer || "Analysis complete"}
                  </p>
                </div>

                {analysisResult.reasoning && (
                  <div className="macos-vibrancy p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Legal Reasoning</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {analysisResult.reasoning}
                    </p>
                  </div>
                )}

                {analysisResult.bulletPoints && analysisResult.bulletPoints.length > 0 && (
                  <div className="macos-vibrancy p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Key Points</h4>
                    <ul className="space-y-2">
                      {analysisResult.bulletPoints.map((point: string, idx: number) => (
                        <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  );
}