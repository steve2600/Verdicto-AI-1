import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, Calendar, MapPin, ExternalLink, Loader2, Filter, Upload } from "lucide-react";
import { useState } from "react";
import { useQuery, useConvex, useMutation, useAction } from "convex/react";
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
  const [processingDocuments, setProcessingDocuments] = useState<Set<string>>(new Set());
  
  const navigate = useNavigate();
  const convex = useConvex();

  const allDocuments = useQuery(api.legalResearch.listProcessedDocuments, {
    jurisdiction: selectedJurisdiction === "all" ? undefined : selectedJurisdiction,
  });
  const jurisdictions = useQuery(api.legalResearch.getJurisdictions, {});
  
  const createDocument = useMutation(api.documents.create);
  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const processDocumentWithRAG = useAction(api.rag.processDocument);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast.error("Please enter a search term");
      return;
    }

    setIsSearching(true);
    setShowResults(true);
    try {
      const term = searchTerm.trim();

      // Use semantic search action from legalResearch module
      const results = await convex.action(api.legalResearch.semanticSearch, {
        query: term,
        limit: 20,
      });

      // Apply jurisdiction filter
      const filtered = selectedJurisdiction === "all"
        ? results
        : results.filter((r: any) => r.document?.jurisdiction === selectedJurisdiction);

      setSearchResults(filtered);

      if (filtered.length === 0) {
        toast.info("No documents found matching your search");
      } else {
        toast.success(`Found ${filtered.length} relevant document${filtered.length > 1 ? "s" : ""}`);
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Search failed. Please try again.");
      setShowResults(false);
    } finally {
      setIsSearching(false);
    }
  };

  const handleBatchUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    
    // Validate all files first
    const invalidFiles = fileArray.filter(
      file => file.type !== "application/pdf" || file.size > 10 * 1024 * 1024
    );

    if (invalidFiles.length > 0) {
      toast.error(`${invalidFiles.length} file(s) rejected: Only PDF files under 10MB are supported`);
      return;
    }

    toast.info(`Uploading ${fileArray.length} document(s) to Legal Research...`);

    let successCount = 0;
    let failCount = 0;

    // Process all files in parallel
    const uploadPromises = fileArray.map(async (file) => {
      try {
        // Step 1: Get upload URL from Convex
        const uploadUrl = await generateUploadUrl();

        // Step 2: Upload file to Convex storage
        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload file");
        }

        const { storageId } = await uploadResponse.json();

        // Step 3: Create document record with documentType = "research"
        const documentId = await createDocument({
          title: file.name.replace(".pdf", ""),
          jurisdiction: "General",
          documentType: "research",
          fileId: storageId,
          metadata: {
            documentType: "Legal Research Document",
            version: "1.0",
            fileSize: file.size,
          },
        });

        // Track this document as processing
        setProcessingDocuments(prev => new Set(prev).add(documentId));

        // Step 4: Process document with RAG backend (async, don't wait)
        processDocumentWithRAG({
          documentId,
          fileUrl: storageId,
          title: file.name.replace(".pdf", ""),
        }).then(() => {
          setProcessingDocuments(prev => {
            const newSet = new Set(prev);
            newSet.delete(documentId);
            return newSet;
          });
        }).catch(err => {
          console.error(`RAG processing failed for ${file.name}:`, err);
          setProcessingDocuments(prev => {
            const newSet = new Set(prev);
            newSet.delete(documentId);
            return newSet;
          });
        });

        successCount++;
        return { success: true, fileName: file.name };
      } catch (error) {
        console.error(`Upload error for ${file.name}:`, error);
        failCount++;
        return { success: false, fileName: file.name, error };
      }
    });

    await Promise.all(uploadPromises);

    // Show summary toast
    if (successCount > 0 && failCount === 0) {
      toast.success(`All ${successCount} document(s) uploaded successfully! Processing with AI...`);
    } else if (successCount > 0 && failCount > 0) {
      toast.warning(`${successCount} document(s) uploaded, ${failCount} failed`);
    } else {
      toast.error(`All ${failCount} document(s) failed to upload`);
    }

    // Reset file input
    event.target.value = "";
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

  const displayDocuments = showResults ? searchResults : [];
  const totalDocuments = allDocuments?.length || 0;
  const processedDocuments = allDocuments?.filter((d: any) => d.status === 'processed').length || 0;

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

      {/* Batch Upload Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-6"
      >
        <Card className="p-6 border-dashed border-2 hover:border-primary/50 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-medium mb-1">Upload Research Documents</h3>
                <p className="text-sm text-muted-foreground">
                  Add legal documents for AI-powered semantic search (Max 10MB each, multiple files supported)
                </p>
              </div>
            </div>
            <label htmlFor="research-file-upload" className="cursor-pointer">
              <Button type="button" className="pointer-events-none">
                <Upload className="h-4 w-4 mr-2" />
                Select Files
              </Button>
            </label>
            <input
              id="research-file-upload"
              type="file"
              accept="application/pdf"
              onChange={handleBatchUpload}
              className="hidden"
              multiple
            />
          </div>
        </Card>
      </motion.div>

      {/* Processing Status Banner */}
      {processingDocuments.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card className="p-4 border-blue-500/50 bg-blue-500/10">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
              <div className="flex-1">
                <p className="font-medium text-blue-400">
                  Processing {processingDocuments.size} document{processingDocuments.size > 1 ? 's' : ''}
                </p>
                <p className="text-sm text-muted-foreground">
                  AI is analyzing and indexing your documents for semantic search...
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Statistics Cards - Only show when not searching */}
      {!showResults && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
        >
          <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Documents</p>
                <p className="text-3xl font-light text-foreground">{totalDocuments}</p>
              </div>
              <FileText className="h-10 w-10 text-primary opacity-50" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Processed & Ready</p>
                <p className="text-3xl font-light text-foreground">{processedDocuments}</p>
              </div>
              <Search className="h-10 w-10 text-green-500 opacity-50" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Jurisdictions</p>
                <p className="text-3xl font-light text-foreground">{jurisdictions?.length || 0}</p>
              </div>
              <MapPin className="h-10 w-10 text-blue-500 opacity-50" />
            </div>
          </Card>
        </motion.div>
      )}

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
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
                  {jurisdictions?.map((jurisdiction: string) => (
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

      {displayDocuments?.length === 0 && !isSearching && showResults && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">
            No documents found matching your search
          </p>
        </motion.div>
      )}

      {!showResults && totalDocuments > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium text-foreground mb-2">
            Ready to Search
          </p>
          <p className="text-muted-foreground">
            Enter a search term above to find relevant legal documents
          </p>
        </motion.div>
      )}

      {!showResults && totalDocuments === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">
            No research documents available. Upload documents above to get started.
          </p>
        </motion.div>
      )}
    </div>
  );
}