import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Mic, MicOff, Upload, FileText, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export default function LiveVerdict() {
  const [analysisMode, setAnalysisMode] = useState<"judge" | "query">("judge");
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [liveWords, setLiveWords] = useState<string[]>([]);
  const [queryInput, setQueryInput] = useState("");
  const [selectedDocumentId, setSelectedDocumentId] = useState<Id<"documents"> | undefined>();
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const documents = useQuery(api.documents.list, { status: "processed", documentType: "library" });
  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const createDocument = useMutation(api.documents.create);
  const processDocumentWithRAG = useAction(api.rag.processDocument);
  const analyzeWithRAG = useAction(api.rag.analyzeQuery);
  const createQuery = useMutation(api.queries.create);

  useEffect(() => {
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onresult = (event: any) => {
        const results = Array.from(event.results);
        const newWords: string[] = [];

        for (let i = event.resultIndex; i < results.length; i++) {
          const result = results[i] as any;
          if (result.isFinal) {
            setTranscript((prev) => prev + (prev ? " " : "") + result[0].transcript);
            setLiveWords([]);
          } else {
            newWords.push(result[0].transcript);
          }
        }

        if (newWords.length > 0) {
          setLiveWords(newWords);
        }

        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }
        silenceTimerRef.current = setTimeout(() => {
          if (liveWords.length > 0) {
            setTranscript((prev) => prev + (prev ? " " : "") + liveWords.join(" "));
            setLiveWords([]);
          }
        }, 1500);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (event.error !== "no-speech") {
          toast.error(`Speech recognition error: ${event.error}`);
        }
      };
    }

    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, [liveWords]);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      toast.error("Speech recognition not supported in this browser");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      if (liveWords.length > 0) {
        setTranscript((prev) => prev + (prev ? " " : "") + liveWords.join(" "));
        setLiveWords([]);
      }
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
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
        jurisdiction: "General",
        fileId: storageId,
        documentType: "library",
      });

      toast.success("Document uploaded, processing...");
      await processDocumentWithRAG({
        documentId,
        fileUrl: storageId,
        title: file.name,
      });

      setSelectedDocumentId(documentId);
      toast.success("Document processed successfully!");
    } catch (error) {
      toast.error("Failed to upload document");
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAnalyze = async () => {
    const textToAnalyze = analysisMode === "judge" ? transcript : queryInput;
    
    if (!textToAnalyze.trim()) {
      toast.error("Please provide text to analyze");
      return;
    }

    setIsAnalyzing(true);
    try {
      const queryId = await createQuery({
        queryText: textToAnalyze,
      });

      const result = await analyzeWithRAG({
        queryId,
        queryText: textToAnalyze,
        documentIds: selectedDocumentId ? [selectedDocumentId] : undefined,
        userMode: "lawyer",
      });

      setAnalysisResult(result);
      toast.success("Analysis complete!");
    } catch (error) {
      toast.error("Analysis failed");
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearTranscript = () => {
    setTranscript("");
    setLiveWords([]);
    setAnalysisResult(null);
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
          AI-powered verdict analysis constrained to Indian legal context
        </p>
      </motion.div>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-muted-foreground">Analysis Mode</span>
          <Button
            variant={analysisMode === "judge" ? "default" : "outline"}
            size="sm"
            onClick={() => setAnalysisMode("judge")}
          >
            Judge Mode
          </Button>
          <Button
            variant={analysisMode === "query" ? "default" : "outline"}
            size="sm"
            onClick={() => setAnalysisMode("query")}
          >
            Query Mode
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card className="macos-card p-6">
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Case Documents (Optional)
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  disabled={isUploading}
                  onClick={() => document.getElementById("file-upload")?.click()}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {isUploading ? "Uploading..." : "Upload Document"}
                </Button>
                <input
                  id="file-upload"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Select
                  value={selectedDocumentId}
                  onValueChange={(value) => setSelectedDocumentId(value as Id<"documents">)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="constitution-of-india.pdf (General)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="constitution">constitution-of-india.pdf (General)</SelectItem>
                    {documents?.map((doc) => (
                      <SelectItem key={doc._id} value={doc._id}>
                        {doc.title} ({doc.jurisdiction})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedDocumentId && (
                <Badge variant="outline" className="gap-2">
                  <FileText className="h-3 w-3" />
                  Document selected for analysis
                </Badge>
              )}
            </div>
          </Card>

          <Card className="macos-card p-6">
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Live Transcript
            </h3>
            <div className="space-y-4">
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
                  placeholder="Enter your legal query here..."
                  className="min-h-[400px] max-h-[600px] resize-none font-light"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                />
              )}
              <div className="flex items-center gap-2">
                <Button
                  variant={isRecording ? "destructive" : "default"}
                  onClick={toggleRecording}
                  className="gap-2"
                >
                  {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  {isRecording ? "Stop Proceeding" : "Start Proceeding"}
                </Button>
                <Button variant="outline" onClick={clearTranscript} className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  Clear
                </Button>
                <Button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="gap-2 ml-auto"
                >
                  <Sparkles className="h-4 w-4" />
                  {isAnalyzing ? "Analyzing..." : "Analyze"}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="macos-card p-6">
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              AI Analysis
            </h3>
            {analysisResult ? (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">
                    {analysisMode === "judge" ? "Judge Mode Analysis" : "Query Analysis"}
                  </h4>
                  {analysisMode === "judge" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAnalyze}
                      disabled={isAnalyzing}
                      className="gap-2 mb-4"
                    >
                      <Sparkles className="h-3 w-3" />
                      Reanalyze
                    </Button>
                  )}
                  <div className="glass p-4 rounded-lg">
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {analysisResult.prediction || analysisResult.answer || analysisResult.response || "No verdict available"}
                    </p>
                  </div>
                </div>
                {analysisResult.confidenceScore && (
                  <div>
                    <h4 className="font-medium mb-2">Confidence Score</h4>
                    <Badge variant="outline">
                      {Math.round(analysisResult.confidenceScore * 100)}%
                    </Badge>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <Sparkles className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">
                  {analysisMode === "judge"
                    ? "Provide court proceedings and click Analyze to get AI verdict"
                    : "Enter your legal query and click Analyze"}
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}