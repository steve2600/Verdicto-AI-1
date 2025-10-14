// ... keep existing imports

const router = createBrowserRouter([
  {
    path: "/",
    element: <Landing />,
  },
  {
    path: "/auth",
    element: <Auth />,
  },
  {
    path: "/dashboard",
    element: <Dashboard />,
    children: [
      {
        index: true,
        lazy: async () => {
          const { default: CasePrediction } = await import("./pages/CasePrediction");
          return { Component: CasePrediction };
        },
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
        path: "timeline",
        lazy: async () => {
          const { default: LegalTimeline } = await import("./pages/LegalTimeline");
          return { Component: LegalTimeline };
        },
      },
      {
        path: "comparison",
        lazy: async () => {
          const { default: DocumentComparison } = await import("./pages/DocumentComparison");
          return { Component: DocumentComparison };
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
      {
        path: "ai-assistant",
        lazy: async () => {
          const { default: AIAssistant } = await import("./pages/AIAssistant");
          return { Component: AIAssistant };
        },
      },
      // ... keep existing live-verdict-history route if present
    ],
  },
]);

// ... keep existing code
