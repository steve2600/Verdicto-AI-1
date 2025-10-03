import { Toaster } from "@/components/ui/sonner";
import { VlyToolbar } from "../../vly-toolbar-readonly.tsx";
import { InstrumentationProvider } from "@/instrumentation.tsx";
import AuthPage from "@/pages/Auth.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import "./index.css";
import Landing from "./pages/Landing.tsx";
import NotFound from "./pages/NotFound.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import CasePrediction from "./pages/CasePrediction.tsx";
import LegalResearch from "./pages/LegalResearch.tsx";
import BiasInsights from "./pages/BiasInsights.tsx";
import Reports from "./pages/Reports.tsx";
import DocumentLibrary from "./pages/DocumentLibrary.tsx";
import History from "./pages/History.tsx";
import "./types/global.d.ts";
import { ThemeProvider } from "./contexts/ThemeContext.tsx";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}

function ConvexEnvGuard() {
  const url = import.meta.env.VITE_CONVEX_URL as string | undefined;
  if (url) return null;
  return (
    <div className="fixed top-0 inset-x-0 z-50 px-4 py-2">
      <div className="mx-auto max-w-4xl rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-xs md:text-sm">
        VITE_CONVEX_URL is not configured. Set it to your Convex deployment URL. Authentication and Convex queries will fail until this is set.
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <VlyToolbar />
    <InstrumentationProvider>
      <ConvexAuthProvider client={convex}>
        <BrowserRouter>
          <ThemeProvider>
            <ConvexEnvGuard />
            <RouteSyncer />
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<AuthPage redirectAfterAuth="/dashboard" />} />
              <Route path="/dashboard" element={<Dashboard />}>
                <Route index element={<CasePrediction />} />
                <Route path="documents" element={<DocumentLibrary />} />
                <Route path="research" element={<LegalResearch />} />
                <Route path="bias" element={<BiasInsights />} />
                <Route path="reports" element={<Reports />} />
                <Route path="history" element={<History />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Toaster />
          </ThemeProvider>
        </BrowserRouter>
      </ConvexAuthProvider>
    </InstrumentationProvider>
  </StrictMode>,
);