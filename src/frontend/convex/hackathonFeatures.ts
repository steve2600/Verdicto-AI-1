import { action } from "./_generated/server";
import { v } from "convex/values";

// Unified ML API URL (contains both bias analysis and hackathon features)
const ML_API_URL = process.env.ML_API_URL || "http://localhost:8001";

// Translation action
export const translateQuery = action({
  args: {
    text: v.string(),
    sourceLang: v.string(),
    targetLang: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const response = await fetch(`${ML_API_URL}/api/v1/translate/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: args.text,
          source_lang: args.sourceLang,
          target_lang: args.targetLang,
        }),
      });

      if (!response.ok) {
        throw new Error(`Translation failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error("Translation error:", error);
      throw new Error(`Translation failed: ${error.message}`);
    }
  },
});

// Translate response action
export const translateResponse = action({
  args: {
    text: v.string(),
    targetLang: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const response = await fetch(`${ML_API_URL}/api/v1/translate/response`, {
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

      return await response.json();
    } catch (error: any) {
      console.error("Translation error:", error);
      throw new Error(`Translation failed: ${error.message}`);
    }
  },
});

// Get supported languages action
export const getSupportedLanguages = action({
  args: {},
  handler: async (ctx) => {
    try {
      const response = await fetch(`${ML_API_URL}/api/v1/languages`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Failed to get languages: ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error("Get languages error:", error);
      throw new Error(`Get languages failed: ${error.message}`);
    }
  },
});

// Simplification action
export const simplifyText = action({
  args: {
    legalText: v.string(),
    readingLevel: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const response = await fetch(`${ML_API_URL}/api/v1/simplify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          legal_text: args.legalText,
          reading_level: args.readingLevel,
        }),
      });

      if (!response.ok) {
        throw new Error(`Simplification failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error("Simplification error:", error);
      throw new Error(`Simplification failed: ${error.message}`);
    }
  },
});

// Document generation action
export const generateDocument = action({
  args: {
    documentType: v.string(),
    details: v.any(),
  },
  handler: async (ctx, args) => {
    try {
      const response = await fetch(`${ML_API_URL}/api/v1/generate/document`, {
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

      return await response.json();
    } catch (error: any) {
      console.error("Document generation error:", error);
      throw new Error(`Document generation failed: ${error.message}`);
    }
  },
});

// Get document templates action
export const getDocumentTemplates = action({
  args: {},
  handler: async (ctx) => {
    try {
      const response = await fetch(`${ML_API_URL}/api/v1/templates`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Failed to get templates: ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error("Get templates error:", error);
      throw new Error(`Get templates failed: ${error.message}`);
    }
  },
});

// Simulation action
export const simulateOutcome = action({
  args: {
    baseCase: v.any(),
    modifications: v.any(),
  },
  handler: async (ctx, args) => {
    try {
      const response = await fetch(`${ML_API_URL}/api/v1/simulate/outcome`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base_case: args.baseCase,
          modifications: args.modifications,
        }),
      });

      if (!response.ok) {
        throw new Error(`Simulation failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error("Simulation error:", error);
      throw new Error(`Simulation failed: ${error.message}`);
    }
  },
});

// Sensitivity analysis action
export const sensitivityAnalysis = action({
  args: {
    caseFacts: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const response = await fetch(`${ML_API_URL}/api/v1/simulate/sensitivity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          case_facts: args.caseFacts,
        }),
      });

      if (!response.ok) {
        throw new Error(`Sensitivity analysis failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error("Sensitivity analysis error:", error);
      throw new Error(`Sensitivity analysis failed: ${error.message}`);
    }
  },
});