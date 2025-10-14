import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import VerdictoChatbot from "@/components/VerdictoChatbot";

// Minimal Dashboard with a side toolbar button that opens the full-window chatbot overlay
export default function Dashboard() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Side toolbar */}
      <div className="fixed left-4 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-3">
        <Button
          aria-label="Open Verdicto Chatbot"
          title="Open Chatbot"
          onClick={() => setIsChatOpen(true)}
          className="h-12 w-12 rounded-full p-0 bg-foreground text-background hover:opacity-90 shadow-2xl"
        >
          <MessageSquare className="h-5 w-5" />
        </Button>
      </div>

      {/* Chatbot overlay (covers entire window) */}
      <VerdictoChatbot isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
}