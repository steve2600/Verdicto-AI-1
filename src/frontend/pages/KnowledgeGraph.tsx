import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Search,
  Layers,
  AlertTriangle,
  Scale,
  Sparkles,
  X,
  Loader2,
} from "lucide-react";
import ForceGraph3D from "react-force-graph-3d";

export default function KnowledgeGraph() {
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showBiasHeatmap, setShowBiasHeatmap] = useState(false);
  const [showCitations, setShowCitations] = useState(true);
  const [showCourtLevel, setShowCourtLevel] = useState(true);
  const [graphData, setGraphData] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const userGraphs = useQuery(api.knowledgeGraph.getUserGraphs);
  const latestPrediction = useQuery(api.knowledgeGraph.getLatestPredictionForUser);
  const generateGraph = useAction(api.knowledgeGraph.generateKnowledgeGraph);

  // Load the most recent graph or generate one
  useEffect(() => {
    if (userGraphs && userGraphs.length > 0) {
      const latestGraph = userGraphs[0];
      setGraphData({
        nodes: latestGraph.nodes,
        links: latestGraph.edges,
      });
    } else if (latestPrediction && !isGenerating) {
      handleGenerateGraph();
    }
  }, [userGraphs, latestPrediction]);

  const handleGenerateGraph = async () => {
    if (!latestPrediction && !graphData) {
      // Proceed anyway; backend will generate sample/demo graph
    }

    setIsGenerating(true);
    try {
      const args: any = {};
      if (latestPrediction) {
        args.queryId = latestPrediction.queryId;
        args.predictionId = latestPrediction._id;
        // Pass lightweight prediction data to avoid server-side self-referencing
        args.predictionData = latestPrediction;
      }
      const result = await generateGraph(args);

      if (result.success) {
        setGraphData({
          nodes: result.nodes,
          links: result.edges,
        });
        toast.success("Knowledge graph generated!");
      }
    } catch (error) {
      console.error("Graph generation error:", error);
      toast.error("Failed to generate knowledge graph");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNodeClick = useCallback((node: any) => {
    setSelectedNode(node);
  }, []);

  const handleSearch = useCallback(() => {
    if (!graphData || !searchQuery.trim()) return;

    const foundNode = graphData.nodes.find((n: any) =>
      n.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (foundNode) {
      setSelectedNode(foundNode);
      toast.success(`Found: ${foundNode.label}`);
    } else {
      toast.error("Case not found in graph");
    }
  }, [graphData, searchQuery]);

  // Apply filters to node colors
  const filteredGraphData = useMemo(() => {
    if (!graphData) return undefined; // Return undefined (not null) to satisfy ForceGraph types

    const nodes = graphData.nodes.map((node: any) => {
      let color = node.color;

      if (showBiasHeatmap && node.biasScore !== undefined) {
        // Bias heatmap: green (low bias) to red (high bias)
        const bias = node.biasScore;
        if (bias < 0.3) color = "#10B981"; // Green
        else if (bias < 0.6) color = "#F59E0B"; // Yellow
        else color = "#EF4444"; // Red
      } else if (showCourtLevel) {
        // Court level coloring (default)
        color = node.color;
      }

      return { ...node, color };
    });

    return { nodes, links: graphData.links } as any;
  }, [graphData, showBiasHeatmap, showCourtLevel]);

  if (isGenerating) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <h3 className="text-xl font-bold mb-2">Generating Knowledge Graph</h3>
          <p className="text-muted-foreground">
            Analyzing case relationships and precedents...
          </p>
        </div>
      </div>
    );
  }

  if (!graphData) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="macos-card p-8 text-center max-w-md">
          <Sparkles className="h-16 w-16 mx-auto mb-4 text-primary" />
          <h3 className="text-2xl font-bold mb-2">No Graph Available</h3>
          <p className="text-muted-foreground mb-6">
            Analyze a case first to generate a knowledge graph visualization.
          </p>
          <Button onClick={handleGenerateGraph} disabled={isGenerating}>
            Generate Graph
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-background">
      {/* Top Control Bar */}
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute top-0 left-0 right-0 z-10 p-4"
      >
        <Card className="macos-card p-4">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Search */}
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Input
                placeholder="Search cases..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                className="macos-vibrancy"
              />
              <Button onClick={handleSearch} size="icon" variant="outline">
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {/* Filter Toggles */}
            <div className="flex items-center gap-2">
              <Button
                variant={showBiasHeatmap ? "default" : "outline"}
                size="sm"
                onClick={() => setShowBiasHeatmap(!showBiasHeatmap)}
                className="gap-2"
              >
                <AlertTriangle className="h-4 w-4" />
                Bias Heatmap
              </Button>
              <Button
                variant={showCitations ? "default" : "outline"}
                size="sm"
                onClick={() => setShowCitations(!showCitations)}
                className="gap-2"
              >
                <Layers className="h-4 w-4" />
                Citations
              </Button>
              <Button
                variant={showCourtLevel ? "default" : "outline"}
                size="sm"
                onClick={() => setShowCourtLevel(!showCourtLevel)}
                className="gap-2"
              >
                <Scale className="h-4 w-4" />
                Court Level
              </Button>
            </div>

            <Button onClick={handleGenerateGraph} size="sm" variant="outline">
              Refresh
            </Button>
          </div>
        </Card>
      </motion.div>

      {/* 3D Graph Visualization */}
      <div className="absolute inset-0">
        <ForceGraph3D
          graphData={filteredGraphData}
          nodeLabel="label"
          nodeAutoColorBy="group"
          nodeVal={(node: any) => node.size}
          nodeColor={(node: any) => node.color}
          linkWidth={(link: any) => link.value * 0.5}
          linkOpacity={0.6}
          linkColor={() => "rgba(192, 192, 192, 0.4)"}
          onNodeClick={handleNodeClick}
          backgroundColor="rgba(0, 0, 0, 0)"
          showNavInfo={false}
        />
      </div>

      {/* Side Panel for Selected Node */}
      {selectedNode && (
        <motion.div
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          className="absolute top-0 right-0 bottom-0 w-96 z-20"
        >
          <Card className="macos-card h-full flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-bold">Case Details</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedNode(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">{selectedNode.label}</h4>
                  <Badge variant="secondary">{selectedNode.courtLevel}</Badge>
                </div>

                <Separator />

                {selectedNode.relevance !== undefined && (
                  <div>
                    <span className="text-sm text-muted-foreground">
                      Relevance Score
                    </span>
                    <p className="text-2xl font-bold text-primary">
                      {Math.round(selectedNode.relevance * 100)}%
                    </p>
                  </div>
                )}

                {selectedNode.biasScore !== undefined && (
                  <div>
                    <span className="text-sm text-muted-foreground">
                      Bias Score
                    </span>
                    <p className="text-2xl font-bold">
                      {Math.round(selectedNode.biasScore * 100)}%
                    </p>
                  </div>
                )}

                <Separator />

                {selectedNode.summary && (
                  <div>
                    <h5 className="font-medium mb-2">Summary</h5>
                    <p className="text-sm text-muted-foreground">
                      {selectedNode.summary}
                    </p>
                  </div>
                )}

                {selectedNode.citation && (
                  <div>
                    <h5 className="font-medium mb-2">Citation</h5>
                    <p className="text-sm text-muted-foreground">
                      {selectedNode.citation}
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>
        </motion.div>
      )}

      {/* Legend */}
      <motion.div
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="absolute bottom-4 left-4 z-10"
      >
        <Card className="macos-card p-4">
          <h4 className="font-medium mb-3 text-sm">Legend</h4>
          <div className="space-y-2 text-xs">
            {showCourtLevel && !showBiasHeatmap && (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#FFD700]" />
                  <span>Supreme Court / High Relevance</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#3B82F6]" />
                  <span>High Court</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#C0C0C0]" />
                  <span>District Court</span>
                </div>
              </>
            )}
            {showBiasHeatmap && (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#10B981]" />
                  <span>Low Bias (Fair)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#F59E0B]" />
                  <span>Moderate Bias</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#EF4444]" />
                  <span>High Bias</span>
                </div>
              </>
            )}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}