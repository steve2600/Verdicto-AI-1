import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  Search,
  FileText,
  Calendar,
  MapPin,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
} from "lucide-react";
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";

export default function DocumentLibrary() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  
  const documents = useQuery(api.documents.list, {
    jurisdiction: selectedJurisdiction || undefined,
  });
  const processDocumentWithRAG = useAction(api.rag.processDocument);
  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const createDocument = useMutation(api.documents.create);

  const filteredDocuments = documents?.filter((doc: any) =>
    searchTerm.length > 0
      ? doc.title.toLowerCase().includes(searchTerm.toLowerCase())
      : true
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "processed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "processing":
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      processed: "bg-green-500/20 text-green-400 border-green-500/30",
      processing: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      failed: "bg-red-500/20 text-red-400 border-red-500/30",
      pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    };

    return (
      <Badge variant="outline" className={variants[status] || ""}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setIsUploading(true);
    
    try {
      // Step 1: Generate upload URL
      const uploadUrl = await generateUploadUrl();
      
      // Step 2: Upload file to Convex storage
      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      
      if (!uploadResult.ok) {
        throw new Error("Failed to upload file");
      }
      
      const { storageId } = await uploadResult.json();
      
      // Step 3: Create document record
      const documentId = await createDocument({
        title: file.name,
        jurisdiction: "India", // Default, can be made selectable
        fileId: storageId,
        metadata: {
          documentType: "Legal Document",
          version: "1.0",
          fileSize: file.size,
        },
      });
      
      toast.success("Document uploaded successfully!");
      
      // Step 4: Process with RAG backend (in background)
      const fileUrl = `${window.location.origin}/api/storage/${storageId}`;
      processDocumentWithRAG({
        documentId,
        fileUrl,
        title: file.name,
      })
        .then(() => {
          toast.success("Document processed successfully!");
        })
        .catch((error) => {
          console.error("RAG processing error:", error);
          toast.error("Document uploaded but processing failed");
        });
      
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload document");
    } finally {
      setIsUploading(false);
      // Reset file input
      event.target.value = "";
    }
  };

  const handleUpload = () => {
    document.getElementById("file-upload-input")?.click();
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto pb-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl md:text-5xl font-light mb-2 text-foreground tracking-tight" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300, letterSpacing: '-0.02em' }}>Document Library</h1>
        <p className="text-muted-foreground font-light" style={{ letterSpacing: '0.01em' }}>
          Upload and manage your legal documents for AI analysis
        </p>
      </motion.div>

      {/* Hidden file input */}
      <input
        id="file-upload-input"
        type="file"
        accept="application/pdf"
        onChange={handleFileUpload}
        style={{ display: "none" }}
      />

      {/* Upload Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <Card className="macos-card p-8 border-dashed border-2 hover:border-primary/50 macos-transition cursor-pointer">
          <div className="text-center" onClick={handleUpload}>
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 neon-glow">
              {isUploading ? (
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              ) : (
                <Upload className="h-8 w-8 text-primary" />
              )}
            </div>
            <h3 className="text-lg font-bold mb-2">
              {isUploading ? "Uploading..." : "Upload Legal Documents"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {isUploading 
                ? "Processing your document..." 
                : "Click to browse PDF files (max 10MB)"}
            </p>
            <Button className="neon-glow" disabled={isUploading}>
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? "Uploading..." : "Select Files"}
            </Button>
          </div>
        </Card>
      </motion.div>

      {/* Search and Filter */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        <Card className="macos-card p-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 macos-vibrancy"
              />
            </div>
            <Button variant="outline" className="macos-vibrancy">
              <MapPin className="h-4 w-4 mr-2" />
              Filter by Jurisdiction
            </Button>
          </div>
        </Card>
      </motion.div>

      {/* Documents Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="macos-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead>Document</TableHead>
                <TableHead>Jurisdiction</TableHead>
                <TableHead>Upload Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments?.map((doc: any, index: number) => (
                <motion.tr
                  key={doc._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-border/50 hover:bg-primary/5 macos-transition"
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{doc.title}</p>
                        {doc.metadata && (
                          <p className="text-xs text-muted-foreground">
                            {doc.metadata.documentType} • v{doc.metadata.version}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{doc.jurisdiction}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(doc.uploadDate).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(doc.status)}
                      {getStatusBadge(doc.status)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="macos-button">
                      View Details
                    </Button>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>

          {(!filteredDocuments || filteredDocuments.length === 0) && (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No documents uploaded yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Upload your first legal document to get started
              </p>
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}