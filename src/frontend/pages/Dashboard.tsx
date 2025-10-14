import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Scale, FileStack, Search, AlertTriangle, FileText, HistoryIcon, Radio, FilePenLine, Trash2, Network, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogoDropdown } from "@/components/LogoDropdown";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { VerdictoChatbot } from "@/components/VerdictoChatbot";

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const currentUser = useQuery(api.users.currentUser);
  const resetDatabase = useMutation(api.admin.resetDatabase);
  const [isResetting, setIsResetting] = useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);

  const navItems = [
    { id: "prediction", label: "Case Prediction", icon: Scale, path: "/dashboard" },
    { id: "generator", label: "Document Generator", icon: FilePenLine, path: "/dashboard/generator" },
    { id: "documents", label: "Document Library", icon: FileStack, path: "/dashboard/documents" },
    { id: "timeline", label: "Legal Timeline", icon: HistoryIcon, path: "/dashboard/timeline" },
    { id: "comparison", label: "Document Comparison", icon: FileText, path: "/dashboard/comparison" },
    { id: "knowledge-graph", label: "Knowledge Graph", icon: Network, path: "/dashboard/knowledge-graph" },
    { id: "research", label: "Legal Research", icon: Search, path: "/dashboard/research" },
    { id: "bias", label: "Bias Insights", icon: AlertTriangle, path: "/dashboard/bias" },
    { id: "reports", label: "Reports", icon: FileText, path: "/dashboard/reports" },
    { id: "history", label: "History", icon: HistoryIcon, path: "/dashboard/history" },
    { id: "live-verdict", label: "Live Verdict", icon: Radio, path: "/dashboard/live-verdict" },
    { id: "chatbot", label: "Legal Assistant", icon: MessageSquare, action: () => setIsChatbotOpen(true) },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleResetDatabase = async () => {
    setIsResetting(true);
    try {
      await resetDatabase();
      toast.success("Database reset successfully! All your data has been cleared.");
      // Optionally refresh the page or navigate somewhere
      window.location.reload();
    } catch (error) {
      toast.error("Failed to reset database. Please try again.");
      console.error("Reset error:", error);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Theme Toggle - Fixed Position */}
      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      {/* Verdicto Chatbot full-window overlay */}
      <VerdictoChatbot isOpen={isChatbotOpen} onClose={() => setIsChatbotOpen(false)} />

      {/* Sidebar */}
      <motion.aside
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        className="w-72 border-r border-border bg-card/50 backdrop-blur-xl flex flex-col"
      >
        {/* Logo & App Name */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <LogoDropdown />
            <h1 className="text-2xl font-light tracking-tight text-foreground">Verdicto-AI</h1>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <motion.button
                key={item.id}
                onClick={() => item.action ? item.action() : navigate(item.path)}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-sm font-medium">{item.label}</span>
              </motion.button>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-border">
          <Card className="p-4 bg-background/50">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">
                  {currentUser?.name?.[0]?.toUpperCase() || "U"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {currentUser?.name || "User"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {currentUser?.email || ""}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    disabled={isResetting}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Reset
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset Database?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all your documents, queries, predictions, and analysis history. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleResetDatabase}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isResetting ? "Resetting..." : "Reset Database"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button
                onClick={handleSignOut}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                Sign Out
              </Button>
            </div>
          </Card>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}