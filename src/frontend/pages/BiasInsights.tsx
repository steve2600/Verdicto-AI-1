import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, TrendingUp, Shield, BarChart3, Loader2 } from "lucide-react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

export default function BiasInsights() {
  const predictions = useQuery(api.predictions.listByUser);
  const [systemicBias, setSystemicBias] = useState<any>(null);
  const [isLoadingSystemic, setIsLoadingSystemic] = useState(false);
  const analyzeSystemicBias = useAction(api.mlBiasAnalysis.analyzeSystemicBias);

  // Load systemic bias on mount
  useEffect(() => {
    const loadSystemicBias = async () => {
      setIsLoadingSystemic(true);
      try {
        const result = await analyzeSystemicBias({ historicalCases: [] });
        if (result.success) {
          setSystemicBias(result.systemicBias);
        }
      } catch (error) {
        console.warn("Systemic bias analysis not available:", error);
      } finally {
        setIsLoadingSystemic(false);
      }
    };
    loadSystemicBias();
  }, [analyzeSystemicBias]);

  // Calculate average for each granular bias category
  const calculateGranularAverages = () => {
    if (!predictions || predictions.length === 0) return null;
    
    const categories = [
      "gender_bias",
      "caste_bias",
      "religious_bias",
      "regional_bias",
      "socioeconomic_bias",
      "judicial_attitude_bias",
      "language_bias"
    ];
    
    const averages: Record<string, number> = {};
    
    categories.forEach(category => {
      const sum = predictions.reduce((acc, p) => {
        const biasFlag = (p.biasFlags || []).find((f: any) => 
          f.type.toLowerCase().replace(/\s+/g, '_') === category
        );
        // Safely access score property with type assertion
        const score = (biasFlag as any)?.score || 0;
        return acc + score;
      }, 0);
      averages[category] = predictions.length > 0 ? sum / predictions.length : 0;
    });
    
    return averages;
  };

  const granularAverages = calculateGranularAverages();
  const overallAverage = granularAverages 
    ? Object.values(granularAverages).reduce((a, b) => a + b, 0) / Object.keys(granularAverages).length
    : 0.85;

  // Mock data for visualization when no predictions exist
  const mockGranularAverages = {
    gender_bias: 0.42,
    caste_bias: 0.28,
    religious_bias: 0.35,
    regional_bias: 0.51,
    socioeconomic_bias: 0.67,
    judicial_attitude_bias: 0.45,
    language_bias: 0.33
  };

  // Use real data if available, otherwise use mock data
  const displayAverages = granularAverages || mockGranularAverages;

  const getBiasColor = (score: number) => {
    if (score > 0.6) return "text-red-500";
    if (score > 0.3) return "text-yellow-500";
    return "text-green-500";
  };

  const getBiasLabel = (category: string) => {
    const labels: Record<string, string> = {
      gender_bias: "Gender Bias",
      caste_bias: "Caste Bias",
      religious_bias: "Religious Bias",
      regional_bias: "Regional Bias",
      socioeconomic_bias: "Socioeconomic Bias",
      judicial_attitude_bias: "Judicial Attitude Bias",
      language_bias: "Language Bias"
    };
    return labels[category] || category;
  };

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

      {/* Bias Components Chart */}
      {displayAverages && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Card className="glass-strong p-8 neon-glow">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Bias Components Analysis</h2>
                <p className="text-sm text-muted-foreground">
                  Detection rates across all 7 bias categories
                </p>
              </div>
            </div>
            
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={Object.entries(displayAverages).map(([category, score]) => ({
                    name: getBiasLabel(category),
                    score: Math.round((score as number) * 100),
                    fill: (score as number) > 0.6 
                      ? "hsl(var(--destructive))" 
                      : (score as number) > 0.3 
                      ? "hsl(var(--warning))" 
                      : "hsl(var(--success))"
                  }))}
                  margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis 
                    label={{ value: 'Detection Rate (%)', angle: -90, position: 'insideLeft' }}
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <ChartTooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="glass-strong p-3 rounded-lg border border-border">
                            <p className="font-medium text-sm mb-1">{data.name}</p>
                            <p className="text-2xl font-bold" style={{ color: data.fill }}>
                              {data.score}%
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {data.score > 60 ? "High" : data.score > 30 ? "Moderate" : "Low"} detection rate
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="score" 
                    radius={[8, 8, 0, 0]}
                    fill="hsl(var(--primary))"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-6 flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: "hsl(var(--success))" }} />
                <span className="text-muted-foreground">Low (&lt;30%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: "hsl(var(--warning))" }} />
                <span className="text-muted-foreground">Moderate (30-60%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: "hsl(var(--destructive))" }} />
                <span className="text-muted-foreground">High (&gt;60%)</span>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Recent Predictions with Bias Flags */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold mb-4">Recent Analysis</h2>
        {predictions?.slice(0, 5).map((prediction: any, index: number) => (
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

              {(prediction.biasFlags || []).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Bias Flags ({(prediction.biasFlags || []).length})
                  </h4>
                  <div className="grid gap-2">
                    {(prediction.biasFlags || []).map((flag: any, flagIndex: number) => (
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
                          {flag.score && (
                            <span className="text-xs text-muted-foreground ml-2">
                              ({Math.round(flag.score * 100)}%)
                            </span>
                          )}
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

      {/* Systemic Bias Analysis */}
      {isLoadingSystemic && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-8"
        >
          <Card className="glass-strong p-8">
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-muted-foreground">Analyzing systemic bias patterns...</p>
            </div>
          </Card>
        </motion.div>
      )}

      {systemicBias && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8"
        >
          <Card className="glass-strong p-6 neon-glow">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Systemic Bias Analysis</h2>
                <p className="text-sm text-muted-foreground">
                  Historical pattern analysis across all cases
                </p>
              </div>
            </div>
            
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="glass p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Total Cases Analyzed</p>
                <p className="text-3xl font-bold">
                  {systemicBias.biasDashboardData?.summary_metrics?.total_cases_analyzed || 0}
                </p>
              </div>
              <div className="glass p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Overall Conviction Rate</p>
                <p className="text-3xl font-bold">
                  {Math.round((systemicBias.biasDashboardData?.summary_metrics?.overall_conviction_rate || 0) * 100)}%
                </p>
              </div>
              <div className="glass p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Bias Flags Detected</p>
                <p className="text-3xl font-bold text-yellow-500">
                  {systemicBias.systemic_bias_flags?.length || 0}
                </p>
              </div>
            </div>

            {systemicBias.systemic_bias_flags && systemicBias.systemic_bias_flags.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium">Detected Disparities</h3>
                {systemicBias.systemic_bias_flags.map((flag: string, index: number) => (
                  <div key={index} className="glass p-3 rounded-lg flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    <span className="capitalize">{flag.replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>
            )}

            {systemicBias.biasDashboardData?.gender_analysis && (
              <div className="mt-6">
                <h3 className="font-medium mb-3">Gender Analysis</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {Object.entries(systemicBias.biasDashboardData.gender_analysis.disparity_data || {}).map(([gender, data]: [string, any]) => (
                    <div key={gender} className="glass p-4 rounded-lg">
                      <p className="text-sm font-medium capitalize mb-2">{gender}</p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Cases</span>
                          <span className="font-medium">{data.total_cases}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Conviction Rate</span>
                          <span className="font-medium">{Math.round(data.conviction_rate * 100)}%</span>
                        </div>
                        <Progress value={data.conviction_rate * 100} className="h-2" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {systemicBias.biasDashboardData?.regional_analysis && (
              <div className="mt-6">
                <h3 className="font-medium mb-3">Regional Analysis</h3>
                <div className="grid md:grid-cols-3 gap-3">
                  {Object.entries(systemicBias.biasDashboardData.regional_analysis.disparity_data || {}).map(([region, data]: [string, any]) => (
                    <div key={region} className="glass p-3 rounded-lg">
                      <p className="text-sm font-medium mb-1">{region}</p>
                      <p className="text-xs text-muted-foreground">
                        {data.total_cases} cases · {Math.round(data.conviction_rate * 100)}% conviction
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </motion.div>
      )}
    </div>
  );
}