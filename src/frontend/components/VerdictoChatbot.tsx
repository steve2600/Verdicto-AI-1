import React, { useEffect, useRef } from "react";

type Props = {
  messagesLength?: number; // optional: trigger auto-scroll on message count change
  isLoading?: boolean;     // optional: trigger auto-scroll when streaming completes
};

const VerdictoChatbot: React.FC<Props> = ({ messagesLength, isLoading }) => {
  const viewportRef = useRef<HTMLDivElement | null>(null);

  // Robust auto-scroll to bottom on new messages/loading changes
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    try {
      (viewport.style as any).webkitOverflowScrolling = "touch";
      viewport.style.overflowY = "auto";
    } catch {
      // no-op
    }

    const scrollToBottom = () => {
      viewport.scrollTop = viewport.scrollHeight;
    };

    scrollToBottom();
    requestAnimationFrame(() => {
      requestAnimationFrame(scrollToBottom);
    });
    const t = setTimeout(scrollToBottom, 150);
    return () => clearTimeout(t);
  }, [messagesLength, isLoading]);

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 sm:w-96 h-[28rem] rounded-xl border border-white/10 bg-black/40 dark:bg-white/5 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden">
      <div className="px-3 py-2 text-sm font-medium text-foreground/90 bg-black/30 dark:bg-white/10 border-b border-white/10">
        Verdicto Chatbot
      </div>
      <div
        ref={viewportRef}
        role="log"
        aria-live="polite"
        tabIndex={0}
        className="flex-1 overflow-y-auto p-3 space-y-3"
      >
        {/* Messages are rendered by the host app; this container will auto-scroll */}
      </div>
      <div className="p-2 border-t border-white/10 text-xs text-muted-foreground">
        Ask a legal question to begin.
      </div>
    </div>
  );
};

export default VerdictoChatbot;
export { VerdictoChatbot };