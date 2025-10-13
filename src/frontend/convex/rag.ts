// ... keep existing imports and code until the confidence calculation section

      const ragResponse = result.answer || "No response generated";
      
      // ===== ENHANCED CONFIDENCE CALCULATION =====
      // Multi-factor scoring system for more accurate confidence assessment
      
      let confidence = 0.0;
      
      // 1. RESPONSE QUALITY METRICS (40% weight)
      let qualityScore = 0.0;
      
      // Length and completeness (0-10 points)
      const responseLength = ragResponse.length;
      if (responseLength > 500) qualityScore += 10;
      else if (responseLength > 300) qualityScore += 8;
      else if (responseLength > 150) qualityScore += 6;
      else if (responseLength > 80) qualityScore += 4;
      else qualityScore += 2;
      
      // Legal terminology density (0-10 points)
      const legalTerms = [
        'section', 'act', 'court', 'case', 'law', 'legal', 'pursuant', 
        'hereby', 'whereas', 'article', 'clause', 'provision', 'statute',
        'judgment', 'precedent', 'jurisdiction', 'plaintiff', 'defendant',
        'constitutional', 'amendment', 'ordinance', 'regulation'
      ];
      const termsFound = legalTerms.filter(term => 
        ragResponse.toLowerCase().includes(term)
      ).length;
      const termDensity = termsFound / (responseLength / 100); // terms per 100 chars
      if (termDensity > 3) qualityScore += 10;
      else if (termDensity > 2) qualityScore += 8;
      else if (termDensity > 1) qualityScore += 6;
      else if (termDensity > 0.5) qualityScore += 4;
      else qualityScore += 2;
      
      // Sentence structure (0-5 points)
      const sentences = ragResponse.split(/[.!?]+/).filter(s => s.trim().length > 10);
      if (sentences.length >= 3 && sentences.length <= 6) qualityScore += 5;
      else if (sentences.length >= 2) qualityScore += 3;
      else qualityScore += 1;
      
      // Citation indicators (0-5 points)
      const citationPatterns = /\b(section|article|clause|para|sub-section)\s+\d+/gi;
      const citations = ragResponse.match(citationPatterns);
      if (citations && citations.length >= 3) qualityScore += 5;
      else if (citations && citations.length >= 1) qualityScore += 3;
      else qualityScore += 0;
      
      confidence += (qualityScore / 30) * 0.4; // Normalize to 0-0.4
      
      // 2. SOURCE RELIABILITY (30% weight)
      let sourceScore = 0.0;
      
      // Document context availability (0-10 points)
      const chunksUsed = result.chunks_used || 0;
      if (chunksUsed >= 3) sourceScore += 10;
      else if (chunksUsed >= 2) sourceScore += 7;
      else if (chunksUsed >= 1) sourceScore += 5;
      else sourceScore += 2; // Generic response
      
      // Document selection (0-10 points)
      if (documentId) {
        sourceScore += 10; // Specific document selected
      } else {
        sourceScore += 5; // General query
      }
      
      confidence += (sourceScore / 20) * 0.3; // Normalize to 0-0.3
      
      // 3. BIAS IMPACT (20% weight) - Will be calculated after bias analysis
      // Placeholder: assume moderate bias for now
      let biasScore = 7.0; // 0-10 scale (higher = less bias)
      confidence += (biasScore / 10) * 0.2; // Normalize to 0-0.2
      
      // 4. QUERY-ANSWER ALIGNMENT (10% weight)
      let alignmentScore = 0.0;
      
      // Check if answer addresses the query
      const queryWords = args.queryText.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const answerLower = ragResponse.toLowerCase();
      const matchedWords = queryWords.filter(word => answerLower.includes(word)).length;
      const matchRatio = queryWords.length > 0 ? matchedWords / queryWords.length : 0;
      
      if (matchRatio > 0.6) alignmentScore += 10;
      else if (matchRatio > 0.4) alignmentScore += 7;
      else if (matchRatio > 0.2) alignmentScore += 5;
      else alignmentScore += 2;
      
      confidence += (alignmentScore / 10) * 0.1; // Normalize to 0-0.1
      
      // Final adjustments
      // Penalize very short responses
      if (responseLength < 50) {
        confidence *= 0.6;
      }
      
      // Penalize generic/error responses
      if (ragResponse.includes("couldn't find") || 
          ragResponse.includes("not available") ||
          ragResponse.includes("Please select")) {
        confidence *= 0.5;
      }
      
      // Cap confidence at 0.92 (never claim near-certainty)
      confidence = Math.min(Math.max(confidence, 0.15), 0.92);
      
      // Round to 2 decimal places
      confidence = Math.round(confidence * 100) / 100;
      
      // ===== END ENHANCED CONFIDENCE CALCULATION =====

      // Create prediction in Convex with RAG results
      const predictionId: any = await ctx.runMutation(internal.predictions.createFromRAG, {
        queryId: args.queryId,
        ragResponse,
        confidence,
        sources: [],
      });

// ... keep existing code for the rest of the function
