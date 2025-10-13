    // Document management for RAG
    documents: defineTable({
      userId: v.id("users"),
      title: v.string(),
      uploadDate: v.number(),
      jurisdiction: v.string(),
      status: v.union(
        v.literal("pending"),
        v.literal("processing"),
        v.literal("processed"),
        v.literal("failed")
      ),
      fileId: v.id("_storage"),
      metadata: v.optional(
        v.object({
          documentType: v.string(),
          version: v.string(),
          pageCount: v.optional(v.number()),
          fileSize: v.optional(v.number()),
        })
      ),
      chunks: v.optional(v.array(v.object({
        page: v.number(),
        paragraph: v.number(),
        content: v.string(),
      }))),
      timelineEvents: v.optional(v.array(v.object({
        date: v.string(),
        eventType: v.string(),
        description: v.string(),
        importance: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
        sourceReference: v.object({
          page: v.number(),
          excerpt: v.string(),
        }),
      }))),
    })
      .index("by_user", ["userId"])
      .index("by_jurisdiction", ["jurisdiction"])
      .index("by_status", ["status"]),