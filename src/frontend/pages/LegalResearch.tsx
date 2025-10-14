import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, Calendar, MapPin, ExternalLink, Loader2, Filter } from "lucide-react";
import { useState } from "react";
import { useQuery, useAction, useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "react-router";

export default function LegalResearch() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<string>("all");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  
  const navigate = useNavigate();
  const convex = useConvex();
  const semanticSearch = useAction(api.legalResearch.semanticSearch);
  const allDocuments = useQuery(api.legalResearch.listProcessedDocuments, {
    jurisdiction: selectedJurisdiction === "all" ? undefined : selectedJurisdiction,
  });
  const jurisdictions = useQuery(api.legalResearch.getJurisdictions, {});
  const getFileUrl = useQuery(
    api.documents.getFileUrl,
    searchResults.length > 0 && searchResults[0]?.document?.fileId
      ? { storageId: searchResults[0].document.fileId }
      : "skip"
  );

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast.error("Please enter a search term");
      return;
    }

    setIsSearching(true);
    setShowResults(true);
    try {
      const results = await semanticSearch({
        query: searchTerm,
        limit: 20,
      });
      setSearchResults(results);
      toast.success(`Found ${results.length} relevant documents`);
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  const handleUseInAnalysis = (documentId: string) => {
    navigate("/dashboard/case-prediction", {
      state: { selectedDocumentId: documentId },
    });
    toast.success("Document selected for analysis");
  };

  const handleViewDocument = async (fileId: Id<"_storage">) => {
    try {
      const url = await convex.query(api.documents.getFileUrl, { storageId: fileId });
      if (url) {
        window.open(url, "_blank");
      } else {
        toast.error("Failed to open document");
      }
    } catch (error) {
      console.error("Error opening document:", error);
      toast.error("Failed to open document");
    }
  };

  const displayDocuments = showResults ? searchResults : allDocuments;

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl md:text-5xl font-light mb-2 text-foreground tracking-tight" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300, letterSpacing: '-0.02em' }}>
          Legal Research
        </h1>
        <p className="text-muted-foreground font-light" style={{ letterSpacing: '0.01em' }}>
          AI-powered semantic search through legal documents
        </p>
      </motion.div>

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <Card className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search legal documents by keywords, phrases, or legal concepts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-10"
                />
              </div>
              <Button onClick={handleSearch} disabled={isSearching}>
                {isSearching ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </>
                )}
              </Button>
            </div>
            
            <div className="flex items-center gap-3">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedJurisdiction} onValueChange={setSelectedJurisdiction}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by jurisdiction" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Jurisdictions</SelectItem>
                  {jurisdictions?.map((jurisdiction) => (
                    <SelectItem key={jurisdiction} value={jurisdiction}>
                      {jurisdiction}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {showResults && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowResults(false);
                    setSearchTerm("");
                    setSearchResults([]);
                  }}
                >
                  Clear Search
                </Button>
              )}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Results */}
      <div className="space-y-4">
        {displayDocuments?.map((item: any, index: number) => {
          const doc = item.document || item;
          return (
            <motion.div
              key={doc._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="p-6 hover:shadow-lg transition-all cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-bold mb-1">{doc.title}</h3>
                        {item.relevance_score && (
                          <Badge variant="secondary" className="mb-2">
                            Relevance: {Math.round(item.relevance_score * 100)}%
                          </Badge>
                        )}
                      </div>
                      <Badge variant="outline">{doc.jurisdiction}</Badge>
                    </div>
                    
                    {item.excerpt && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {item.excerpt}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(doc.uploadDate).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {doc.jurisdiction}
                      </div>
                      {doc.metadata?.pageCount && (
                        <span>{doc.metadata.pageCount} pages</span>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleUseInAnalysis(doc._id)}
                      >
                        Use in Case Analysis
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewDocument(doc.fileId)}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View PDF
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {displayDocuments?.length === 0 && !isSearching && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">
            {showResults ? "No documents found matching your search" : "No legal documents available"}
          </p>
        </motion.div>
      )}
    </div>
  );
}