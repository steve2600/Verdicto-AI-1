import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { useNavigate, Outlet } from "react-router";
import { Loader2, Scale, Search, AlertTriangle, FileText, Menu, FileStack, History as HistoryIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";

export default function Dashboard() {
  const { isLoading, isAuthenticated, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("prediction");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center animated-gradient">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const navItems = [
    { id: "prediction", label: "Case Prediction", icon: Scale, path: "/dashboard" },
    { id: "documents", label: "Document Library", icon: FileStack, path: "/dashboard/documents" },
    { id: "research", label: "Legal Research", icon: Search, path: "/dashboard/research" },
    { id: "bias", label: "Bias Insights", icon: AlertTriangle, path: "/dashboard/bias" },
    { id: "reports", label: "Reports", icon: FileText, path: "/dashboard/reports" },
    { id: "history", label: "History", icon: HistoryIcon, path: "/dashboard/history" },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-border/50">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center neon-glow">
            <Scale className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold neon-text">LexAI</h1>
            <p className="text-xs text-muted-foreground">Legal Intelligence</p>
          </div>
        </motion.div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Button
              variant={activeTab === item.id ? "default" : "ghost"}
              className={`w-full justify-start gap-3 ${
                activeTab === item.id ? "neon-glow" : ""
              }`}
              onClick={() => {
                setActiveTab(item.id);
                navigate(item.path);
              }}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Button>
          </motion.div>
        ))}
      </nav>

      <div className="p-4 border-t border-border/50">
        <div className="glass-strong rounded-lg p-4">
          <p className="text-sm font-medium mb-1">{user.name || user.email || "User"}</p>
          <p className="text-xs text-muted-foreground mb-3">
            {user.role || "Member"}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={async () => {
              await signOut();
              navigate("/auth");
            }}
          >
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="flex h-screen">
        {/* Desktop Sidebar */}
        <motion.aside
          initial={{ x: -300 }}
          animate={{ x: 0 }}
          className="hidden lg:block w-72 glass-strong border-r border-border/50"
        >
          <SidebarContent />
        </motion.aside>

        {/* Mobile Sidebar */}
        <Sheet>
          <SheetTrigger asChild className="lg:hidden fixed top-4 left-4 z-50">
            <Button variant="outline" size="icon" className="glass-strong neon-glow">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 glass-strong">
            <SidebarContent />
          </SheetContent>
        </Sheet>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
      <DisclaimerBanner />
    </div>
  );
}