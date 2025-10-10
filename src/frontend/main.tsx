import { Toaster } from "@/components/ui/sonner";
import { VlyToolbar } from "../../vly-toolbar-readonly.tsx";
import { InstrumentationProvider } from "@/instrumentation.tsx";
import AuthPage from "@/pages/Auth.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
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
import DocumentGenerator from "./pages/DocumentGenerator.tsx";
import LiveVerdict from "./pages/LiveVerdict.tsx";
import "./types/global.d.ts";
import { ThemeProvider } from "./contexts/ThemeContext.tsx";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

const router = createBrowserRouter([
  {
    path: "/",
    element: <Landing />,
  },
  {
    path: "/auth",
    element: <AuthPage />,
  },
  {
    path: "/dashboard",
    element: <Dashboard />,
    children: [
      {
        index: true,
        element: <CasePrediction />,
      },
      {
        path: "generator",
        lazy: async () => {
          const { default: DocumentGenerator } = await import("./pages/DocumentGenerator");
          return { Component: DocumentGenerator };
        },
      },
      {
        path: "documents",
        lazy: async () => {
          const { default: DocumentLibrary } = await import("./pages/DocumentLibrary");
          return { Component: DocumentLibrary };
        },
      },
      {
        path: "research",
        lazy: async () => {
          const { default: LegalResearch } = await import("./pages/LegalResearch");
          return { Component: LegalResearch };
        },
      },
      {
        path: "bias",
        lazy: async () => {
          const { default: BiasInsights } = await import("./pages/BiasInsights");
          return { Component: BiasInsights };
        },
      },
      {
        path: "reports",
        lazy: async () => {
          const { default: Reports } = await import("./pages/Reports");
          return { Component: Reports };
        },
      },
      {
        path: "history",
        lazy: async () => {
          const { default: History } = await import("./pages/History");
          return { Component: History };
        },
      },
      {
        path: "live-verdict",
        lazy: async () => {
          const { default: LiveVerdict } = await import("./pages/LiveVerdict");
          return { Component: LiveVerdict };
        },
      },
    ],
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);

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
        <ThemeProvider>
          <ConvexEnvGuard />
          <RouterProvider router={router} />
          <Toaster />
        </ThemeProvider>
      </ConvexAuthProvider>
    </InstrumentationProvider>
  </StrictMode>,
);