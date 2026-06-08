"use client";

import { useEffect, useCallback } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/api";
import { Node as APINode } from "./ChatArea";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  Node as FlowNode,
  Edge as FlowEdge,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { CustomThreadNode } from "./CustomThreadNode";
import { WorkspaceHeadNode } from "./WorkspaceHeadNode";
import { Loader2, Wand2 } from "lucide-react";
import { Button } from "./ui/button";
import dagre from "dagre";

const nodeTypes = {
  threadNode: CustomThreadNode,
  headNode: WorkspaceHeadNode,
};

// Extended API node to include positions
interface WorkspaceNode extends APINode {
  position_x: number;
  position_y: number;
}

interface Workspace {
  id: string;
  name: string;
  created_at: string;
  user_id: string;
}

import { useSWRConfig } from "swr";
import { useTheme } from "next-themes";

export function WorkbenchView({ workspaceId }: { workspaceId: string }) {
  const { resolvedTheme } = useTheme();
  const { mutate } = useSWRConfig();
  const { data: workspace } = useSWR<Workspace>(`/workspaces/${workspaceId}`, fetcher);
  const { data: rawNodes, error } = useSWR<WorkspaceNode[]>(`/nodes/workspace/${workspaceId}/all`, fetcher);
  
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>([]);

  // Synchronize backend data into React Flow state
  useEffect(() => {
    if (!rawNodes || !workspace) return;

    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    // rankdir = TB (Top to Bottom), ranksep = vertical gap, nodesep = horizontal gap
    dagreGraph.setGraph({ rankdir: 'TB', ranksep: 80, nodesep: 150 });

    // Add Workspace Head Node to dagre
    const headNodeId = "workspace-head";
    dagreGraph.setNode(headNodeId, { width: 320, height: 100 });

    // Add all nodes to dagre
    rawNodes.forEach(n => {
      dagreGraph.setNode(n.id, { width: 300, height: 160 }); // Approx width/height of our custom node
    });

    // Add all edges to dagre for layout calculation
    const flowEdges: FlowEdge[] = [];

    rawNodes.forEach((n) => {
      if (n.parent_id) {
        // Child node -> Link to its parent
        dagreGraph.setEdge(n.parent_id, n.id);
        flowEdges.push({
          id: `e-${n.parent_id}-${n.id}`,
          source: n.parent_id,
          target: n.id,
          type: "default",
          animated: true,
          style: { stroke: "#027eb5", strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#027eb5" },
        });
      } else {
        // Root node -> Link to Workspace Head Node
        dagreGraph.setEdge(headNodeId, n.id);
        flowEdges.push({
          id: `e-head-${n.id}`,
          source: headNodeId,
          target: n.id,
          type: "default",
          animated: false,
          style: { stroke: "#8696a0", strokeWidth: 2, strokeDasharray: "5,5" },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#8696a0" },
        });
      }
    });

    // Execute the layout calculation
    dagre.layout(dagreGraph);

    // Now extract positions and create React Flow nodes
    const headPos = dagreGraph.node(headNodeId);
    const headNode: FlowNode = {
      id: headNodeId,
      type: "headNode",
      // We subtract half width/height because dagre returns the center point!
      position: { x: headPos.x - 160, y: headPos.y - 50 },
      draggable: false, // Fixed root
      data: { name: workspace.name },
    };

    const flowNodes: FlowNode[] = [headNode, ...rawNodes.map((n) => {
      const isUnpositioned = n.position_x === 0 && n.position_y === 0;
      let x = n.position_x;
      let y = n.position_y;

      if (isUnpositioned) {
        const dPos = dagreGraph.node(n.id);
        x = dPos.x - 150; // Center adjust for width: 300
        y = dPos.y - 80;  // Center adjust for height: 160
      }

      return {
        id: n.id,
        type: "threadNode",
        position: { x, y },
        data: { id: n.id, content: n.content },
      };
    })];

    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [rawNodes, workspace, setNodes, setEdges]);

  const onNodeDragStop = useCallback(
    async (event: any, node: FlowNode) => {
      if (node.id === "workspace-head") return;
      try {
        await fetcher(`/nodes/${node.id}/position`, {
          method: "PATCH",
          body: JSON.stringify({
            position_x: node.position.x,
            position_y: node.position.y,
          }),
        });
      } catch (err) {
        console.error("Failed to save position", err);
      }
    },
    []
  );

  const handleAutoArrange = useCallback(async () => {
    if (!rawNodes || nodes.length === 0) return;
    
    // We already have the dagre positions calculated internally during useEffect,
    // but the easiest way is just to force all positions to 0 in the DB, then trigger a re-render.
    // Or simpler: run dagre again and PATCH all nodes.
    try {
      const dagreGraph = new dagre.graphlib.Graph();
      dagreGraph.setDefaultEdgeLabel(() => ({}));
      dagreGraph.setGraph({ rankdir: 'TB', ranksep: 80, nodesep: 150 });

      const headNodeId = "workspace-head";
      dagreGraph.setNode(headNodeId, { width: 320, height: 100 });
      rawNodes.forEach(n => dagreGraph.setNode(n.id, { width: 300, height: 160 }));

      rawNodes.forEach((n) => {
        if (n.parent_id) dagreGraph.setEdge(n.parent_id, n.id);
        else dagreGraph.setEdge(headNodeId, n.id);
      });

      dagre.layout(dagreGraph);

      const updates = rawNodes.map(n => {
        const dPos = dagreGraph.node(n.id);
        const x = dPos.x - 150;
        const y = dPos.y - 80;
        return fetcher(`/nodes/${n.id}/position`, {
          method: "PATCH",
          body: JSON.stringify({ position_x: x, position_y: y }),
        });
      });

      await Promise.all(updates);
      mutate(`/nodes/workspace/${workspaceId}/all`);
    } catch (err) {
      console.error("Failed to auto arrange", err);
    }
  }, [rawNodes, nodes, mutate, workspaceId]);

  if (error) {
    return <div className="flex-1 flex items-center justify-center text-red-500">Failed to load Workbench.</div>;
  }

  if (!rawNodes) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 w-full h-full relative bg-muted/10">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        colorMode={resolvedTheme === "dark" ? "dark" : "light"}
        fitView
        attributionPosition="bottom-right"
      >
        <Panel position="top-right" className="m-4">
          <Button onClick={handleAutoArrange} variant="secondary" className="shadow-md bg-background border border-border">
            <Wand2 className="w-4 h-4 mr-2" />
            Auto Arrange
          </Button>
        </Panel>
        <Background variant={"dots" as any} gap={24} size={1} />
        <Controls />
        <MiniMap 
          zoomable 
          pannable 
          nodeColor={(n) => n.type === 'headNode' ? '#8696a0' : '#027eb5'}
          maskColor="rgba(0, 0, 0, 0.5)"
          className="bg-card border border-border rounded-lg shadow-sm"
        />
      </ReactFlow>
    </div>
  );
}
