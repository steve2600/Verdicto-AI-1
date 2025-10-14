import { useState, useCallback } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export function useVerdictoChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (userMessage: string) => {
    if (!userMessage.trim()) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: userMessage,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setError(null);

    try {
      // Use Groq API directly for conversational chat
      const GROQ_API_KEY = "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";
      
      // Build conversation history for context
      const conversationHistory = [
        {
          role: "system",
          content: `You are Verdicto Legal Assistant, an AI legal expert specialized EXCLUSIVELY in Indian law and the Constitution of India. You are powered by Llama 3.1 8B Instant.

STRICT CONSTRAINTS:
1. You ONLY provide information about Indian jurisdiction, Indian laws, and the Constitution of India
2. You MUST NOT provide information about laws from other countries (US, UK, EU, etc.)
3. If asked about non-Indian legal matters, politely decline and redirect to Indian law
4. Base your responses ONLY on established Indian legal principles, statutes, and constitutional provisions
5. If you don't know something about Indian law, clearly state "I don't have sufficient information about this aspect of Indian law" rather than making up information
6. Always cite relevant Indian legal provisions, articles of the Constitution, or landmark Indian Supreme Court cases when applicable
7. Use clear, professional language appropriate for legal guidance in the Indian context

RESPONSE FORMAT:
- Be professional, clear, and concise
- Reference specific Articles of the Indian Constitution when relevant
- Mention relevant Indian statutes (IPC, CrPC, CPC, etc.) when applicable
- Cite landmark Indian Supreme Court or High Court judgments when appropriate
- If the question is outside Indian jurisdiction, respond: "I specialize exclusively in Indian law and the Constitution of India. I cannot provide information about [other jurisdiction]. However, I'd be happy to help with any questions about Indian legal matters."

Remember: You are a specialized assistant for Indian law ONLY. Never provide information about other jurisdictions or make up legal information.`
        },
        ...messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        {
          role: "user",
          content: userMessage
        }
      ];

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: conversationHistory,
          temperature: 0.3,
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status}`);
      }

      const data = await response.json();
      const assistantContent = data.choices?.[0]?.message?.content || "I apologize, but I couldn't generate a response.";

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: assistantContent,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error("Chat error:", err);
      setError("I apologize, but I'm having trouble connecting right now. Please try again.");

      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "I apologize, but I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  const clearHistory = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearHistory,
  };
}