import React, { useCallback, useRef, useState } from "react";
import ForceGraph3D from "react-force-graph-3d";
import * as THREE from "three";

type GraphNode = {
  id: string;
  label?: string;
  size?: number;
  color?: string;
  group?: string;
  biasScore?: number;
};

type GraphLink = {
  source: string;
  target: string;
  value?: number;
};

type GraphData = {
  nodes: GraphNode[];
  links: GraphLink[];
};

const sampleData: GraphData = {
  nodes: [
    { id: "Case A", label: "Case A", size: 8, color: "#60A5FA", group: "Supreme Court", biasScore: 0.2 },
    { id: "Case B", label: "Case B", size: 6, color: "#34D399", group: "High Court", biasScore: 0.5 },
    { id: "Case C", label: "Case C", size: 5, color: "#F472B6", group: "District Court", biasScore: 0.7 },
    { id: "Precedent X", label: "Precedent X", size: 7, color: "#F59E0B", group: "Supreme Court", biasScore: 0.3 },
    { id: "Law Y", label: "Law Y", size: 4, color: "#A78BFA", group: "Statute", biasScore: 0.1 },
  ],
  links: [
    { source: "Case A", target: "Case B", value: 2 },
    { source: "Case B", target: "Case C", value: 1 },
    { source: "Case A", target: "Case C", value: 3 },
    { source: "Case A", target: "Precedent X", value: 2 },
    { source: "Case B", target: "Precedent X", value: 1 },
    { source: "Case C", target: "Law Y", value: 1 },
  ],
};

const KnowledgeGraph: React.FC = () => {
  const [graphData] = useState<GraphData>(sampleData);
  const fgRef = useRef<any>(null);

  const handleNodeClick = useCallback((node: any) => {
    if (!fgRef.current || !node) return;
    const distance = 140;
    const distRatio =
      1 + distance / Math.hypot((node.x || 1), (node.y || 1), (node.z || 1));
    fgRef.current.cameraPosition(
      { x: (node.x || 0) * distRatio, y: (node.y || 0) * distRatio, z: (node.z || 0) * distRatio },
      { x: node.x || 0, y: node.y || 0, z: node.z || 0 },
      2000
    );
  }, []);

  return (
    <div className="w-full h-[100vh] relative bg-transparent">
      <ForceGraph3D
        ref={fgRef}
        graphData={graphData}
        nodeLabel="label"
        nodeVal={(n: any) => n.size || 4}
        nodeColor={(n: any) => n.color || "#9CA3AF"}
        backgroundColor="rgba(0,0,0,0)"
        showNavInfo={false}
        linkWidth={(l: any) => (l.value || 1) * 0.6}
        linkOpacity={0.35}
        linkColor={() => "rgba(192,192,192,0.28)"}
        linkDirectionalParticles={3}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleSpeed={0.006}
        onNodeClick={handleNodeClick}
        onNodeHover={(node: any) => {
          document.body.style.cursor = node ? "pointer" : "default";
        }}
        nodeThreeObject={(node: any) => {
          // Glowing sprite nodes
          const size = (node.size || 4) * 3;
          const canvas = document.createElement("canvas");
          canvas.width = 256;
          canvas.height = 256;
          const ctx = canvas.getContext("2d")!;
          const color = node.color || "#FFD700";

          // Outer glow
          const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
          gradient.addColorStop(0, color);
          gradient.addColorStop(0.48, color);
          gradient.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, 256, 256);

          // Bright core
          const core = ctx.createRadialGradient(128, 128, 0, 128, 128, 42);
          core.addColorStop(0, "#FFFFFF");
          core.addColorStop(1, color);
          ctx.fillStyle = core;
          ctx.beginPath();
          ctx.arc(128, 128, 40, 0, Math.PI * 2);
          ctx.fill();

          const texture = new THREE.CanvasTexture(canvas);
          const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            opacity: 0.95,
            depthWrite: false,
          });
          const sprite = new THREE.Sprite(material);
          sprite.scale.set(size, size, 1);
          return sprite;
        }}
      />
    </div>
  );
};

export default KnowledgeGraph;