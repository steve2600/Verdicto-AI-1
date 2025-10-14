import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Trash2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useVerdictoChat } from "@/hooks/use-verdicto-chat";
import ReactMarkdown from "react-markdown";

export default function AIAssistant() {
  const [inputValue, setInputValue] = useState("");
  const { messages, isLoading, sendMessage, clearHistory } = useVerdictoChat();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const root = scrollAreaRef.current as HTMLElement | null;
    if (!root) return;

    const viewport = root.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]');
    if (!viewport) return;

    // Ensure smooth touch scrolling on iOS
    try {
      (viewport.style as any).webkitOverflowScrolling = "touch";
    } catch {
      // no-op
    }

    // Use triple rAF + setTimeout for maximum reliability
    const scrollToBottom = () => {
      viewport.scrollTop = viewport.scrollHeight;
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(scrollToBottom, 50);
        });
      });
    });
  }, [messages, isLoading]);

  const handleSend = () => {
    if (inputValue.trim() && !isLoading) {
      sendMessage(inputValue);
      setInputValue("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-border bg-card/50 backdrop-blur-xl p-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
              <MessageCircle className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-light tracking-tight text-foreground">
                AI Legal Assistant
              </h1>
              <p className="text-sm text-muted-foreground">
                Ask questions about Indian law and the Constitution
              </p>
            </div>
          </div>
          <Button
            onClick={clearHistory}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Clear History
          </Button>
        </div>
      </motion.div>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden p-6">
        <Card className="h-full bg-card/50 backdrop-blur-xl border border-border">
          <ScrollArea ref={scrollAreaRef} className="h-full p-6">
            <div
              className="space-y-4"
              role="log"
              aria-live="polite"
              tabIndex={0}
            >
              {messages.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center h-full text-center py-12"
                >
                  <MessageCircle className="h-16 w-16 text-muted-foreground/50 mb-4" />
                  <h3 className="text-xl font-light text-foreground mb-2">
                    Welcome to AI Legal Assistant
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Ask me anything about Indian law, the Constitution, legal procedures, or case analysis.
                    I'm here to help with your legal queries.
                  </p>
                </motion.div>
              ) : (
                messages.map((message, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      <ReactMarkdown
                        className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none break-words overflow-wrap-anywhere"
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                          li: ({ children }) => <li className="mb-1">{children}</li>,
                          code: ({ children }) => (
                            <code className="bg-background/50 px-1 py-0.5 rounded text-xs">
                              {children}
                            </code>
                          ),
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  </motion.div>
                ))
              )}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-muted rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </ScrollArea>
        </Card>
      </div>

      {/* Input Area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-t border-border bg-card/50 backdrop-blur-xl p-6"
      >
        <div className="flex gap-3">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a legal question..."
            disabled={isLoading}
            className="flex-1 bg-background border-border"
          />
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            size="icon"
            className="h-10 w-10"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
