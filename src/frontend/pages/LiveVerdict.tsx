import React, { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Trash2, FileText, Sparkles, Loader2, Upload, Scale, CheckCircle2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

type AnalysisMode = "judge" | "query";

export default function LiveVerdict() {
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [liveWords, setLiveWords] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>("judge");
  const [queryText, setQueryText] = useState("");
  const [uploadedDocs, setUploadedDocs] = useState<File[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<Id<"documents"> | null>(null);

  const [verdictAnalysis, setVerdictAnalysis] = useState<any>(null);
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState(false);

  const analyzeWithRAG = useAction(api.rag.analyzeQuery);
  const createQuery = useMutation(api.queries.create);
  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const createDocument = useMutation(api.documents.create);
  const processDocumentWithRAG = useAction(api.rag.processDocument);
  const documents = useQuery(api.documents.list, {});

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
    setQueryText("");
    setUploadedDocs([]);
    toast.success("Cleared");
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const invalidFiles = fileArray.filter(
      file => file.type !== "application/pdf" || file.size > 10 * 1024 * 1024
    );

    if (invalidFiles.length > 0) {
      toast.error(`${invalidFiles.length} file(s) rejected: Only PDF files under 10MB`);
      return;
    }

    toast.info("Uploading documents...");
    
    try {
      for (const file of fileArray) {
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
        
        // Auto-select the uploaded document
        setSelectedDocumentId(documentId);
        toast.success(`${file.name} processed and selected for analysis`);
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload documents. Please try again.");
    }
  };

  const generateVerdictAnalysis = async () => {
    const textToAnalyze = analysisMode === "judge" ? transcript : queryText;
    
    if (!textToAnalyze.trim()) {
      toast.error(analysisMode === "judge" ? "No transcript available" : "Please enter your question");
      return;
    }

    setIsGeneratingAnalysis(true);
    try {
      // Create query with mode-specific prompt
      // In Judge Mode, if a document is selected, use it for context
      // Otherwise, use Constitution of India and broader knowledge
      let enhancedPrompt = "";
      
      if (analysisMode === "judge") {
        enhancedPrompt = `You are an AI legal assistant with comprehensive knowledge of Indian law, the Constitution of India, and access to legal precedents. Analyze the following court proceedings transcript and provide:

**IMPORTANT**: Base your analysis on:
- The Constitution of India (your primary reference)
- Indian Penal Code (IPC) and other relevant statutes
- Landmark Supreme Court and High Court judgments
- Established legal principles and precedents

1. **Case Type Detection**: Automatically determine if this is a criminal or civil case
2. **Verdict Determination**: Based on the proceedings and similar Indian legal precedents, determine if the defendant is:
   - Guilty or Not Guilty (for criminal cases)
   - Liable or Not Liable (for civil cases)
3. **Sentencing Recommendation**: If guilty/liable, recommend:
   - Imprisonment duration with specific IPC sections (for criminal cases)
   - Compensation/damages with legal basis (for civil cases)
4. **Legal Basis**: Cite specific:
   - Articles of the Constitution of India
   - IPC sections (for criminal cases)
   - Relevant civil law provisions
   - Landmark Supreme Court or High Court cases with case names

**Transcript:**
${textToAnalyze}

**Format your response as:**
CASE TYPE: [Criminal/Civil]
VERDICT: [Guilty/Not Guilty or Liable/Not Liable]
SENTENCING: [Details with legal references]
LEGAL BASIS: [Constitutional articles, IPC sections, landmark cases]
CONFIDENCE: [Percentage based on precedents]`;
      } else {
        enhancedPrompt = `You are an AI legal assistant with comprehensive knowledge of Indian law, the Constitution of India, and access to legal precedents. A user has asked the following legal question:

**IMPORTANT**: Base your analysis on:
- The Constitution of India (your primary reference)
- Indian Penal Code (IPC) and other relevant statutes
- Landmark Supreme Court and High Court judgments
- Established legal principles and precedents

**Question:** ${textToAnalyze}

Based on similar cases in Indian legal history and constitutional provisions, provide:

1. **Win Probability**: Calculate the percentage chance of winning this case based on precedents
2. **Similar Precedents**: List 3-5 similar cases with outcomes and citations
3. **Legal Strategy**: Recommend the best legal approach based on successful cases
4. **Relevant Laws**: Cite:
   - Applicable Constitutional articles
   - IPC sections or civil law provisions
   - Landmark cases (with case names and citations)
5. **Risk Assessment**: Potential challenges and how to address them based on case law

**Format your response as:**
WIN PROBABILITY: [Percentage]
SIMILAR CASES: [List with citations]
LEGAL STRATEGY: [Recommendations]
RELEVANT LAWS: [Constitutional articles, IPC sections, landmark cases]
RISK ASSESSMENT: [Details]`;
      }

      // Create a minimal query record
      const queryId = await createQuery({
        queryText: enhancedPrompt,
      });

      // For Judge Mode, use selected document if available
      // For Query Mode, always use broader knowledge base
      const result = await analyzeWithRAG({
        queryId,
        queryText: enhancedPrompt,
        documentIds: analysisMode === "judge" && selectedDocumentId ? [selectedDocumentId] : undefined,
        userMode: "lawyer",
      });

      // Parse the RAG response
      const response = result.response;
      
      setVerdictAnalysis({
        mode: analysisMode,
        rawResponse: response,
        confidence: 0.85,
      });

      toast.success("Analysis complete");
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
          AI-powered verdict analysis constrained to Indian legal context
        </p>
      </motion.div>

      {/* Mode Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-6"
      >
        <Card className="macos-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Scale className="h-5 w-5 text-primary" />
              <span className="font-medium">Analysis Mode</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant={analysisMode === "judge" ? "default" : "outline"}
                onClick={() => setAnalysisMode("judge")}
                className="neon-glow"
              >
                Judge Mode
              </Button>
              <Button
                variant={analysisMode === "query" ? "default" : "outline"}
                onClick={() => setAnalysisMode("query")}
                className="neon-glow"
              >
                Query Mode
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {analysisMode === "judge" 
              ? "Analyze court proceedings and determine verdict based on Indian law"
              : "Ask specific legal questions and get win probability with precedents"}
          </p>
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
              <div className="flex items-center gap-2">
                {analysisMode === "judge" && (
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
                )}
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

            {analysisMode === "judge" && (
              <div className="mb-4 space-y-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">Upload Case Documents (Optional)</label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      className="macos-vibrancy"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.pdf';
                        input.multiple = false;
                        input.onchange = (e) => handleFileUpload(e as unknown as React.ChangeEvent<HTMLInputElement>);
                        input.click();
                      }}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Document
                    </Button>
                    
                    {documents && documents.filter((d: any) => d.status === "processed").length > 0 && (
                      <Select 
                        value={selectedDocumentId || "none"} 
                        onValueChange={(val: string) => {
                          if (val === "none") {
                            setSelectedDocumentId(null);
                          } else {
                            setSelectedDocumentId(val as Id<"documents">);
                          }
                        }}
                      >
                        <SelectTrigger className="w-[300px] macos-vibrancy">
                          <FileText className="h-4 w-4 mr-2" />
                          <SelectValue placeholder="Or select existing document" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Use Constitution of India</SelectItem>
                          {documents?.filter((doc: any) => doc.status === "processed").map((doc: any) => (
                            <SelectItem key={doc._id} value={doc._id}>
                              {doc.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  {selectedDocumentId && (
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      Document selected for analysis
                    </p>
                  )}
                </div>
              </div>
            )}

            {analysisMode === "judge" ? (
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
            ) : (
              <div className="space-y-4">
                <Textarea
                  placeholder="Enter your legal question (e.g., 'I am a poor farmer and the government wants to take my land. What is the probability of winning if I file a case?')"
                  value={queryText}
                  onChange={(e) => setQueryText(e.target.value)}
                  className="min-h-[300px] macos-vibrancy"
                />
                
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <p className="text-sm text-blue-400 flex items-center gap-2">
                    <Scale className="h-4 w-4" />
                    Analysis based on the Constitution of India and established legal precedents
                  </p>
                </div>
              </div>
            )}
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
                <div className="space-y-4">
                  <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="secondary" className="mb-2">
                        {verdictAnalysis.mode === "judge" ? "Judge Mode Analysis" : "Query Mode Analysis"}
                      </Badge>
                      <Button
                        onClick={generateVerdictAnalysis}
                        disabled={isGeneratingAnalysis}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        {isGeneratingAnalysis ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Reanalyzing...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4" />
                            Reanalyze
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                      {verdictAnalysis.rawResponse}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 neon-glow">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-muted-foreground font-light mb-4">
                    {analysisMode === "judge" 
                      ? "Record proceedings and click Analyze to get AI verdict"
                      : "Enter your question and click Analyze to get win probability"}
                  </p>
                  {((analysisMode === "judge" && transcript) || (analysisMode === "query" && queryText)) && (
                    <Button
                      onClick={generateVerdictAnalysis}
                      disabled={isGeneratingAnalysis}
                      className="neon-glow"
                    >
                      {isGeneratingAnalysis ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Analyzing with AI...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Analyze
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