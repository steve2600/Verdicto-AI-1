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
      // Prefer Vly.ai (OpenAI-compatible) if configured, else fallback to Groq
      const vlyBase = (import.meta as any).env?.VITE_VLY_API_BASE_URL as string | undefined;
      const vlyKey = (import.meta as any).env?.VITE_VLY_API_KEY as string | undefined;
      const groqKey = (import.meta as any).env?.VITE_GROQ_API_KEY as string | undefined;

      const baseUrl = (vlyBase ? vlyBase.replace(/\/$/, "") : "https://api.groq.com/openai/v1");
      const apiKey = vlyKey || groqKey || "";

      if (!apiKey) {
        throw new Error("Missing API key for chat provider");
      }

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            {
              role: "system",
              content:
                "You are Verdicto Legal Assistant, an AI-powered legal advisor specializing in Indian law. Provide clear, accurate, and professional legal guidance. Use markdown formatting for citations and structured responses. Keep responses concise but comprehensive.",
            },
            ...messages.map((msg) => ({
              role: msg.role,
              content: msg.content,
            })),
            {
              role: "user",
              content: userMessage,
            },
          ],
          temperature: 0.3,
          max_tokens: 512,
        }),
      });

      if (!response.ok) {
        let errMsg = "Failed to get response from AI";
        try {
          const errData = await response.json();
          if (errData?.error?.message) errMsg = errData.error.message;
        } catch (_e) {}
        throw new Error(errMsg);
      }

      const data = await response.json();
      const assistantContent =
        data.choices?.[0]?.message?.content ||
        "I apologize, but I couldn't generate a response.";

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: assistantContent,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error("Chat error:", err);
      setError("Apologies, I couldn't process that right now. Please try again.");

      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "Apologies, I couldn't process that right now. Please try again.",
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