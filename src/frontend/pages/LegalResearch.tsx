import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";

export default function LegalResearch() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const semanticSearch = useAction(api.legalResearch.semanticSearch);

  const onSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const term = searchTerm.trim();
    if (!term) {
      toast.error("Please enter a search term");
      return;
    }
    setIsSearching(true);
    try {
      const res = await semanticSearch({ query: term, limit: 20 });
      setResults(res || []);
      if (!res || res.length === 0) {
        toast.info("No documents found");
      } else {
        toast.success(`Found ${res.length} document${res.length > 1 ? "s" : ""}`);
      }
    } catch (err) {
      console.error("Search failed:", err);
      toast.error("Search failed. Please try again.");
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Legal Research</h1>
      <form onSubmit={onSearch} className="flex gap-2 mb-6">
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by title or content..."
          className="flex-1 border rounded px-3 py-2 bg-transparent"
        />
        <button
          type="submit"
          disabled={isSearching}
          className="px-4 py-2 rounded bg-foreground text-background disabled:opacity-50"
        >
          {isSearching ? "Searching..." : "Search"}
        </button>
      </form>

      <div className="space-y-3">
        {results.map((r, idx) => {
          const doc = r.document ?? null;
          return (
            <div key={idx} className="border rounded p-3">
              <div className="font-medium">{doc?.title ?? "Untitled document"}</div>
              <div className="text-sm text-muted-foreground">
                {doc?.jurisdiction ? `Jurisdiction: ${doc.jurisdiction}` : null}
              </div>
              {r.excerpt ? (
                <p className="text-sm mt-2 opacity-80">{r.excerpt}</p>
              ) : null}
            </div>
          );
        })}
        {!isSearching && results.length === 0 && (
          <p className="text-sm text-muted-foreground">Enter a search term to find documents.</p>
        )}
      </div>
    </div>
  );
}