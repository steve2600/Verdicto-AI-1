import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Calendar } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";

export default function Reports() {
  const predictions = useQuery(api.predictions.listByUser);

  const handleDownload = () => {
    toast.success("Report download started");
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold mb-2 neon-text">Reports</h1>
        <p className="text-muted-foreground">
          Download and review your analysis reports
        </p>
      </motion.div>

      <div className="space-y-4">
        {predictions?.map((prediction, index) => (
          <motion.div
            key={prediction._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="glass-strong p-6 hover:neon-glow transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold mb-1">
                      Case Analysis Report #{index + 1}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(prediction._creationTime).toLocaleDateString()}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Confidence: {Math.round(prediction.confidenceScore * 100)}% •{" "}
                      {prediction.biasFlags.length} bias flags
                    </p>
                  </div>
                </div>
                <Button onClick={handleDownload} className="neon-glow">
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {(!predictions || predictions.length === 0) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">No reports available yet</p>
          <p className="text-sm text-muted-foreground mt-2">
            Complete case predictions to generate reports
          </p>
        </motion.div>
      )}
    </div>
  );
}
