/**
 * Hackathon Feature Integration
 * =============================
 * 
 * Convex actions for impressive demo features:
 * - Multilingual translation
 * - Legal document generation
 * - Plain language simplification
 * - What-if simulation
 */

"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";

// Hackathon features API URL
const HACKATHON_API_URL = process.env.HACKATHON_API_URL || "http://localhost:8002";

/**
 * Translate legal query to English
 */
export const translateQuery = action({
  args: {
    text: v.string(),
    sourceLang: v.optional(v.string()),
    targetLang: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const response = await fetch(`${HACKATHON_API_URL}/api/v1/translate/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: args.text,
          source_lang: args.sourceLang || "auto",
          target_lang: args.targetLang || "en",
        }),
      });

      if (!response.ok) {
        throw new Error(`Translation failed: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        success: true,
        translation: result.translation,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Translation failed",
      };
    }
  },
});

/**
 * Translate AI response to user's language
 */
export const translateResponse = action({
  args: {
    text: v.string(),
    targetLang: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const response = await fetch(`${HACKATHON_API_URL}/api/v1/translate/response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: args.text,
          target_lang: args.targetLang,
        }),
      });

      if (!response.ok) {
        throw new Error(`Translation failed: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        success: true,
        translation: result.translation,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Translation failed",
      };
    }
  },
});

/**
 * Simplify legal text to plain language
 */
export const simplifyLegalText = action({
  args: {
    legalText: v.string(),
    readingLevel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const response = await fetch(`${HACKATHON_API_URL}/api/v1/simplify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          legal_text: args.legalText,
          reading_level: args.readingLevel || "simple",
        }),
      });

      if (!response.ok) {
        throw new Error(`Simplification failed: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        success: true,
        simplification: result.simplification,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Simplification failed",
      };
    }
  },
});

/**
 * Generate legal document
 */
export const generateDocument = action({
  args: {
    documentType: v.string(),
    details: v.any(),
  },
  handler: async (ctx, args) => {
    try {
      const response = await fetch(`${HACKATHON_API_URL}/api/v1/generate/document`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_type: args.documentType,
          details: args.details,
        }),
      });

      if (!response.ok) {
        throw new Error(`Document generation failed: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        success: true,
        document: result.document,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Document generation failed",
      };
    }
  },
});

/**
 * What-if simulation
 */
export const simulateOutcome = action({
  args: {
    baseCaseFacts: v.string(),
    modifications: v.any(),
  },
  handler: async (ctx, args) => {
    try {
      const response = await fetch(`${HACKATHON_API_URL}/api/v1/simulate/outcome`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base_case: {
            facts: args.baseCaseFacts,
          },
          modifications: args.modifications,
        }),
      });

      if (!response.ok) {
        throw new Error(`Simulation failed: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        success: true,
        simulation: result.simulation,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Simulation failed",
      };
    }
  },
});

/**
 * Sensitivity analysis
 */
export const sensitivityAnalysis = action({
  args: {
    caseFacts: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const response = await fetch(`${HACKATHON_API_URL}/api/v1/simulate/sensitivity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          case_facts: args.caseFacts,
        }),
      });

      if (!response.ok) {
        throw new Error(`Sensitivity analysis failed: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        success: true,
        sensitivity: result.sensitivity,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Sensitivity analysis failed",
      };
    }
  },
});

/**
 * Get supported languages
 */
export const getSupportedLanguages = action({
  args: {},
  handler: async (ctx) => {
    try {
      const response = await fetch(`${HACKATHON_API_URL}/api/v1/languages`);

      if (!response.ok) {
        throw new Error(`Failed to fetch languages: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        success: true,
        languages: result.languages,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch languages",
      };
    }
  },
});

/**
 * Get document templates
 */
export const getDocumentTemplates = action({
  args: {},
  handler: async (ctx) => {
    try {
      const response = await fetch(`${HACKATHON_API_URL}/api/v1/templates`);

      if (!response.ok) {
        throw new Error(`Failed to fetch templates: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        success: true,
        templates: result.templates,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch templates",
      };
    }
  },
});

/**
 * Get complete demo (for judges)
 */
export const getCompleteDemo = action({
  args: {},
  handler: async (ctx) => {
    try {
      const response = await fetch(`${HACKATHON_API_URL}/api/v1/demo/complete`);

      if (!response.ok) {
        throw new Error(`Demo failed: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        success: true,
        demo: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Demo failed",
      };
    }
  },
});

