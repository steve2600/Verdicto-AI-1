import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useVerdictoChat } from "@/hooks/use-verdicto-chat";
import ReactMarkdown from "react-markdown";

interface VerdictoChatbotProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VerdictoChatbot({ isOpen, onClose }: VerdictoChatbotProps) {
  const [input, setInput] = useState("");
  const { messages, isLoading, sendMessage } = useVerdictoChat();

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Robust auto-scroll to bottom on new messages/loading changes
  useEffect(() => {
    if (!scrollAreaRef.current) return;

    const scrollToBottom = () => {
      const viewport = scrollAreaRef.current?.querySelector(
        "[data-radix-scroll-area-viewport]"
      ) as HTMLElement | null;

      if (viewport) {
        // Ensure smooth behavior and iOS momentum scrolling
        viewport.scrollTop = viewport.scrollHeight;
        viewport.style.scrollBehavior = "smooth";
        (viewport.style as any).webkitOverflowScrolling = "touch";
      }

      if (bottomRef.current) {
        bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
      }
    };

    // Immediate and double-RAF for layout stabilization
    scrollToBottom();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    });

    // Staggered retries for async content rendering
    const t1 = setTimeout(scrollToBottom, 50);
    const t2 = setTimeout(scrollToBottom, 150);
    const t3 = setTimeout(scrollToBottom, 300);
    const t4 = setTimeout(scrollToBottom, 500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput("");
    await sendMessage(text);
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="w-full h-full max-w-7xl mx-auto p-8 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border bg-card/50 rounded-t-2xl">
              <div>
                <h3 className="text-2xl font-semibold text-foreground">Verdicto Legal Assistant</h3>
                <p className="text-sm text-muted-foreground">Powered by Llama 3.1 8B Instant</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-10 w-10"
                aria-label="Close chatbot"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Messages */}
            <ScrollArea
              ref={scrollAreaRef}
              className="flex-1 p-6 bg-card/30 rounded-none"
              style={{ height: "calc(100vh - 220px)" }}
            >
              <div
                className="space-y-4 min-h-full pb-4"
                role="log"
                aria-live="polite"
                tabIndex={0}
              >
                {messages?.map((m: any, idx: number) => {
                  const isUser = m?.role === "user";
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18 }}
                      className={`w-full flex ${isUser ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={[
                          "max-w-3xl rounded-xl shadow px-4 py-3",
                          isUser
                            ? "bg-foreground text-background"
                            : "bg-muted text-foreground",
                          // Ensure long content wraps and stays readable
                          "whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
                        ].join(" ")}
                      >
                        <ReactMarkdown>{String(m?.content ?? "")}</ReactMarkdown>
                      </div>
                    </motion.div>
                  );
                })}

                {isLoading && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Thinking...</span>
                  </div>
                )}

                {/* Sentinel to anchor the bottom for robust scrolling */}
                <div ref={bottomRef} aria-hidden="true" data-chat-end />
              </div>
            </ScrollArea>

            {/* Composer */}
            <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about Indian legal principles, precedents, and the Constitution…"
                className="flex-1"
                disabled={isLoading}
                aria-label="Chat input"
              />
              <Button onClick={handleSend} disabled={isLoading || !input.trim()} className="gap-1.5">
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}