import { v } from "convex/values";
import { action, mutation, query, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const RAG_BACKEND_URL = process.env.RAG_BACKEND_URL || "https://verdicto-ai-1-production-3dbc.up.railway.app";

/**
 * Compare multiple documents and detect conflicts
 */
export const compareDocuments = action({
  args: {
    documentIds: v.array(v.id("documents")),
  },
  handler: async (ctx, args): Promise<any> => {
    try {
      const userId = await getAuthUserId(ctx);
      if (!userId) throw new Error("Not authenticated");

      // Create comparison record
      const comparisonId = await ctx.runMutation(internal.comparison.createComparisonInternal, {
        userId,
        documentIds: args.documentIds,
      });

      // Get document contents
      const documents = [];
      for (const docId of args.documentIds) {
        const doc = await ctx.runQuery(internal.documents.getByIdInternal, {
          documentId: docId,
        });
        if (doc) {
          const fileUrl = await ctx.storage.getUrl(doc.fileId);
          documents.push({
            id: docId,
            title: doc.title,
            fileUrl,
            chunks: doc.chunks || [],
          });
        }
      }

      // Call RAG backend for comparison analysis
      const response = await fetch(`${RAG_BACKEND_URL}/api/v1/documents/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer 8ad62148045cbf8137a66e1d8c0974e14f62a970b4fa91afb850f461abfbadb8",
        },
        body: JSON.stringify({
          query: `You are a legal document comparison expert. Analyze these ${documents.length} legal documents and identify ALL conflicts, inconsistencies, and discrepancies.

DOCUMENTS TO COMPARE:
${documents.map((d, i) => `[Document ${i}] ${d.title}`).join('\n')}

ANALYSIS REQUIRED:
For EACH conflict you find, you MUST provide:

1. CONTRADICTIONS: Direct opposing statements
   Example: "Document A states X, but Document B states NOT X"

2. INCONSISTENCIES: Different values, terms, or definitions
   Example: "Payment term is 30 days in Doc A but 45 days in Doc B"

3. MISSING CLAUSES: Important clauses present in some but not others
   Example: "Liability clause exists in Doc A but missing in Doc B"

4. CONFLICTING TERMS: Different interpretations or conditions
   Example: "Termination notice period differs: 60 days vs 90 days"

REQUIRED OUTPUT FORMAT (JSON):
{
  "conflicts": [
    {
      "type": "contradiction|inconsistency|missing_clause|conflicting_terms",
      "severity": "critical|high|medium|low",
      "description": "SPECIFIC description of what conflicts and WHERE",
      "affectedDocuments": [
        {
          "documentIndex": 0,
          "page": 1,
          "excerpt": "EXACT text from document showing the conflict"
        }
      ],
      "recommendation": "Specific action to resolve this conflict"
    }
  ],
  "overallRiskScore": 0-100
}

BE SPECIFIC: Include exact clauses, page numbers, and text excerpts that conflict.
COMPARE THOROUGHLY: Check dates, amounts, terms, conditions, parties, obligations, and rights.
PRIORITIZE: Mark critical conflicts that could cause legal issues.`,
        }),
      });

      if (!response.ok) {
        throw new Error(`RAG backend error: ${response.statusText}`);
      }

      const result = await response.json();
      const ragResponse = result.answer || "";

      // Parse conflicts from response
      const { conflicts, overallRiskScore } = parseConflicts(ragResponse, documents);

      // Update comparison with results
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
    } catch (error) {
      console.error("Document comparison error:", error);
      throw new Error(`Failed to compare documents: ${error}`);
    }
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

    // Get document details
    const documents = [];
    for (const docId of comparison.documentIds) {
      const doc = await ctx.db.get(docId);
      if (doc) {
        documents.push({
          _id: doc._id,
          title: doc.title,
          jurisdiction: doc.jurisdiction,
        });
      }
    }

    return {
      ...comparison,
      documents,
    };
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

    // Get document titles for each comparison
    const enrichedComparisons = [];
    for (const comp of comparisons) {
      const documents = [];
      for (const docId of comp.documentIds) {
        const doc = await ctx.db.get(docId);
        if (doc) documents.push(doc.title);
      }
      enrichedComparisons.push({
        ...comp,
        documentTitles: documents,
      });
    }

    return enrichedComparisons.sort((a, b) => b.comparisonDate - a.comparisonDate);
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
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.comparisonId, {
      conflicts: args.conflicts,
      overallRiskScore: args.overallRiskScore,
      status: args.status,
    });
  },
});

// Helper function to parse conflicts from RAG response
function parseConflicts(response: string, documents: any[]): { conflicts: any[], overallRiskScore: number } {
  let conflicts: any[] = [];
  let overallRiskScore = 0;

  try {
    // Try to parse as JSON first
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      conflicts = (parsed.conflicts || []).map((conflict: any) => ({
        type: conflict.type || "inconsistency",
        severity: conflict.severity || "medium",
        description: conflict.description || "",
        affectedDocuments: (conflict.affectedDocuments || []).map((doc: any) => ({
          documentId: documents[doc.documentIndex]?.id || documents[0]?.id,
          page: doc.page || 1,
          excerpt: doc.excerpt || "",
        })),
        recommendation: conflict.recommendation || "Review and resolve manually",
      }));
      overallRiskScore = parsed.overallRiskScore || 50;
    }
  } catch (e) {
    // JSON parsing failed, try text-based extraction
    console.log("JSON parsing failed, attempting text extraction");
  }

  // If JSON parsing failed, try to extract conflicts from text
  if (conflicts.length === 0 && response.length > 100) {
    // Look for conflict indicators in the text
    const conflictPatterns = [
      /contradiction|contradicts|conflicting/gi,
      /inconsistency|inconsistent|differs/gi,
      /missing|absent|lacks/gi,
      /conflict|dispute|disagreement/gi
    ];

    const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const detectedConflicts: any[] = [];

    sentences.forEach((sentence, idx) => {
      for (const pattern of conflictPatterns) {
        if (pattern.test(sentence)) {
          let type = "inconsistency";
          let severity: "low" | "medium" | "high" | "critical" = "medium";

          if (/contradiction|contradicts/i.test(sentence)) {
            type = "contradiction";
            severity = "high";
          } else if (/missing|absent|lacks/i.test(sentence)) {
            type = "missing_clause";
            severity = "medium";
          } else if (/conflict|conflicting/i.test(sentence)) {
            type = "conflicting_terms";
            severity = "high";
          }

          // Extract page numbers if mentioned
          const pageMatch = sentence.match(/page\s+(\d+)/i);
          const page = pageMatch ? parseInt(pageMatch[1]) : 1;

          detectedConflicts.push({
            type,
            severity,
            description: sentence.trim(),
            affectedDocuments: documents.slice(0, 2).map((d, i) => ({
              documentId: d.id,
              page: page + i,
              excerpt: sentence.substring(0, 150).trim(),
            })),
            recommendation: `Review ${type.replace(/_/g, ' ')} and ensure consistency across documents`,
          });

          break; // Only match once per sentence
        }
      }
    });

    if (detectedConflicts.length > 0) {
      conflicts = detectedConflicts.slice(0, 10); // Limit to 10 conflicts
      // Calculate risk score based on severity
      const severityScores = { low: 10, medium: 25, high: 40, critical: 60 };
      overallRiskScore = Math.min(
        100,
        conflicts.reduce((sum, c) => sum + (severityScores[c.severity as keyof typeof severityScores] || 25), 0)
      );
    }
  }

  // If still no conflicts found, try to extract from plain text response
  if (conflicts.length === 0 && response.length > 50) {
    const lines = response.split('\n').filter(line => line.trim().length > 20);
    const extractedConflicts: any[] = [];
    
    // Look for numbered lists or bullet points describing conflicts
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      
      // Check if line describes a conflict
      if (/document\s+[A-Z0-9]|doc\s+[A-Z0-9]|\[document\s+\d+\]|\[doc\s+\d+\]/i.test(trimmed)) {
        let type = "inconsistency";
        let severity: "low" | "medium" | "high" | "critical" = "medium";
        
        // Determine type and severity from keywords
        if (/contradict|opposite|conflict/i.test(trimmed)) {
          type = "contradiction";
          severity = "high";
        } else if (/missing|absent|lack|not found/i.test(trimmed)) {
          type = "missing_clause";
          severity = "medium";
        } else if (/differ|different|varies|inconsistent/i.test(trimmed)) {
          type = "inconsistency";
          severity = /critical|severe|major/i.test(trimmed) ? "high" : "medium";
        } else if (/term|condition|clause/i.test(trimmed)) {
          type = "conflicting_terms";
          severity = "medium";
        }
        
        // Extract page numbers if mentioned
        const pageMatches = trimmed.match(/page\s+(\d+)/gi);
        const pages = pageMatches ? pageMatches.map(m => parseInt(m.match(/\d+/)![0])) : [1];
        
        // Extract document references
        const docMatches = trimmed.match(/document\s+([A-Z0-9])|doc\s+([A-Z0-9])|\[document\s+(\d+)\]/gi);
        
        extractedConflicts.push({
          type,
          severity,
          description: trimmed.replace(/^\d+[\.\)]\s*/, '').substring(0, 300),
          affectedDocuments: documents.slice(0, Math.min(2, documents.length)).map((d, i) => ({
            documentId: d.id,
            page: pages[i] || pages[0] || 1,
            excerpt: trimmed.substring(0, 200),
          })),
          recommendation: `Review ${type.replace(/_/g, ' ')} between documents and ensure consistency`,
        });
      }
    });
    
    if (extractedConflicts.length > 0) {
      conflicts = extractedConflicts.slice(0, 15); // Limit to 15 conflicts
      const severityScores = { low: 10, medium: 25, high: 40, critical: 60 };
      overallRiskScore = Math.min(
        100,
        conflicts.reduce((sum, c) => sum + (severityScores[c.severity as keyof typeof severityScores] || 25), 0)
      );
    } else {
      // Final fallback with more context
      const hasLegalTerms = /clause|provision|section|article|statute|agreement|contract/i.test(response);
      conflicts = [
        {
          type: "inconsistency",
          severity: "low",
          description: hasLegalTerms 
            ? "AI analysis completed. Documents contain legal terminology but specific conflicts require manual review to identify precise discrepancies."
            : "Documents compared. No major structural conflicts detected automatically. Detailed clause-by-clause review recommended for comprehensive analysis.",
          affectedDocuments: documents.map((d, i) => ({
            documentId: d.id,
            page: 1,
            excerpt: `${d.title} - Full document review required`,
          })),
          recommendation: "Conduct detailed manual comparison focusing on: dates, amounts, party names, obligations, termination clauses, and liability provisions",
        }
      ];
      overallRiskScore = 25;
    }
  }

  return { conflicts, overallRiskScore };
}