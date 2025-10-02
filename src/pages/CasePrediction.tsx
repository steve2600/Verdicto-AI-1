import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Upload,
  Send,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  FileText,
  TrendingUp,
  Info,
} from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";

export default function CasePrediction() {
  const [queryText, setQueryText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentQueryId, setCurrentQueryId] = useState<Id<"queries"> | null>(null);

  const createQuery = useMutation(api.queries.create);
  const mockAnalysis = useMutation(api.predictions.mockAnalysis);
  const prediction = useQuery(
    api.predictions.getByQuery,
    currentQueryId ? { queryId: currentQueryId } : "skip"
  );
  const biasReport = useQuery(
    api.biasReports.getByPrediction,
    prediction ? { predictionId: prediction._id } : "skip"
  );
  const cases = useQuery(api.cases.list, {});

  const handleSubmit = async () => {
    if (!queryText.trim()) {
      toast.error("Please enter a query");
      return;
    }

    setIsAnalyzing(true);
    try {
      const queryId = await createQuery({ queryText });
      setCurrentQueryId(queryId);
      
      await mockAnalysis({ queryId });
      
      toast.success("Analysis complete!");
    } catch (error) {
      toast.error("Analysis failed. Please try again.");
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "low":
        return "text-green-500";
      case "medium":
        return "text-yellow-500";
      case "high":
        return "text-red-500";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto pb-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl md:text-5xl font-light mb-2 text-foreground tracking-tight" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300, letterSpacing: '-0.02em' }}>Case Prediction</h1>
        <p className="text-muted-foreground font-light" style={{ letterSpacing: '0.01em' }}>
          AI-powered legal analysis with bias detection
        </p>
      </motion.div>

      {/* Query Input Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="macos-card p-6 mb-6 neon-glow">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Describe your case or legal question
              </label>
              <Textarea
                placeholder="Ask about a case, upload documents, or describe a legal scenario..."
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                className="min-h-[120px] macos-vibrancy resize-none"
                disabled={isAnalyzing}
              />
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="macos-vibrancy"
                disabled={isAnalyzing}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Documents
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isAnalyzing || !queryText.trim()}
                className="neon-glow"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Analyze Case
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Results Section */}
      {prediction && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Prediction Card */}
          <motion.div
            whileHover={{ y: -8, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <Card className="macos-card p-6 neon-glow hover:shadow-2xl transition-shadow duration-300">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center neon-glow">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold">AI Prediction</h3>
                  <ConfidenceBadge
                    level={prediction.confidenceLevel}
                    score={prediction.confidenceScore}
                  />
                </div>
                <p className="text-muted-foreground">{prediction.prediction}</p>
              </div>
            </div>

            <Separator className="my-4" />

            {/* Confidence Score */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Confidence Score</span>
                <span className="text-2xl font-bold text-primary">
                  {Math.round(prediction.confidenceScore * 100)}%
                </span>
              </div>
              <Progress value={prediction.confidenceScore * 100} className="h-3" />
            </div>

            {/* Bias Flags */}
            {prediction.biasFlags.length > 0 && (
              <>
                <Separator className="my-4" />
                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Bias Alerts
                  </h4>
                  <div className="space-y-2">
                    {prediction.biasFlags.map((flag, index) => (
                      <div
                        key={index}
                        className="macos-vibrancy p-3 rounded-lg flex items-start gap-3"
                      >
                        <AlertTriangle
                          className={`h-5 w-5 mt-0.5 ${getSeverityColor(flag.severity)}`}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{flag.type}</span>
                            <Badge
                              variant={
                                flag.severity === "high"
                                  ? "destructive"
                                  : flag.severity === "medium"
                                  ? "default"
                                  : "secondary"
                              }
                              className="text-xs"
                            >
                              {flag.severity}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {flag.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Reasoning Drawer */}
            <Separator className="my-4" />
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="w-full macos-vibrancy">
                  <Info className="h-4 w-4 mr-2" />
                  Why this prediction?
                </Button>
              </SheetTrigger>
              <SheetContent className="macos-card w-full sm:max-w-xl">
                <SheetHeader>
                  <SheetTitle>AI Reasoning</SheetTitle>
                  <SheetDescription>
                    Explainable AI analysis for this prediction
                  </SheetDescription>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-120px)] mt-6">
                  <div className="space-y-4 pr-4">
                    <div className="macos-vibrancy p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Analysis Method</h4>
                      <p className="text-sm text-muted-foreground">
                        {prediction.reasoning}
                      </p>
                    </div>

                    {biasReport && (
                      <div className="macos-vibrancy p-4 rounded-lg">
                        <h4 className="font-medium mb-3">Bias Analysis</h4>
                        <div className="space-y-3">
                          {Object.entries(biasReport.categories).map(([key, value]) => (
                            <div key={key}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm capitalize">{key}</span>
                                <span className="text-sm font-medium">
                                  {Math.round(value * 100)}%
                                </span>
                              </div>
                              <Progress value={value * 100} className="h-2" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>
            </Card>
          </motion.div>

          {/* Evidence Panel */}
          <motion.div
            whileHover={{ y: -8, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <Card className="macos-card p-6 hover:shadow-2xl transition-shadow duration-300">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Supporting Evidence
            </h3>
            <div className="space-y-3">
              {prediction.evidenceSnippets.map((snippet, index) => {
                const relatedCase = cases?.find((c) => c._id === snippet.caseId);
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    whileHover={{ x: 4, scale: 1.02 }}
                    transition={{ delay: index * 0.1, type: "spring", stiffness: 300 }}
                    className="macos-vibrancy p-4 rounded-lg hover:bg-primary/5 cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="font-medium text-sm">
                          {relatedCase?.caseNumber || "Case Reference"}
                        </span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {Math.round(snippet.relevance * 100)}% relevant
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {relatedCase?.title}
                    </p>
                    <p className="text-sm">{snippet.snippet}</p>
                  </motion.div>
                );
              })}
            </div>
            </Card>
          </motion.div>
        </motion.div>
      )}

      {/* Empty State */}
      {!prediction && !isAnalyzing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center py-12"
        >
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 neon-glow">
            <TrendingUp className="h-10 w-10 text-primary" />
          </div>
          <h3 className="text-xl font-bold mb-2">Ready to Analyze</h3>
          <p className="text-muted-foreground">
            Enter your legal query above to get AI-powered predictions
          </p>
        </motion.div>
      )}
    </div>
  );
}