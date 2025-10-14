import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useVerdictoChat } from "@/hooks/use-verdicto-chat";
import ReactMarkdown from "react-markdown";

export function VerdictoChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const { messages, isLoading, sendMessage, clearHistory } = useVerdictoChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
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

    const scrollToBottom = () => {
      try {
        // Smooth if supported
        (viewport as any).scrollTo?.({ top: viewport.scrollHeight, behavior: "smooth" });
      } catch {
        viewport.scrollTop = viewport.scrollHeight;
      }
    };

    // Double rAF ensures DOM and layout are fully committed before scrolling
    requestAnimationFrame(() => {
      requestAnimationFrame(scrollToBottom);
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
    <>
      {/* Floating Chat Button */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.5 }}
        className="fixed top-6 right-[5.5rem] z-50"
      >
        <Button
          onClick={() => setIsOpen(!isOpen)}
          size="icon"
          className="h-14 w-14 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all shadow-2xl group"
          style={{
            boxShadow: "0 0 20px rgba(192, 192, 192, 0.3)",
          }}
        >
          <motion.div
            animate={{ rotate: isOpen ? 90 : 0 }}
            transition={{ duration: 0.3 }}
          >
            {isOpen ? (
              <X className="h-6 w-6 text-foreground" />
            ) : (
              <MessageCircle className="h-6 w-6 text-foreground" />
            )}
          </motion.div>
        </Button>
      </motion.div>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed top-24 right-6 z-40 w-[400px] h-[600px]"
          >
            <Card className="h-full flex flex-col bg-background/95 backdrop-blur-xl border-white/10 shadow-2xl">
              {/* Header */}
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                <div>
                  <h3 className="font-semibold text-foreground">Verdicto Legal Assistant</h3>
                  <p className="text-xs text-muted-foreground">Powered by Llama 3.1 8B Instant</p>
                </div>
                <Button
                  onClick={clearHistory}
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
                <div
                  className="space-y-4"
                  role="log"
                  aria-live="polite"
                  tabIndex={0}
                >
                  {messages.length === 0 && (
                    <div className="text-center py-8">
                      <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                      <p className="text-sm text-muted-foreground">
                        Ask me anything about legal matters
                      </p>
                    </div>
                  )}
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-white/5 backdrop-blur-xl border border-white/10 text-foreground"
                        }`}
                      >
                        {message.role === "assistant" ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none break-words overflow-wrap-anywhere">
                            <ReactMarkdown>{message.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <p className="text-sm break-words">{message.content}</p>
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
                      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-3">
                        <div className="flex gap-1">
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                            className="w-2 h-2 bg-foreground rounded-full"
                          />
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                            className="w-2 h-2 bg-foreground rounded-full"
                          />
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                            className="w-2 h-2 bg-foreground rounded-full"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                  {/* Invisible div at the end for scrolling */}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="p-4 border-t border-white/10 bg-white/5">
                <div className="flex gap-2">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask a legal question..."
                    disabled={isLoading}
                    className="flex-1 bg-background/50 border-white/10"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={isLoading || !inputValue.trim()}
                    size="icon"
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}