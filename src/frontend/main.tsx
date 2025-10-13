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