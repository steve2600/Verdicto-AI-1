// ... keep existing imports
import { History, Trash2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

export default function LiveVerdict() {
  // ... keep existing state declarations
  const [showHistory, setShowHistory] = useState(false);

  // ... keep existing hooks
  const createLiveVerdict = useMutation(api.liveVerdicts.create);
  const verdictHistory = useQuery(api.liveVerdicts.list);
  const deleteVerdict = useMutation(api.liveVerdicts.deleteVerdict);

  // ... keep existing useEffect and other functions until analyzeVerdict

  const analyzeVerdict = async () => {
    if (!transcript.trim()) {
      toast.error("No transcript to analyze");
      return;
    }

    setIsAnalyzing(true);
    try {
      toast.info("Analyzing proceedings...");
      
      const queryId = await createQuery({
        queryText: `Analyze the following court proceedings and provide: 1) A verdict determination, 2) Legal conclusion with reasoning, 3) Recommended punishment or sentence if applicable. Proceedings: ${transcript}`,
        uploadedFiles: undefined,
      });

      const result = await analyzeWithRAG({
        queryId,
        queryText: `Analyze the following court proceedings and provide: 1) A verdict determination, 2) Legal conclusion with reasoning, 3) Recommended punishment or sentence if applicable. Proceedings: ${transcript}`,
        documentIds: undefined,
      });

      const analysisData = {
        verdict: extractVerdict(result.response),
        conclusion: extractConclusion(result.response),
        punishment: extractPunishment(result.response),
        fullAnalysis: result.response,
        confidence: result.predictionId ? 0.85 : 0.75,
      };

      setVerdictAnalysis(analysisData);

      // Save to history
      await createLiveVerdict({
        transcript: transcript,
        verdict: analysisData.verdict,
        conclusion: analysisData.conclusion,
        punishment: analysisData.punishment,
        fullAnalysis: analysisData.fullAnalysis,
        confidence: analysisData.confidence,
      });

      toast.success("Verdict analysis complete and saved to history");
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Failed to analyze verdict");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDeleteVerdict = async (verdictId: any) => {
    try {
      await deleteVerdict({ verdictId });
      toast.success("Verdict deleted from history");
    } catch (error) {
      toast.error("Failed to delete verdict");
    }
  };

  // ... keep existing helper functions (extractVerdict, extractConclusion, extractPunishment)

  return (
    <div className="min-h-screen bg-background p-6">
      {/* ... keep existing header and content until the "Analyze Verdict" button section */}

          <div className="flex gap-4">
            <Button
              onClick={analyzeVerdict}
              disabled={!transcript || isAnalyzing}
              className="flex-1"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Gavel className="h-4 w-4 mr-2" />
                  Analyze Verdict
                </>
              )}
            </Button>

            <Dialog open={showHistory} onOpenChange={setShowHistory}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <History className="h-4 w-4 mr-2" />
                  History
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>Live Verdict History</DialogTitle>
                  <DialogDescription>
                    View your past verdict analyses
                  </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                  {!verdictHistory || verdictHistory.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No verdict history yet. Analyze a transcript to get started.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {verdictHistory.map((item) => (
                        <Card key={item._id} className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                {format(item.recordedAt, "MMM dd, yyyy HH:mm")}
                              </Badge>
                              <Badge>
                                {Math.round(item.confidence * 100)}% Confidence
                              </Badge>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteVerdict(item._id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>

                          <div className="space-y-3">
                            <div>
                              <h4 className="text-sm font-semibold text-foreground mb-1">
                                Verdict
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {item.verdict}
                              </p>
                            </div>

                            <div>
                              <h4 className="text-sm font-semibold text-foreground mb-1">
                                Conclusion
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {item.conclusion}
                              </p>
                            </div>

                            <div>
                              <h4 className="text-sm font-semibold text-foreground mb-1">
                                Punishment/Sentence
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {item.punishment}
                              </p>
                            </div>

                            <details className="mt-2">
                              <summary className="text-sm font-semibold text-foreground cursor-pointer">
                                View Transcript
                              </summary>
                              <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                                {item.transcript}
                              </p>
                            </details>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>

      {/* ... keep existing verdict analysis display section and rest of the component */}
