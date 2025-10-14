import { useState, useEffect, useMemo } from "react";
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
    gender_bias: 0.23,
    caste_bias: 0.67,
    religious_bias: 0.41,
    regional_bias: 0.55,
    socioeconomic_bias: 0.78,
    judicial_attitude_bias: 0.34,
    language_bias: 0.49
  };

  // Memoize displayAverages to prevent unnecessary re-renders
  const displayAverages = useMemo(() => {
    if (granularAverages && Object.keys(granularAverages).length > 0) {
      return granularAverages;
    }
    return mockGranularAverages;
  }, [granularAverages]);

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

  // Memoize chart data to keep the graph stable on re-renders
  const chartData = useMemo(() => {
    return Object.entries(displayAverages).map(([category, score]) => ({
      name: getBiasLabel(category),
      score: Math.round((score as number) * 100),
      fill:
        (score as number) > 0.6
          ? "hsl(var(--destructive))"
          : (score as number) > 0.3
          ? "hsl(var(--warning))"
          : "hsl(var(--success))",
    }));
  }, [displayAverages]);

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl md:text-5xl font-light mb-2 text-foreground tracking-tight" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300, letterSpacing: '-0.02em' }}>Bias Insights</h1>
        <p className="text-muted-foreground font-light" style={{ letterSpacing: '0.01em' }}>
          Comprehensive bias detection and analysis
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <Card className="macos-card p-6 neon-glow">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center neon-glow">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">Bias Components Analysis</h3>
              <p className="text-sm text-muted-foreground">Detection rates across 7 bias categories</p>
            </div>
          </div>

          <div className="w-full h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={100}
                  tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                />
                <YAxis 
                  label={{ value: 'Detection Rate (%)', angle: -90, position: 'insideLeft', fill: 'hsl(var(--foreground))' }}
                  tick={{ fill: 'hsl(var(--foreground))' }}
                />
                <ChartTooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                          <p className="font-medium text-foreground">{data.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Detection Rate: <span className="font-bold">{data.score}%</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Severity: {data.score > 60 ? "High" : data.score > 30 ? "Moderate" : "Low"}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="score" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-6 flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-muted-foreground">Low (0-30%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span className="text-muted-foreground">Moderate (31-60%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-muted-foreground">High (61-100%)</span>
            </div>
          </div>
        </Card>
      </motion.div>

      {predictions && predictions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <h2 className="text-2xl font-bold mb-4 text-foreground">Recent Analysis</h2>
          <div className="grid gap-4">
            {predictions.slice(0, 5).map((prediction: any) => (
              <Card key={prediction._id} className="macos-card p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {prediction.prediction}
                    </p>
                  </div>
                  <Badge variant="secondary" className="ml-3">
                    {Math.round(prediction.confidenceScore * 100)}%
                  </Badge>
                </div>
                {(prediction.biasFlags || []).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {(prediction.biasFlags || []).map((flag: any, idx: number) => (
                      <Badge
                        key={idx}
                        variant={
                          flag.severity === "high"
                            ? "destructive"
                            : flag.severity === "medium"
                            ? "default"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {flag.type}
                      </Badge>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </motion.div>
      )}

      {systemicBias && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-2xl font-bold mb-4 text-foreground">Systemic Bias Patterns</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {systemicBias.gender_analysis && (
              <Card className="macos-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="h-5 w-5 text-primary" />
                  <h3 className="font-bold text-foreground">Gender Analysis</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-muted-foreground">Male Conviction Rate</span>
                      <span className="text-sm font-medium text-foreground">
                        {Math.round(systemicBias.gender_analysis.male_conviction_rate * 100)}%
                      </span>
                    </div>
                    <Progress value={systemicBias.gender_analysis.male_conviction_rate * 100} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-muted-foreground">Female Conviction Rate</span>
                      <span className="text-sm font-medium text-foreground">
                        {Math.round(systemicBias.gender_analysis.female_conviction_rate * 100)}%
                      </span>
                    </div>
                    <Progress value={systemicBias.gender_analysis.female_conviction_rate * 100} />
                  </div>
                </div>
              </Card>
            )}

            {systemicBias.regional_analysis && (
              <Card className="macos-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <h3 className="font-bold text-foreground">Regional Disparities</h3>
                </div>
                <div className="space-y-2">
                  {Object.entries(systemicBias.regional_analysis).map(([region, rate]: [string, any]) => (
                    <div key={region}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-muted-foreground capitalize">{region}</span>
                        <span className="text-sm font-medium text-foreground">
                          {Math.round(rate * 100)}%
                        </span>
                      </div>
                      <Progress value={rate * 100} className="h-2" />
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}