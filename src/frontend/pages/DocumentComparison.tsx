import React, { useState } from "react";
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, FileText, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

type Conflict = {
  type: string;
  severity: "low" | "medium" | "high" | "critical" | string;
  description: string;
  affectedDocuments?: Array<{ documentId: string; page?: number; excerpt?: string }>;
  recommendation?: string;
};

export default function DocumentComparison() {
  const documents = useQuery(api.documents.list, {});
  const comparisons = useQuery(api.comparison.getUserComparisons) as any[] | undefined;

  const compareDocuments = useAction(api.comparison.compareDocuments);
  const deleteComparison = useMutation(api.comparison.deleteComparison);

  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const processedDocs = documents?.filter((doc) => doc.status === "processed") || [];

  const toggleDocSelection = (docId: string) => {
    const newSet = new Set(selectedDocIds);
    if (newSet.has(docId)) {
      newSet.delete(docId);
    } else {
      if (newSet.size >= 5) {
        toast.error("Maximum 5 documents can be compared at once");
        return;
      }
      newSet.add(docId);
    }
    setSelectedDocIds(newSet);
  };

  const handleCompare = async () => {
    if (selectedDocIds.size < 2) {
      toast.error("Please select at least 2 documents to compare");
      return;
    }
    if (selectedDocIds.size > 5) {
      toast.error("Maximum 5 documents can be compared at once");
      return;
    }

    try {
      setSubmitting(true);
      const docIds = Array.from(selectedDocIds).map((id) => id as unknown as Id<"documents">);
      await compareDocuments({ documentIds: docIds });
      setSelectedDocIds(new Set());
      toast.success("Comparison complete!");
    } catch (e) {
      console.error(e);
      toast.error("Comparison failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: Id<"documentComparisons">) => {
    try {
      await deleteComparison({ comparisonId: id });
      toast.success("Comparison deleted successfully");
    } catch (e: any) {
      console.error("Delete error:", e);
      toast.error(e?.message || "Failed to delete comparison");
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500/20 text-red-500 border-red-500/50";
      case "high":
        return "bg-orange-500/20 text-orange-500 border-orange-500/50";
      case "medium":
        return "bg-yellow-500/20 text-yellow-500 border-yellow-500/50";
      case "low":
        return "bg-green-500/20 text-green-500 border-green-500/50";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-semibold text-foreground mb-2">Document Comparison</h1>
        <p className="text-muted-foreground">
          Compare multiple legal documents to identify conflicts, inconsistencies, and missing clauses
        </p>
      </div>

      {/* Document Selection */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-medium text-foreground">Select Documents to Compare</h2>
            <p className="text-sm text-muted-foreground mt-1">Choose 2-5 processed documents ({selectedDocIds.size} selected)</p>
          </div>
          <Button onClick={handleCompare} disabled={submitting || selectedDocIds.size < 2 || selectedDocIds.size > 5} className="gap-2">
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Comparing...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                Compare Selected
              </>
            )}
          </Button>
        </div>

        <ScrollArea className="h-[400px] pr-4">
          {processedDocs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No processed documents available</p>
              <p className="text-sm mt-1">Upload and process documents first</p>
            </div>
          ) : (
            <div className="space-y-2">
              {processedDocs.map((doc) => (
                <label
                  key={doc._id}
                  className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedDocIds.has(doc._id)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  }`}
                >
                  <Checkbox
                    checked={selectedDocIds.has(doc._id)}
                    onCheckedChange={() => toggleDocSelection(doc._id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="h-4 w-4 flex-shrink-0 text-primary" />
                      <span className="font-medium text-foreground truncate">{doc.title}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary" className="text-xs">
                        {doc.jurisdiction}
                      </Badge>
                      <span>•</span>
                      <span>{new Date(doc.uploadDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </ScrollArea>
      </Card>

      {/* Comparison History */}
      <Card className="p-6">
        <h2 className="text-lg font-medium mb-4 text-foreground">Comparison History</h2>

        {!comparisons ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading...
          </div>
        ) : comparisons.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No comparisons yet</p>
            <p className="text-sm mt-1">Select documents above to create your first comparison</p>
          </div>
        ) : (
          <div className="space-y-4">
            {comparisons.map((comp: any) => (
              <Card key={comp._id} className="p-4 border-border">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 flex-shrink-0 text-primary" />
                      <span className="font-medium text-foreground truncate">{(comp.documentTitles || []).join(" • ")}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{new Date(comp.comparisonDate).toLocaleString()}</span>
                      <span>•</span>
                      <Badge variant="secondary" className="text-xs">
                        {comp.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground mb-1">Risk Score</div>
                      <Badge
                        className={getSeverityColor(
                          comp.overallRiskScore >= 70
                            ? "critical"
                            : comp.overallRiskScore >= 50
                            ? "high"
                            : comp.overallRiskScore >= 30
                            ? "medium"
                            : "low"
                        )}
                      >
                        {comp.overallRiskScore ?? 0}
                      </Badge>
                    </div>
                    <Button onClick={() => handleDelete(comp._id)} variant="outline" size="sm" className="gap-2">
                      Delete
                    </Button>
                  </div>
                </div>

                {Array.isArray(comp.conflicts) && comp.conflicts.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    <div className="text-sm font-medium text-foreground mb-2">
                      {comp.conflicts.length} Conflict{comp.conflicts.length !== 1 ? "s" : ""} Detected
                    </div>

                    {comp.conflicts.map((c: Conflict, idx: number) => (
                      <div key={idx} className="rounded-lg border border-border bg-muted/30 p-3">
                        <div className="flex items-start gap-2 mb-2">
                          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5 text-orange-500" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-foreground capitalize">{c.type.replace(/_/g, " ")}</span>
                              <Badge className={getSeverityColor(c.severity)} variant="outline">
                                {c.severity}
                              </Badge>
                            </div>

                            <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{c.description}</p>

                            {Array.isArray(c.affectedDocuments) && c.affectedDocuments.length > 0 && (
                              <div className="mt-2 text-xs text-muted-foreground">
                                Affects {c.affectedDocuments.length} document(s)
                                {c.affectedDocuments[0]?.page && ` • Page ${c.affectedDocuments[0].page}`}
                              </div>
                            )}

                            {c.recommendation && (
                              <div className="mt-2 text-xs text-primary">
                                💡 {c.recommendation}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground mt-3">No detailed conflicts detected</div>
                )}
              </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}