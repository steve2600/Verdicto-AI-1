import ForceGraph3D from "react-force-graph-3d";
import * as THREE from "three";

// ... rest of imports and component setup

// ... keep existing code (useMemo for filteredGraphData)
    // Fix incorrect type suffix that was split across lines
    return { nodes, links: graphData.links } as any;
// ... keep existing code

// ... keep existing code above the 3D visualization
      {/* 3D Graph Visualization */}
      <div className="absolute inset-0">
        <ForceGraph3D
          graphData={filteredGraphData}
          nodeLabel="label"
          nodeAutoColorBy="group"
          nodeVal={(node: any) => node.size}
          nodeColor={(node: any) => node.color}
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
            // Subtle glowing tube object at link midpoint
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
// ... keep existing code

// Fix broken JSX comment marker
      {/* Side Panel for Selected Node */}
// ... keep existing code (side panel)