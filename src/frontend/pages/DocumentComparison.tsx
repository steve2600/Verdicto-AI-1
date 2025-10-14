import React, { useState } from "react";
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

type Conflict = {
  type: string;
  severity: "low" | "medium" | "high" | "critical" | string;
  description: string;
  affectedDocuments?: Array<{ documentId: string; page?: number; excerpt?: string }>;
  recommendation?: string;
};

export default function DocumentComparison() {
  const comparisons = useQuery(api.comparison.getUserComparisons) as any[] | undefined;
  const compareDocuments = useAction(api.comparison.compareDocuments);
  const deleteComparison = useMutation(api.comparison.deleteComparison);

  const [inputIds, setInputIds] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleCompare = async () => {
    const raw = inputIds.split(",").map((s) => s.trim()).filter(Boolean);
    if (raw.length < 2 || raw.length > 5) {
      alert("Provide 2-5 document IDs separated by commas.");
      return;
    }
    try {
      setSubmitting(true);
      const docIds = raw.map((id) => id as unknown as Id<"documents">);
      await compareDocuments({ documentIds: docIds });
      setInputIds("");
    } catch (e) {
      console.error(e);
      alert("Comparison failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: Id<"documentComparisons">) => {
    try {
      await deleteComparison({ comparisonId: id });
    } catch (e) {
      console.error(e);
      alert("Delete failed.");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-semibold text-foreground">Document Comparison</h1>

      <div className="rounded-lg border border-white/10 bg-white/5 backdrop-blur p-4">
        <h2 className="text-lg font-medium mb-3 text-foreground">Run a new comparison</h2>
        <p className="text-sm text-muted-foreground mb-2">
          Paste 2-5 processed document IDs separated by commas.
        </p>
        <div className="flex items-center gap-2">
          <input
            className="flex-1 rounded-md border border-white/10 bg-transparent px-3 py-2 text-sm outline-none"
            placeholder="docId1, docId2, docId3"
            value={inputIds}
            onChange={(e) => setInputIds(e.target.value)}
          />
          <button
            onClick={handleCompare}
            disabled={submitting}
            className="rounded-md bg-foreground text-background px-4 py-2 text-sm disabled:opacity-50"
          >
            {submitting ? "Comparing..." : "Compare"}
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/5 backdrop-blur p-4">
        <h2 className="text-lg font-medium mb-3 text-foreground">History</h2>

        {!comparisons ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : comparisons.length === 0 ? (
          <div className="text-sm text-muted-foreground">No comparisons yet.</div>
        ) : (
          <ul className="space-y-4">
            {comparisons.map((comp: any) => (
              <li key={comp._id} className="rounded-md border border-white/10 p-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="text-foreground font-medium truncate">
                      {(comp.documentTitles || []).join(" • ")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(comp.comparisonDate).toLocaleString()} • Status: {comp.status}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-sm">
                      Risk: <span className="font-semibold">{comp.overallRiskScore ?? 0}</span>
                    </div>
                    <button
                      onClick={() => handleDelete(comp._id)}
                      className="rounded-md border border-white/10 px-3 py-1.5 text-xs hover:bg-white/10"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {Array.isArray(comp.conflicts) && comp.conflicts.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {comp.conflicts.map((c: Conflict, idx: number) => (
                      <div key={idx} className="rounded bg-black/10 p-3">
                        <div className="text-sm font-medium text-foreground">
                          {c.type} • {c.severity}
                        </div>
                        <div className="text-sm text-muted-foreground">{c.description}</div>
                        {Array.isArray(c.affectedDocuments) && c.affectedDocuments.length > 0 && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            Affects {c.affectedDocuments.length} document(s)
                          </div>
                        )}
                        {c.recommendation && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            Recommendation: {c.recommendation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No detailed conflicts parsed.</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}