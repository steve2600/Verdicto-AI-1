import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, Shield } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function BiasInsights() {
  const predictions = useQuery(api.predictions.listByUser);

  const averageBiasScore =
    predictions && predictions.length > 0
      ? predictions.reduce((acc, p) => {
          const avgBias =
            p.biasFlags.reduce((sum, flag) => {
              const severityScore =
                flag.severity === "high" ? 0.3 : flag.severity === "medium" ? 0.6 : 0.9;
              return sum + severityScore;
            }, 0) / (p.biasFlags.length || 1);
          return acc + avgBias;
        }, 0) / predictions.length
      : 0.85;

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl md:text-5xl font-light mb-2 text-foreground tracking-tight" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300, letterSpacing: '-0.02em' }}>Bias Insights</h1>
        <p className="text-muted-foreground font-light" style={{ letterSpacing: '0.01em' }}>
          Comprehensive bias analysis across all predictions
        </p>
      </motion.div>

      {/* Overall Score */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <Card className="glass-strong p-8 neon-glow">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center neon-glow">
              <Shield className="h-10 w-10 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium mb-2">Overall Bias Score</h3>
              <div className="flex items-center gap-4">
                <Progress value={averageBiasScore * 100} className="h-4 flex-1" />
                <span className="text-3xl font-bold text-primary">
                  {Math.round(averageBiasScore * 100)}%
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {averageBiasScore > 0.75
                  ? "Excellent - Low bias detected"
                  : averageBiasScore > 0.5
                  ? "Good - Moderate bias levels"
                  : "Needs attention - High bias detected"}
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Recent Predictions with Bias Flags */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold mb-4">Recent Analysis</h2>
        {predictions?.slice(0, 5).map((prediction, index) => (
          <motion.div
            key={prediction._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="glass-strong p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-2">
                    {new Date(prediction._creationTime).toLocaleDateString()}
                  </p>
                  <p className="mb-3">{prediction.prediction.substring(0, 150)}...</p>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-medium">Confidence:</span>
                    <Progress
                      value={prediction.confidenceScore * 100}
                      className="h-2 w-32"
                    />
                    <span className="text-sm">
                      {Math.round(prediction.confidenceScore * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              {prediction.biasFlags.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Bias Flags ({prediction.biasFlags.length})
                  </h4>
                  <div className="grid gap-2">
                    {prediction.biasFlags.map((flag, flagIndex) => (
                      <div key={flagIndex} className="glass p-3 rounded-lg flex items-center gap-3">
                        <Badge
                          variant={
                            flag.severity === "high"
                              ? "destructive"
                              : flag.severity === "medium"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {flag.severity}
                        </Badge>
                        <div className="flex-1">
                          <span className="font-medium text-sm">{flag.type}</span>
                          <p className="text-xs text-muted-foreground mt-1">
                            {flag.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
          <AlertTriangle className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">No bias data available yet</p>
          <p className="text-sm text-muted-foreground mt-2">
            Run case predictions to see bias analysis
          </p>
        </motion.div>
      )}
    </div>
  );
}
