import { v } from "convex/values";
import { action, mutation, query, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

const RAG_BACKEND_URL =
  process.env.RAG_BACKEND_URL || "https://verdicto-ai-1-production-3dbc.up.railway.app";

/**
 * Compare multiple documents and detect conflicts
 */
export const compareDocuments = action({
  args: {
    documentIds: v.array(v.id("documents")),
  },
  handler: async (ctx, args): Promise<any> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Create comparison record (processing)
    const comparisonId = await ctx.runMutation(internal.comparison.createComparisonInternal, {
      userId,
      documentIds: args.documentIds,
    });

    // Load documents and file URLs
    const docsForQuery: Array<{ id: string; title: string }> = [];
    for (const docId of args.documentIds) {
      const doc = await ctx.runQuery(internal.documents.getByIdInternal, { documentId: docId });
      if (!doc) continue;
      // Note: we only need id + title here; RAG uses document_id for retrieval
      docsForQuery.push({ id: docId, title: doc.title });
    }

    if (docsForQuery.length < 2) {
      await ctx.runMutation(internal.comparison.updateComparisonInternal, {
        comparisonId,
        conflicts: [
          {
            type: "missing_clause",
            severity: "low",
            description:
              "Please select at least two processed documents to run a comparison.",
            affectedDocuments: docsForQuery.map((d) => ({ documentId: d.id, page: 1, excerpt: "" })),
            recommendation: "Choose 2-5 processed documents and try again.",
          },
        ],
        overallRiskScore: 10,
        status: "completed",
      });
      return {
        success: true,
        comparisonId,
        conflicts: [],
        overallRiskScore: 10,
      };
    }

    // Step 1: Query each document individually to get a structured summary
    const summaries: Array<{ index: number; id: string; title: string; summary: string }> = [];
    for (let i = 0; i < docsForQuery.length; i++) {
      const d = docsForQuery[i];
      try {
        const resp = await fetch(`${RAG_BACKEND_URL}/api/v1/documents/query`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization:
              "Bearer 8ad62148045cbf8137a66e1d8c0974e14f62a970b4fa91afb850f461abfbadb8",
          },
          body: JSON.stringify({
            query:
              "Provide a concise structured summary of this legal document. Include: 1) Parties, 2) Key definitions/terms, 3) Payment/financials, 4) Obligations/responsibilities, 5) Termination & notice, 6) Liability & indemnity, 7) Special conditions/exceptions. Keep it factual with exact numbers/dates if present.",
            document_id: d.id,
          }),
        });

        if (resp.ok) {
          const result = await resp.json();
          const summary = (result && result.answer) || "";
          summaries.push({ index: i, id: d.id, title: d.title, summary });
        }
      } catch (err) {
        console.error(`Failed to summarize ${d.title}:`, err);
      }
    }

    // Step 2: Build comparison prompt from summaries
    const comparisonPrompt = `You are a legal document comparison expert. Compare these ${summaries.length} legal documents and identify ALL conflicts, inconsistencies, and discrepancies.

DOCUMENTS TO COMPARE:
${summaries
  .map(
    (s) => `
[Document ${s.index}: ${s.title}]
${s.summary}
`
  )
  .join("\n---\n")}

ANALYSIS REQUIRED:
For EACH conflict you find, you MUST provide:
1. CONTRADICTIONS: Direct opposing statements between documents
   Example: "Document A states payment within 30 days, but Document B states 45 days"
2. INCONSISTENCIES: Different values, terms, or definitions
   Example: "Liability cap is $1M in Doc A but $500K in Doc B"
3. MISSING CLAUSES: Important clauses present in some but not others
   Example: "Force majeure clause exists in Doc A but missing in Doc B"
4. CONFLICTING TERMS: Different interpretations or conditions
   Example: "Termination notice period differs: 60 days vs 90 days"

REQUIRED OUTPUT FORMAT (JSON):
{
  "conflicts": [
    {
      "type": "contradiction|inconsistency|missing_clause|conflicting_terms",
      "severity": "critical|high|medium|low",
      "description": "SPECIFIC description of what conflicts and WHERE (include document names)",
      "affectedDocuments": [
        {
          "documentIndex": 0,
          "documentName": "Document A",
          "page": 1,
          "excerpt": "EXACT text from document showing the conflict"
        }
      ],
      "recommendation": "Specific action to resolve this conflict"
    }
  ],
  "overallRiskScore": 0-100
}

BE SPECIFIC: Include exact clauses, values, dates, and document names.
COMPARE THOROUGHLY: Check dates, amounts, terms, conditions, parties, obligations, and rights.
PRIORITIZE: Mark critical conflicts that could cause legal issues.`;

    // Step 3: Send comparison query (use first document context to ensure RAG has a collection)
    let ragResponse = "";
    try {
      const comparisonResp = await fetch(`${RAG_BACKEND_URL}/api/v1/documents/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:
            "Bearer 8ad62148045cbf8137a66e1d8c0974e14f62a970b4fa91afb850f461abfbadb8",
        },
        body: JSON.stringify({
          query: comparisonPrompt,
          document_id: docsForQuery[0].id,
        }),
      });

      if (!comparisonResp.ok) {
        throw new Error(`RAG backend error: ${comparisonResp.statusText}`);
      }
      const comparisonResult = await comparisonResp.json();
      ragResponse = (comparisonResult && comparisonResult.answer) || "";
    } catch (e: any) {
      console.error("Comparison query failed:", e?.message || e);
      ragResponse = "";
    }

    // Step 4: Parse conflicts
    const { conflicts, overallRiskScore } = parseConflicts(ragResponse, docsForQuery);

    // Step 5: Update comparison record
    await ctx.runMutation(internal.comparison.updateComparisonInternal, {
      comparisonId,
      conflicts,
      overallRiskScore,
      status: "completed",
    });

    return {
      success: true,
      comparisonId,
      conflicts,
      overallRiskScore,
    };
  },
});

/**
 * Get comparison results by ID
 */
export const getComparison = query({
  args: {
    comparisonId: v.id("documentComparisons"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const comparison = await ctx.db.get(args.comparisonId);
    if (!comparison || comparison.userId !== userId) return null;

    // Enrich with document titles
    const documents: Array<{ _id: any; title: string; jurisdiction?: string }> = [];
    for (const docId of comparison.documentIds) {
      const doc = await ctx.db.get(docId);
      if (doc) documents.push({ _id: doc._id, title: doc.title, jurisdiction: doc.jurisdiction });
    }

    return { ...comparison, documents };
  },
});

/**
 * Get all comparisons for current user
 */
export const getUserComparisons = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const comparisons = await ctx.db
      .query("documentComparisons")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const enriched: any[] = [];
    for (const c of comparisons) {
      const titles: string[] = [];
      for (const docId of c.documentIds) {
        const d = await ctx.db.get(docId);
        if (d) titles.push(d.title);
      }
      enriched.push({ ...c, documentTitles: titles });
    }

    return enriched.sort((a, b) => b.comparisonDate - a.comparisonDate);
  },
});

/**
 * Delete a comparison
 */
export const deleteComparison = mutation({
  args: {
    comparisonId: v.id("documentComparisons"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const comparison = await ctx.db.get(args.comparisonId);
    if (!comparison || comparison.userId !== userId) {
      throw new Error("Comparison not found or unauthorized");
    }
    await ctx.db.delete(args.comparisonId);
  },
});

/**
 * Internal mutation to create comparison record
 */
export const createComparisonInternal = internalMutation({
  args: {
    userId: v.id("users"),
    documentIds: v.array(v.id("documents")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("documentComparisons", {
      userId: args.userId,
      documentIds: args.documentIds,
      comparisonDate: Date.now(),
      conflicts: [],
      overallRiskScore: 0,
      status: "processing",
    });
  },
});

/**
 * Internal mutation to update comparison results
 */
export const updateComparisonInternal = internalMutation({
  args: {
    comparisonId: v.id("documentComparisons"),
    conflicts: v.any(),
    overallRiskScore: v.number(),
    status: v.union(v.literal("pending"), v.literal("processing"), v.literal("completed"), v.literal("failed")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.comparisonId, {
      conflicts: args.conflicts,
      overallRiskScore: args.overallRiskScore,
      status: args.status,
    });
  },
});

// Helper: Parse conflicts from RAG response
function parseConflicts(
  response: string,
  documents: Array<{ id: string; title: string }>
): { conflicts: any[]; overallRiskScore: number } {
  let conflicts: any[] = [];
  let overallRiskScore = 0;

  // 1) Try to parse JSON block
  try {
    const jsonMatch = response && response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const rawConflicts = Array.isArray(parsed?.conflicts) ? parsed.conflicts : [];
      conflicts = rawConflicts.map((c: any) => ({
        type: c?.type || "inconsistency",
        severity: c?.severity || "medium",
        description: c?.description || "",
        affectedDocuments: Array.isArray(c?.affectedDocuments)
          ? c.affectedDocuments.map((d: any) => ({
              documentId:
                typeof d?.documentIndex === "number" && d.documentIndex >= 0 && d.documentIndex < documents.length
                  ? documents[d.documentIndex].id
                  : documents[0]?.id,
              page: d?.page || 1,
              excerpt: d?.excerpt || "",
            }))
          : documents.slice(0, 2).map((d) => ({ documentId: d.id, page: 1, excerpt: "" })),
        recommendation: c?.recommendation || "Review and resolve manually",
      }));
      overallRiskScore = typeof parsed?.overallRiskScore === "number" ? parsed.overallRiskScore : 50;
    }
  } catch {
    // ignore JSON parse errors; fall back below
  }

  // 2) Fallback extraction if no structured conflicts
  if (conflicts.length === 0) {
    const txt = (response || "").trim();
    if (txt.length > 80) {
      const lines = txt.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
      const candidates = lines.filter((l) =>
        /(contradict|inconsisten|conflict|missing|differ|oppos)/i.test(l)
      );
      const extracted = (candidates.length ? candidates : lines.slice(0, 5)).slice(0, 10);

      conflicts = extracted.map((line) => {
        let type: "contradiction" | "inconsistency" | "missing_clause" | "conflicting_terms" = "inconsistency";
        let severity: "low" | "medium" | "high" | "critical" = "medium";
        if (/contradic|oppos/i.test(line)) {
          type = "contradiction";
          severity = "high";
        } else if (/missing|absent|lack/i.test(line)) {
          type = "missing_clause";
          severity = "medium";
        } else if (/conflict/i.test(line)) {
          type = "conflicting_terms";
          severity = "high";
        } else if (/differ|inconsisten/i.test(line)) {
          type = "inconsistency";
          severity = /critical|severe|major/i.test(line) ? "high" : "medium";
        }

        // try page
        const pageMatch = line.match(/page\s+(\d+)/i);
        const page = pageMatch ? parseInt(pageMatch[1], 10) : 1;

        return {
          type,
          severity,
          description: line.slice(0, 300),
          affectedDocuments: documents.slice(0, Math.min(2, documents.length)).map((d) => ({
            documentId: d.id,
            page,
            excerpt: line.slice(0, 160),
          })),
          recommendation: `Review ${type.replace(/_/g, " ")} and ensure consistency across documents`,
        };
      });

      const severityWeights: Record<string, number> = { low: 10, medium: 25, high: 40, critical: 60 };
      overallRiskScore = Math.min(
        100,
        conflicts.reduce((sum, c) => sum + (severityWeights[c.severity] || 25), 0)
      );
    } else {
      // Very short/empty response
      conflicts = [
        {
          type: "inconsistency",
          severity: "low",
          description:
            "Automated comparison completed. Specific conflicts were not detected confidently. Manual review is recommended.",
          affectedDocuments: documents.map((d) => ({
            documentId: d.id,
            page: 1,
            excerpt: `${d.title} - Full document review required`,
          })),
          recommendation:
            "Manually compare dates, amounts, party names, obligations, termination clauses, and liability provisions.",
        },
      ];
      overallRiskScore = 25;
    }
  }

  return { conflicts, overallRiskScore };
}