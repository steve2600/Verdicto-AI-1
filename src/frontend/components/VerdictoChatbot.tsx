import React, { useEffect, useRef } from "react";
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
  const [input, setInput] = React.useState("");
  const { messages, isLoading, sendMessage } = useVerdictoChat();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Enhanced auto-scroll mechanism for long responses
  useEffect(() => {
    if (!scrollAreaRef.current) return;

    const scrollToBottom = () => {
      const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    };

    // Immediate scroll
    scrollToBottom();
    
    // Multiple delayed attempts to handle dynamic content loading
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    });
    
    const timer1 = setTimeout(scrollToBottom, 50);
    const timer2 = setTimeout(scrollToBottom, 150);
    const timer3 = setTimeout(scrollToBottom, 300);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const message = input.trim();
    setInput("");
    await sendMessage(message);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
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
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
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
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Messages Area with proper scrolling */}
            <ScrollArea ref={scrollAreaRef} className="flex-1 p-6 bg-card/30 rounded-none">
              <div
                className="space-y-4 min-h-full"
                role="log"
                aria-live="polite"
                tabIndex={0}
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                {messages.length === 0 && (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    Ask me anything about Indian law and the Constitution.
                  </div>
                )}
                {messages.map((msg, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        <div className="text-sm prose prose-sm dark:prose-invert max-w-none break-words overflow-wrap-anywhere">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                      )}
                    </div>
                  </motion.div>
                ))}
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="bg-muted rounded-2xl px-4 py-2 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">Thinking...</span>
                    </div>
                  </motion.div>
                )}
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-6 border-t border-border bg-card/50 rounded-b-2xl">
              <div className="flex gap-3">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask a legal question..."
                  disabled={isLoading}
                  className="flex-1 h-12 text-base"
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  size="icon"
                  className="h-12 w-12"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Constrained to Indian jurisdiction
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export { VerdictoChatbot, type VerdictoChatbotProps };