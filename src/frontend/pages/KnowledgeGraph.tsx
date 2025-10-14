import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ForceGraph3D from "react-force-graph-3d";
import * as THREE from "three";

export default function KnowledgeGraph() {
  const graphRef = useRef<any>(null);

  // Simple demo data; replace with backend data when available
  const [graphData] = useState<{ nodes: any[]; links: any[] }>({
    nodes: [
      { id: "current_case", label: "Current Case", group: "center", size: 4, color: "#FFD700", courtLevel: "Query", biasScore: 0.2, summary: "Analyze a case to populate this graph.", citation: "Current Analysis" },
      { id: "case_a", label: "Precedent A (2020)", group: "precedent", size: 3, color: "#FFD700", courtLevel: "Supreme Court", biasScore: 0.18, relevance: 0.92, summary: "High-relevance Supreme Court precedent.", citation: "A vs B (2020) SCC 123" },
      { id: "case_b", label: "Precedent B (2018)", group: "precedent", size: 2.6, color: "#3B82F6", courtLevel: "High Court", biasScore: 0.22, relevance: 0.84, summary: "Relevant High Court case.", citation: "C vs D (2018) HC 45" },
      { id: "case_c", label: "Related Case C (2019)", group: "precedent", size: 2.2, color: "#C0C0C0", courtLevel: "District Court", biasScore: 0.28, relevance: 0.68, summary: "Related District Court matter.", citation: "E vs F (2019) DC 78" },
    ],
    links: [
      { source: "current_case", target: "case_a", value: 5, type: "citation" },
      { source: "current_case", target: "case_b", value: 4, type: "citation" },
      { source: "current_case", target: "case_c", value: 3, type: "citation" },
      { source: "case_a", target: "case_b", value: 2, type: "related" },
    ],
  });

  const handleNodeClick = (node: any) => {
    if (!graphRef.current) return;
    const distance = 200;
    graphRef.current.cameraPosition(
      { x: node.x, y: node.y, z: node.z + distance },
      node,
      1000
    );
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="p-6 border-b border-border bg-card/50 backdrop-blur-xl">
        <h1 className="text-3xl font-light tracking-tight text-foreground">Legal Knowledge Graph</h1>
        <p className="text-sm text-muted-foreground mt-1">3D visualization of case relationships and precedents</p>
      </div>

      <div className="flex-1 relative">
        <div className="absolute inset-0">
          <ForceGraph3D
            ref={graphRef}
            graphData={graphData}
            nodeLabel="label"
            nodeAutoColorBy="group"
            nodeVal={(node: any) => node.size || 2}
            nodeColor={(node: any) => node.color || "#999999"}
            nodeRelSize={8}
            nodeOpacity={0.95}
            nodeResolution={32}
            linkWidth={(link: any) => (link.value ? link.value * 0.8 : 1)}
            linkOpacity={0.35}
            linkColor={() => "rgba(192, 192, 192, 0.35)"}
            linkDirectionalParticles={4}
            linkDirectionalParticleWidth={1.8}
            linkDirectionalParticleSpeed={0.006}
            linkDirectionalParticleColor={() => "rgba(255, 215, 0, 0.85)"}
            onNodeClick={handleNodeClick}
            onNodeHover={(node: any) => {
              document.body.style.cursor = node ? "pointer" : "default";
            }}
            backgroundColor="rgba(0, 0, 0, 0)"
            showNavInfo={false}
            nodeThreeObject={(node: any) => {
              // Glowing sprite nodes
              const canvas = document.createElement("canvas");
              canvas.width = 256;
              canvas.height = 256;
              const ctx = canvas.getContext("2d")!;

              const color = node.color || "#FFD700";

              // Outer glow
              const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
              gradient.addColorStop(0, color);
              gradient.addColorStop(0.5, color);
              gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
              ctx.fillStyle = gradient;
              ctx.fillRect(0, 0, 256, 256);

              // Bright core
              const coreGradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 40);
              coreGradient.addColorStop(0, "#FFFFFF");
              coreGradient.addColorStop(1, color);
              ctx.fillStyle = coreGradient;
              ctx.beginPath();
              ctx.arc(128, 128, 40, 0, 2 * Math.PI);
              ctx.fill();

              const texture = new THREE.CanvasTexture(canvas);
              const material = new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                opacity: 0.9,
                depthWrite: false,
              });
              const sprite = new THREE.Sprite(material);
              const s = node.size ? node.size * 3 : 12;
              sprite.scale.set(s, s, 1);
              return sprite;
            }}
            linkThreeObjectExtend
            linkThreeObject={() => {
              // Subtle glow at link midpoints
              const material = new THREE.MeshBasicMaterial({
                color: 0xc0c0c0,
                transparent: true,
                opacity: 0.3,
              });
              const geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
              return new THREE.Mesh(geometry, material);
            }}
            linkPositionUpdate={(mesh: any, { start, end }: any) => {
              const x = (start.x + end.x) / 2;
              const y = (start.y + end.y) / 2;
              const z = (start.z + end.z) / 2;
              mesh.position.set(x, y, z);
            }}
          />
        </div>
      </div>

      <div className="p-4 border-t border-border bg-card/50 backdrop-blur-xl">
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#FFD700]" />
            <span className="text-muted-foreground">Supreme Court / High Relevance</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#3B82F6]" />
            <span className="text-muted-foreground">High Court</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#C0C0C0]" />
            <span className="text-muted-foreground">District Court / Lower Relevance</span>
          </div>
        </div>
      </div>
    </div>
  );
}